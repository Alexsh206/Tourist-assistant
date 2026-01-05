package com.travelassistant.service;

import com.travelassistant.controller.dto.UserInterestDto;
import com.travelassistant.controller.dto.UserInterestViewDto;
import com.travelassistant.model.*;
import com.travelassistant.repository.UserInterestRepository;
import com.travelassistant.repository.InterestRepository;
import com.travelassistant.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserInterestService {

    private final UserInterestRepository userInterestRepository;
    private final UserRepository userRepository;
    private final InterestRepository interestRepository;

    public List<UserInterestViewDto> getUserInterests(UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return userInterestRepository.findByUser(user)
                .stream()
                .map(ui -> new UserInterestViewDto(
                        ui.getInterest().getId(),
                        ui.getInterest().getName(),
                        ui.getWeight()
                ))
                .toList();
    }


    @Transactional
    public void updateUserInterests(UUID userId, List<UserInterestDto> dtos) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        userInterestRepository.deleteByUserId(userId);

        List<UserInterest> entities = dtos.stream().map(dto -> {
            Interest interest = interestRepository.findById(dto.getInterestId())
                    .orElseThrow(() -> new RuntimeException("Interest not found"));

            return UserInterest.builder()
                    .user(user)
                    .interest(interest)
                    .weight(dto.getWeight())
                    .build();
        }).toList();

        userInterestRepository.saveAll(entities);
    }

    public UserInterest addInterest(UUID userId, Integer interestId, Integer weight) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Interest interest = interestRepository.findById(interestId)
                .orElseThrow(() -> new RuntimeException("Interest not found"));

        UserInterest ui = UserInterest.builder()
                .user(user)
                .interest(interest)
                .weight(weight)
                .build();

        return userInterestRepository.save(ui);
    }
}
