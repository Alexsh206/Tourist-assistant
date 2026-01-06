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

        if (rules.isEmpty()) {
            return List.of();
        }

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

        sb.append(");out tags center qt;");
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

                        Thread.sleep(350L * attempt); // backoff
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

        String name = null;
        if (el.tags != null) {
            name = el.tags.getOrDefault("name", null);
        }
        if (name == null || name.isBlank()) name = "Unnamed place";

        double score = 0.0;
        String category = "place";

        if (el.tags != null) {
            for (TagRule r : rules) {
                if ("*".equals(r.value)) {
                    if (el.tags.containsKey(r.key)) {
                        score += r.weight;
                        category = r.label;
                    }
                } else {
                    String v = el.tags.get(r.key);
                    if (r.value.equalsIgnoreCase(String.valueOf(v))) {
                        score += r.weight;
                        category = r.label;
                    }
                }
            }
        }

        return new RecommendationDto(
                null,
                name,
                category,
                lat,
                lon,
                score,
                "OSM"
        );
    }


    private record TagRule(String key, String value, String label, int weight) {}

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
