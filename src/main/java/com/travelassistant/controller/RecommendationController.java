package com.travelassistant.controller;

import com.travelassistant.model.Place;
import com.travelassistant.model.User;
import com.travelassistant.service.RecommendationService;
import com.travelassistant.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final UserService userService;

    @GetMapping("/{userId}")
    public List<Place> getRecommendations(@PathVariable UUID userId) {
        User user = userService.getById(userId);
        return recommendationService.recommendPlacesForUser(user);
    }
}
