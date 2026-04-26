package com.travelassistant.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.travelassistant.controller.dto.RecommendationDto;
import com.travelassistant.controller.dto.RecommendationResponseDto;
import com.travelassistant.model.UserInterest;
import com.travelassistant.model.UserProfile;
import com.travelassistant.model.WeatherKind;
import com.travelassistant.repository.UserInterestRepository;
import com.travelassistant.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final UserProfileRepository userProfileRepository;
    private final UserInterestRepository userInterestRepository;
    private final WeatherService weatherService;
    private final ObjectMapper objectMapper;

    private enum CostLevel { LOW, MID, HIGH }

    private static final List<String> OVERPASS_URLS = List.of(
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.nchc.org.tw/api/interpreter"
    );

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public RecommendationResponseDto getRecommendationsForUser(UUID userId, Double lat, Double lng) {
        if (lat == null || lng == null) {
            throw new RuntimeException("Latitude/longitude required");
        }

        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        int radiusM = profile.getWalkingRadiusM() != null && profile.getWalkingRadiusM() > 0
                ? profile.getWalkingRadiusM()
                : 1000;

        List<UserInterest> userInterests = userInterestRepository.findByUserIdWithInterest(userId);
        List<TagRule> rules = buildRulesFromUserInterests(userInterests);

        if (rules.isEmpty()) {
            return RecommendationResponseDto.builder()
                    .weatherKind(WeatherKind.CLEAR.name())
                    .weatherMessage("No user interests configured")
                    .recommendations(List.of())
                    .build();
        }

        WeatherKind weatherKind = weatherService.getCurrentWeatherKind(lat, lng);

        List<TagRule> weatherFilteredRules = rules.stream()
                .filter(rule -> isRuleAllowedForWeather(rule, weatherKind))
                .toList();

        if (weatherFilteredRules.isEmpty()) {
            weatherFilteredRules = rules;
        }

        String query = buildOverpassQuery(lat, lng, radiusM, weatherFilteredRules);
        OverpassResponse resp = callOverpass(query);

        List<TagRule> finalWeatherFilteredRules = weatherFilteredRules;
        List<RecommendationDto> out = resp.elements.stream()
                .map(el -> toRecommendation(el, finalWeatherFilteredRules))
                .filter(Objects::nonNull)
                .filter(place -> isPlaceAllowedForWeather(place, weatherKind))
                .collect(Collectors.toList());

        Map<String, RecommendationDto> uniq = new LinkedHashMap<>();
        for (RecommendationDto r : out) {
            String key = (r.getName() + "|" + r.getLatitude() + "|" + r.getLongitude()).toLowerCase();
            uniq.putIfAbsent(key, r);
        }

        List<RecommendationDto> result = uniq.values().stream()
                .sorted(Comparator
                        .comparing(RecommendationDto::getScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(RecommendationDto::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .limit(60)
                .toList();

        return RecommendationResponseDto.builder()
                .weatherKind(weatherKind.name())
                .weatherMessage(weatherService.buildWeatherMessage(weatherKind))
                .recommendations(result)
                .build();
    }

    private List<TagRule> buildRulesFromUserInterests(List<UserInterest> userInterests) {
        List<TagRule> rules = new ArrayList<>();

        for (UserInterest ui : userInterests) {
            int weight = ui.getWeight() != null ? ui.getWeight() : 1;
            String name = ui.getInterest().getName() != null ? ui.getInterest().getName().toLowerCase() : "";
            String category = ui.getInterest().getCategory() != null ? ui.getInterest().getCategory().toLowerCase() : "";

            if (name.contains("restaurant")) rules.add(new TagRule("amenity", "restaurant", "restaurant", weight));
            if (name.contains("cafe")) rules.add(new TagRule("amenity", "cafe", "cafe", weight));
            if (name.contains("museum")) rules.add(new TagRule("tourism", "museum", "museum", weight));
            if (name.contains("art") && name.contains("galler")) rules.add(new TagRule("tourism", "gallery", "gallery", weight));
            if (name.contains("park")) rules.add(new TagRule("leisure", "park", "park", weight));
            if (name.contains("hiking")) rules.add(new TagRule("tourism", "viewpoint", "hiking", weight));
            if (name.contains("histor")) rules.add(new TagRule("historic", "*", "historical", weight));
            if (name.contains("landmark")) rules.add(new TagRule("tourism", "attraction", "landmark", weight));

            if (rules.isEmpty() || rules.stream().noneMatch(r -> r.weight == weight)) {
                if (category.contains("culture")) {
                    rules.add(new TagRule("tourism", "museum", "culture", Math.max(1, weight - 1)));
                    rules.add(new TagRule("tourism", "gallery", "culture", Math.max(1, weight - 1)));
                    rules.add(new TagRule("tourism", "attraction", "culture", Math.max(1, weight - 2)));
                }
                if (category.contains("nature")) {
                    rules.add(new TagRule("leisure", "park", "nature", Math.max(1, weight - 1)));
                    rules.add(new TagRule("tourism", "viewpoint", "nature", Math.max(1, weight - 2)));
                }
            }
        }

        Map<String, TagRule> uniq = new HashMap<>();
        for (TagRule r : rules) {
            String k = r.key + "=" + r.value + "|" + r.label;
            uniq.merge(k, r, (a, b) -> a.weight >= b.weight ? a : b);
        }

        return uniq.values().stream()
                .sorted(Comparator.comparingInt((TagRule r) -> r.weight).reversed())
                .toList();
    }

    private boolean isRuleAllowedForWeather(TagRule rule, WeatherKind weatherKind) {
        String label = rule.label().toLowerCase();

        return switch (weatherKind) {
            case RAIN, SNOW, STORM, COLD ->
                    label.contains("museum")
                            || label.contains("gallery")
                            || label.contains("restaurant")
                            || label.contains("cafe")
                            || label.contains("culture")
                            || label.contains("historical")
                            || label.contains("landmark");

            case HOT ->
                    label.contains("museum")
                            || label.contains("gallery")
                            || label.contains("cafe")
                            || label.contains("restaurant")
                            || label.contains("park")
                            || label.contains("nature");

            case CLEAR, CLOUDY -> true;
        };
    }

    private boolean isPlaceAllowedForWeather(RecommendationDto place, WeatherKind weatherKind) {
        String category = place.getCategory() == null ? "" : place.getCategory().toLowerCase();

        return switch (weatherKind) {
            case RAIN, SNOW, STORM, COLD ->
                    category.contains("museum")
                            || category.contains("gallery")
                            || category.contains("restaurant")
                            || category.contains("cafe")
                            || category.contains("historical")
                            || category.contains("attraction");

            case HOT ->
                    category.contains("museum")
                            || category.contains("gallery")
                            || category.contains("restaurant")
                            || category.contains("cafe")
                            || category.contains("park")
                            || category.contains("viewpoint")
                            || category.contains("attraction");

            case CLEAR, CLOUDY -> true;
        };
    }

    private String buildOverpassQuery(double lat, double lng, int radiusM, List<TagRule> rules) {
        List<TagRule> top = rules.stream().limit(4).toList();

        StringBuilder sb = new StringBuilder();
        sb.append("[out:json][timeout:50];(");

        for (TagRule r : top) {
            if ("*".equals(r.value())) {
                sb.append("nwr(around:")
                        .append(radiusM).append(",").append(lat).append(",").append(lng)
                        .append(")[\"").append(r.key()).append("\"];");
            } else {
                sb.append("nwr(around:")
                        .append(radiusM).append(",").append(lat).append(",").append(lng)
                        .append(")[\"").append(r.key()).append("\"=\"").append(r.value()).append("\"];");
            }
        }

        sb.append(");out center tags qt;");
        return sb.toString();
    }

    private OverpassResponse callOverpass(String query) {
        String body = "data=" + URLEncoder.encode(query, StandardCharsets.UTF_8);

        RuntimeException last = null;

        for (String url : OVERPASS_URLS) {
            for (int attempt = 1; attempt <= 2; attempt++) {
                try {
                    HttpRequest req = HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Content-Type", "application/x-www-form-urlencoded")
                            .header("Accept", "application/json")
                            .header("User-Agent", "travel-assistant/1.0")
                            .POST(HttpRequest.BodyPublishers.ofString(body))
                            .build();

                    HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

                    if (resp.statusCode() == 429 || resp.statusCode() == 502 || resp.statusCode() == 503 || resp.statusCode() == 504) {
                        String snippet = resp.body() == null ? "" : resp.body().substring(0, Math.min(300, resp.body().length()));
                        last = new RuntimeException("Overpass " + url + " HTTP " + resp.statusCode() + ": " + snippet);
                        Thread.sleep(350L * attempt);
                        continue;
                    }

                    if (resp.statusCode() >= 400) {
                        String snippet = resp.body() == null ? "" : resp.body().substring(0, Math.min(600, resp.body().length()));
                        throw new RuntimeException("Overpass " + url + " HTTP " + resp.statusCode() + " body: " + snippet);
                    }

                    return objectMapper.readValue(resp.body(), OverpassResponse.class);

                } catch (Exception e) {
                    last = new RuntimeException("Failed on " + url + " attempt " + attempt + ": " + e.getMessage(), e);
                    try {
                        Thread.sleep(350L * attempt);
                    } catch (InterruptedException ignored) {
                    }
                }
            }
        }

        throw (last != null) ? last : new RuntimeException("Failed to call Overpass");
    }

    private RecommendationDto toRecommendation(OverpassElement el, List<TagRule> rules) {
        if (el == null) return null;

        Double lat = el.lat;
        Double lon = el.lon;

        if ((lat == null || lon == null) && el.center != null) {
            lat = el.center.lat;
            lon = el.center.lon;
        }
        if (lat == null || lon == null) return null;

        Map<String, String> tags = el.tags != null ? el.tags : Map.of();

        String name = tags.get("name");
        if (name == null || name.isBlank()) return null;

        double score = 0.0;
        String category = guessCategory(tags);

        if (!tags.isEmpty()) {
            for (TagRule r : rules) {
                if ("*".equals(r.value)) {
                    if (tags.containsKey(r.key)) {
                        score += r.weight;
                        category = r.label;
                    }
                } else {
                    String v = tags.get(r.key);
                    if (v != null && r.value.equalsIgnoreCase(v)) {
                        score += r.weight;
                        category = r.label;
                    }
                }
            }
        }

        String address = buildAddress(tags);
        String website = firstNonBlank(tags.get("website"), tags.get("contact:website"), tags.get("url"));
        String phone = firstNonBlank(tags.get("phone"), tags.get("contact:phone"));
        String openingHours = tags.get("opening_hours");
        Boolean wheelchair = parseWheelchair(tags.get("wheelchair"));
        CostEstimate ce = estimateCost(tags, category);

        return RecommendationDto.builder()
                .osmType(el.type)
                .osmId(el.id)
                .name(name)
                .category(category != null ? category : "place")
                .latitude(lat)
                .longitude(lon)
                .score(score)
                .source("OSM")
                .address(address)
                .website(website)
                .phone(phone)
                .openingHours(openingHours)
                .wheelchair(wheelchair)
                .tags(tags)
                .estimatedCostEur(ce.eur)
                .costLevel(ce.level.name())
                .build();
    }

    private String guessCategory(Map<String, String> tags) {
        return firstNonBlank(
                tags.get("amenity"),
                tags.get("tourism"),
                tags.get("leisure"),
                tags.get("shop"),
                tags.get("historic"),
                tags.get("natural")
        );
    }

    private String buildAddress(Map<String, String> tags) {
        String road = firstNonBlank(tags.get("addr:street"), tags.get("street"));
        String house = firstNonBlank(tags.get("addr:housenumber"), tags.get("housenumber"));
        String city = firstNonBlank(tags.get("addr:city"), tags.get("city"), tags.get("addr:town"));
        String postcode = firstNonBlank(tags.get("addr:postcode"));

        List<String> parts = new ArrayList<>();
        String line1 = StreamJoin.join(" ", road, house);
        if (!line1.isBlank()) parts.add(line1);
        if (city != null && !city.isBlank()) parts.add(city);
        if (postcode != null && !postcode.isBlank()) parts.add(postcode);

        return parts.isEmpty() ? null : String.join(", ", parts);
    }

    private Boolean parseWheelchair(String v) {
        if (v == null) return null;
        return switch (v.toLowerCase()) {
            case "yes", "limited" -> true;
            case "no" -> false;
            default -> null;
        };
    }

    private CostEstimate estimateCost(Map<String, String> tags, String category) {
        String fee = tags.get("fee");
        String priceRange = firstNonBlank(tags.get("price_range"), tags.get("price"));

        if ("no".equalsIgnoreCase(fee)) return new CostEstimate(0.0, CostLevel.LOW);
        if (priceRange != null && priceRange.contains("€€€")) return new CostEstimate(35.0, CostLevel.HIGH);
        if (priceRange != null && priceRange.contains("€€")) return new CostEstimate(18.0, CostLevel.MID);
        if (priceRange != null && priceRange.contains("€")) return new CostEstimate(8.0, CostLevel.LOW);

        String c = category == null ? "" : category.toLowerCase();

        if (c.contains("restaurant")) return new CostEstimate(20.0, CostLevel.MID);
        if (c.contains("cafe")) return new CostEstimate(7.0, CostLevel.LOW);
        if (c.contains("museum") || c.contains("gallery")) return new CostEstimate(12.0, CostLevel.MID);
        if (c.contains("park") || c.contains("viewpoint")) return new CostEstimate(0.0, CostLevel.LOW);

        return new CostEstimate(10.0, CostLevel.MID);
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    private record CostEstimate(Double eur, CostLevel level) {}
    private record TagRule(String key, String value, String label, int weight) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class OverpassResponse {
        public List<OverpassElement> elements = new ArrayList<>();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class OverpassElement {
        public Long id;
        public String type;
        public Double lat;
        public Double lon;
        public Center center;
        public Map<String, String> tags;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class Center {
        public Double lat;
        public Double lon;
    }

    static class StreamJoin {
        static String join(String delimiter, String... parts) {
            return Arrays.stream(parts)
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.joining(delimiter));
        }
    }
}