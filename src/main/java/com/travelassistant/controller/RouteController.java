package com.travelassistant.controller;

import com.travelassistant.model.Place;
import com.travelassistant.model.Route;
import com.travelassistant.model.User;
import com.travelassistant.service.RouteService;
import com.travelassistant.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;
    private final UserService userService;

    @PostMapping("/{userId}")
    public Route createRoute(
            @PathVariable UUID userId,
            @RequestParam String name,
            @RequestParam String weather,
            @RequestBody List<Place> places
    ) {
        User user = userService.getById(userId);
        return routeService.createRoute(user, name, places, weather);
    }

    @GetMapping("/{userId}")
    public List<Route> getUserRoutes(@PathVariable UUID userId) {
        return routeService.getUserRoutes(userId);
    }

    @PostMapping("/adapt")
    public List<Place> adaptRouteToWeather(
            @RequestBody List<Place> places,
            @RequestParam boolean badWeather
    ) {
        return routeService.adaptRouteToWeather(places, badWeather);
    }
}
