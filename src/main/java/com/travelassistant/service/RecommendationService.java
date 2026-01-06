package com.travelassistant.service;


import com.travelassistant.controller.dto.RecommendationDto;
import com.travelassistant.model.UserProfile;
import com.travelassistant.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final UserProfileRepository userProfileRepository;

    public List<RecommendationDto> getRecommendationsForUser(UUID userId, Double lat, Double lng) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        Integer radiusM = profile.getWalkingRadiusM() != null ? profile.getWalkingRadiusM() : 1000;


        return List.of();
    }
}
