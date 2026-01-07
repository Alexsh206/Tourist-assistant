package com.travelassistant.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import com.travelassistant.controller.dto.RecommendationDto;
import com.travelassistant.model.UserInterest;
import com.travelassistant.model.UserProfile;
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
    private final ObjectMapper objectMapper;
    private enum CostLevel { LOW, MID, HIGH }


    private static final List<String> OVERPASS_URLS = List.of(
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.nchc.org.tw/api/interpreter"
    );

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public List<RecommendationDto> getRecommendationsForUser(UUID userId, Double lat, Double lng) {
        if (lat == null || lng == null) throw new RuntimeException("Latitude/longitude required");

        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        int radiusM = profile.getWalkingRadiusM() != null && profile.getWalkingRadiusM() > 0
                ? profile.getWalkingRadiusM()
                : 1000;

        List<UserInterest> userInterests = userInterestRepository.findByUserIdWithInterest(userId);
        List<TagRule> rules = buildRulesFromUserInterests(userInterests);

        if (rules.isEmpty()) return List.of();

        String query = buildOverpassQuery(lat, lng, radiusM, rules);
        OverpassResponse resp = callOverpass(query);

        List<RecommendationDto> out = resp.elements.stream()
                .map(el -> toRecommendation(el, rules))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        Map<String, RecommendationDto> uniq = new LinkedHashMap<>();
        for (RecommendationDto r : out) {
            String key = (r.getName() + "|" + r.getLatitude() + "|" + r.getLongitude()).toLowerCase();
            uniq.putIfAbsent(key, r);
        }

        return uniq.values().stream()
                .sorted(Comparator
                        .comparing(RecommendationDto::getScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(RecommendationDto::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .limit(60)
                .toList();
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
            if (name.contains("hiking")) rules.add(new TagRule("tourism", "viewpoint", "hiking", weight)); // MVP
            if (name.contains("histor")) rules.add(new TagRule("historic", "*", "historical", weight)); // wildcard
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
                    try { Thread.sleep(350L * attempt); } catch (InterruptedException ignored) {}
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
        String street = tags.get("addr:street");
        String house = tags.get("addr:housenumber");
        String city = tags.get("addr:city");
        String postcode = tags.get("addr:postcode");

        String line1 = joinNotBlank(" ", street, house);
        String line2 = joinNotBlank(", ", city, postcode);

        String res = joinNotBlank(", ", line1, line2);
        return res.isBlank() ? null : res;
    }

    private Boolean parseWheelchair(String v) {
        if (v == null) return null;
        String s = v.trim().toLowerCase();
        if (s.equals("yes")) return true;
        if (s.equals("no")) return false;
        return null;
    }

    private String firstNonBlank(String... vals) {
        for (String v : vals) {
            if (v != null && !v.trim().isEmpty()) return v.trim();
        }
        return null;
    }

    private String joinNotBlank(String sep, String... vals) {
        List<String> parts = new ArrayList<>();
        for (String v : vals) {
            if (v != null && !v.trim().isEmpty()) parts.add(v.trim());
        }
        return String.join(sep, parts);
    }


    private record TagRule(String key, String value, String label, int weight) {}

    private static class CostEstimate {
        final Double eur;
        final CostLevel level;

        CostEstimate(Double eur, CostLevel level) {
            this.eur = eur;
            this.level = level;
        }
    }

    private CostEstimate estimateCost(Map<String, String> tags, String category) {
        tags = tags != null ? tags : Map.of();
        String cat = (category == null ? "" : category).trim().toLowerCase();

        String fee = val(tags, "fee");
        if ("no".equalsIgnoreCase(fee)) {
            return new CostEstimate(0.0, CostLevel.LOW);
        }


        Double explicit = parseFirstNumber(val(tags, "charge"));
        if (explicit == null) explicit = parseFirstNumber(val(tags, "fee:amount"));
        if (explicit != null) {
            return new CostEstimate(explicit, explicit <= 10 ? CostLevel.LOW : explicit <= 25 ? CostLevel.MID : CostLevel.HIGH);
        }

        if (cat.contains("park") || cat.contains("viewpoint") || cat.contains("nature")) {
            if ("yes".equalsIgnoreCase(fee)) return new CostEstimate(5.0, CostLevel.LOW);
            return new CostEstimate(0.0, CostLevel.LOW);
        }

        if (cat.contains("museum") || cat.contains("histor") || cat.contains("culture") || cat.contains("landmark") || cat.contains("attraction")) {
            if ("no".equalsIgnoreCase(fee)) return new CostEstimate(0.0, CostLevel.LOW);
            return new CostEstimate(10.0, CostLevel.MID);
        }

        if (cat.contains("cafe")) {
            return new CostEstimate(7.0, CostLevel.LOW);
        }

        if (cat.contains("restaurant")) {
            String cuisine = val(tags, "cuisine");
            if (cuisine != null && cuisine.toLowerCase().contains("sushi")) {
                return new CostEstimate(22.0, CostLevel.MID);
            }
            return new CostEstimate(15.0, CostLevel.MID);
        }

        if ("yes".equalsIgnoreCase(fee)) return new CostEstimate(8.0, CostLevel.MID);
        return new CostEstimate(0.0, CostLevel.LOW);
    }

    private String val(Map<String, String> tags, String key) {
        if (tags == null) return null;
        String v = tags.get(key);
        return (v == null || v.isBlank()) ? null : v.trim();
    }

    private Double parseFirstNumber(String s) {
        if (s == null) return null;
        String cleaned = s.replace(",", ".");
        StringBuilder num = new StringBuilder();
        boolean started = false;

        for (int i = 0; i < cleaned.length(); i++) {
            char c = cleaned.charAt(i);
            if ((c >= '0' && c <= '9') || (c == '.' && started)) {
                num.append(c);
                started = true;
            } else if (started) {
                break;
            }
        }

        if (num.isEmpty()) return null;

        try {
            return Double.parseDouble(num.toString());
        } catch (Exception ignored) {
            return null;
        }
    }


    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class OverpassResponse {
        public List<OverpassElement> elements = new ArrayList<>();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class OverpassElement {
        public String type;
        public long id;
        public Double lat;
        public Double lon;
        public Map<String, String> tags;
        public Center center;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class Center {
        public Double lat;
        public Double lon;
    }
}
