package com.travelassistant.service;

import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class WeatherService {

    private static final Set<String> BAD = Set.of("rain", "snow", "storm", "thunderstorm");

    public boolean isBadWeather(String weather) {
        if (weather == null) return false;
        return BAD.contains(weather.toLowerCase());
    }
}
