package com.travelassistant.service;

import com.travelassistant.model.Place;
import com.travelassistant.model.Route;
import com.travelassistant.model.User;
import com.travelassistant.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;


import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;
    private final PlaceService placeService;

    public Route createRoute(
            User user,
            String name,
            List<Place> places,
            String weatherType
    ) {
        double totalDistance = places.size() * 0.4;
        int estimatedTime = places.size() * 30;

        Route route = Route.builder()
                .user(user)
                .name(name)
                .totalDistance(totalDistance)
                .estimatedTime(estimatedTime)
                .weatherType(weatherType)
                .createdAt(LocalDateTime.now())
                .build();

        return routeRepository.save(route);
    }

    public List<Place> adaptRouteToWeather(
            List<Place> places,
            boolean badWeather
    ) {
        if (!badWeather) return places;

        return places.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIndoor()))
                .collect(Collectors.toList());
    }

    public List<Route> getUserRoutes(UUID userId) {
        return routeRepository.findByUserId(userId);
    }
}
