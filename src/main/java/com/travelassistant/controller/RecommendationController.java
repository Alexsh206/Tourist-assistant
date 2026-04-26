package com.travelassistant.controller;

import com.travelassistant.controller.dto.RecommendationRequestDto;
import com.travelassistant.controller.dto.RecommendationResponseDto;
import com.travelassistant.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @PostMapping("/me")
    public RecommendationResponseDto getMyRecommendations(
            Authentication authentication,
            @RequestBody RecommendationRequestDto req
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        return (RecommendationResponseDto) recommendationService.getRecommendationsForUser(userId, req.getLatitude(), req.getLongitude());
    }
}