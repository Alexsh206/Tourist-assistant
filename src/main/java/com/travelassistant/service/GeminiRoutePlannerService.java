package com.travelassistant.service;

import com.travelassistant.config.GeminiConfig;
import com.travelassistant.controller.dto.AiRouteResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GeminiRoutePlannerService {

    private final GeminiConfig geminiConfig;
    private final ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();

    public AiRouteResponseDto planRoute(String prompt) {
        try {
            String apiKey = geminiConfig.getApiKey();

            if (apiKey == null || apiKey.isBlank()) {
                throw new IllegalStateException(
                        "Gemini API key is not configured. Set GEMINI_API_KEY or gemini.api-key."
                );
            }

            if (geminiConfig.getBaseUrl() == null || geminiConfig.getBaseUrl().isBlank()) {
                throw new IllegalStateException("Gemini baseUrl is not configured.");
            }

            if (geminiConfig.getModel() == null || geminiConfig.getModel().isBlank()) {
                throw new IllegalStateException("Gemini model is not configured.");
            }

            String url = geminiConfig.getBaseUrl()
                    + "/models/"
                    + geminiConfig.getModel()
                    + ":generateContent?key="
                    + apiKey;

            Map<String, Object> body = Map.of(
                    "contents", List.of(
                            Map.of(
                                    "role", "user",
                                    "parts", List.of(
                                            Map.of(
                                                    "text",
                                                    """
                                                    You are a route planning assistant for a tourist web application.

                                                    Return only valid JSON.
                                                    Do not use markdown.
                                                    Do not wrap the answer in ```json.
                                                    Use only the candidate places provided in the prompt.
                                                    Do not invent new places.

                                                    The JSON must match this Java DTO structure exactly:

                                                    {
                                                      "title": "string",
                                                      "summary": "string",
                                                      "weatherContext": "string",
                                                      "estimatedDurationMinutes": 120,
                                                      "estimatedBudget": 20.0,
                                                      "points": [
                                                        {
                                                          "placeName": "string",
                                                          "latitude": 49.232,
                                                          "longitude": 28.468,
                                                          "category": "string",
                                                          "reason": "string",
                                                          "stopOrder": 1,
                                                          "suggestedStayMinutes": 30
                                                        }
                                                      ]
                                                    }

                                                    User request and available places:
                                                    """ + prompt
                                            )
                                    )
                            )
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.35,
                            "responseMimeType", "application/json"
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );

            if (response.getBody() == null || response.getBody().isBlank()) {
                throw new RuntimeException("Gemini returned empty HTTP body");
            }

            JsonNode root = objectMapper.readTree(response.getBody());

            String content = root
                    .path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text")
                    .asText();

            if (content == null || content.isBlank()) {
                throw new RuntimeException("Gemini returned empty generated content: " + response.getBody());
            }

            return objectMapper.readValue(content, AiRouteResponseDto.class);

        } catch (Exception e) {
            throw new RuntimeException("Failed to plan AI route with Gemini: " + e.getMessage(), e);
        }
    }
}
