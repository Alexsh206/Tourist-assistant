package com.travelassistant.service;

import com.travelassistant.model.*;
import com.travelassistant.repository.PlaceInterestRepository;
import com.travelassistant.repository.UserInterestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final UserInterestRepository userInterestRepository;
    private final PlaceInterestRepository placeInterestRepository;

    public List<Place> recommendPlacesForUser(User user) {

        List<UserInterest> userInterests =
                userInterestRepository.findByUser(user);

        Map<UUID, Integer> placeScore = new HashMap<>();

        for (UserInterest ui : userInterests) {
            placeInterestRepository
                    .findByInterestId(ui.getInterest().getId())
                    .forEach(pi -> {
                        UUID placeId = pi.getPlace().getId();
                        int score = ui.getWeight() * pi.getRelevance();
                        placeScore.merge(placeId, score, Integer::sum);
                    });
        }

        return placeScore.entrySet().stream()
                .sorted(Map.Entry.<UUID, Integer>comparingByValue().reversed())
                .map(e -> e.getKey())
                .map(id -> placeInterestRepository.findByPlaceId(id).get(0).getPlace())
                .distinct()
                .collect(Collectors.toList());
    }
}
