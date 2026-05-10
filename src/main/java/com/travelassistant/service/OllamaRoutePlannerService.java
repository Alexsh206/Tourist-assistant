package com.travelassistant.service;


import com.travelassistant.config.OllamaConfig;
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
public class OllamaRoutePlannerService {

    private final OllamaConfig ollamaConfig;
    private final ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();

    public AiRouteResponseDto planRoute(String prompt) {
        try {
            String url = ollamaConfig.getBaseUrl() + "/api/chat";

            Map<String, Object> body = Map.of(
                    "model", ollamaConfig.getModel(),
                    "stream", false,
                    "format", "json",
                    "messages", List.of(
                            Map.of(
                                    "role", "system",
                                    "content", """
                                            You are an AI route planner for a travel app.
                                            Return only valid JSON.
                                            Do not invent places outside the provided candidate list.
                                            Build a realistic short city route.
                                            """
                            ),
                            Map.of(
                                    "role", "user",
                                    "content", prompt
                            )
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Ollama request failed");
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            String content = root.path("message").path("content").asText();

            return objectMapper.readValue(content, AiRouteResponseDto.class);

        } catch (Exception e) {
            throw new RuntimeException("Failed to plan AI route: " + e.getMessage(), e);
        }
    }
}