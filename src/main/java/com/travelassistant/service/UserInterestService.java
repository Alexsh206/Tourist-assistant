package com.travelassistant.service;

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

    public List<UserInterest> getUserInterests(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return userInterestRepository.findByUser(user);
    }

    @Transactional
    public void updateUserInterests(UUID userId, List<UserInterest> interests) {
        userInterestRepository.deleteByUserId(userId);
        userInterestRepository.saveAll(interests);
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
