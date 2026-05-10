package com.travelassistant.service;

import com.travelassistant.controller.dto.*;
import com.travelassistant.model.WeatherKind;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiRouteService {

    private final RecommendationService recommendationService;
    private final WeatherService weatherService;
    private final OllamaRoutePlannerService ollamaRoutePlannerService;

    public AiRouteResponseDto generateRouteForUser(UUID userId, AiRouteRequestDto request) {
        if (request.getLatitude() == null || request.getLongitude() == null) {
            throw new RuntimeException("Latitude and longitude are required");
        }

        RecommendationResponseDto recommendationResponse =
                recommendationService.getRecommendationsForUser(
                        userId,
                        request.getLatitude(),
                        request.getLongitude()
                );

        List<RecommendationDto> candidates = recommendationResponse.getRecommendations()
                .stream()
                .limit(8)
                .collect(Collectors.toList());

        WeatherKind weatherKind = weatherService.getCurrentWeatherKind(
                request.getLatitude(),
                request.getLongitude()
        );

        StringBuilder prompt = new StringBuilder();
        prompt.append("Build a city route using only the candidate places below.\n");
        prompt.append("Weather: ").append(weatherKind.name()).append("\n");
        prompt.append("Desired duration: ").append(request.getDesiredDurationMinutes()).append(" minutes\n");
        prompt.append("Max budget: ").append(request.getMaxBudget()).append("\n");
        prompt.append("Route style: ").append(request.getRouteStyle()).append("\n\n");

        prompt.append("Candidate places:\n");
        for (RecommendationDto place : candidates) {
            prompt.append("- name: ").append(place.getName()).append("\n");
            prompt.append("  category: ").append(place.getCategory()).append("\n");
            prompt.append("  latitude: ").append(place.getLatitude()).append("\n");
            prompt.append("  longitude: ").append(place.getLongitude()).append("\n");
            prompt.append("  estimatedCostEur: ").append(place.getEstimatedCostEur()).append("\n");
            prompt.append("  score: ").append(place.getScore()).append("\n");
        }

        prompt.append("""
                
                Return JSON in this exact structure:
                {
                  "title": "string",
                  "summary": "string",
                  "weatherContext": "string",
                  "estimatedDurationMinutes": 0,
                  "estimatedBudget": 0,
                  "points": [
                    {
                      "placeName": "string",
                      "latitude": 0,
                      "longitude": 0,
                      "category": "string",
                      "reason": "string",
                      "stopOrder": 1,
                      "suggestedStayMinutes": 0
                    }
                  ]
                }
                """);

        return ollamaRoutePlannerService.planRoute(prompt.toString());
    }
}