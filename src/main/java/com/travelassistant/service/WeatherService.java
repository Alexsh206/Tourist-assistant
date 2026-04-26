package com.travelassistant.service;

import com.travelassistant.model.WeatherKind;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
@RequiredArgsConstructor
public class WeatherService {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public WeatherKind getCurrentWeatherKind(double lat, double lon) {
        try {
            String url = "https://api.open-meteo.com/v1/forecast"
                    + "?latitude=" + lat
                    + "&longitude=" + lon
                    + "&current=temperature_2m,weather_code"
                    + "&timezone=auto";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                throw new RuntimeException("Weather API error: " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode current = root.path("current");

            int weatherCode = current.path("weather_code").asInt();
            double temperature = current.path("temperature_2m").asDouble();

            return mapWeatherCode(weatherCode, temperature);

        } catch (Exception e) {
            return WeatherKind.CLEAR;
        }
    }

    private WeatherKind mapWeatherCode(int code, double temp) {
        if (code == 95 || code == 96 || code == 99) {
            return WeatherKind.STORM;
        }

        if ((code >= 71 && code <= 77) || code == 85 || code == 86) {
            return WeatherKind.SNOW;
        }

        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
            return WeatherKind.RAIN;
        }

        if (temp >= 30) {
            return WeatherKind.HOT;
        }

        if (temp <= 0) {
            return WeatherKind.COLD;
        }

        if (code == 1 || code == 2 || code == 3 || code == 45 || code == 48) {
            return WeatherKind.CLOUDY;
        }

        return WeatherKind.CLEAR;
    }

    public String buildWeatherMessage(WeatherKind weatherKind) {
        return switch (weatherKind) {
            case RAIN -> "Showing places suitable for rainy weather";
            case SNOW -> "Showing places suitable for snowy weather";
            case STORM -> "Showing safer indoor places because of storm conditions";
            case HOT -> "Showing places suitable for hot weather";
            case COLD -> "Showing warmer indoor places because of cold weather";
            case CLOUDY -> "Showing places suitable for cloudy weather";
            case CLEAR -> "Showing all suitable places for current weather";
        };
    }
}