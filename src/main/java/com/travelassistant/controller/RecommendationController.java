package com.travelassistant.controller;



import com.travelassistant.controller.dto.RecommendationDto;
import com.travelassistant.controller.dto.RecommendationRequestDto;
import com.travelassistant.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @PostMapping("/me")
    public List<RecommendationDto> getMyRecommendations(
            Authentication authentication,
            @RequestBody RecommendationRequestDto req
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        return recommendationService.getRecommendationsForUser(userId, req.getLatitude(), req.getLongitude());
    }
}
