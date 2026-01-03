package com.travelassistant.service;

import com.travelassistant.model.User;
import com.travelassistant.model.UserProfile;
import com.travelassistant.repository.UserProfileRepository;
import com.travelassistant.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository profileRepository;
    private final UserRepository userRepository;


    public UserProfile getOrCreateProfile(UUID userId) {

        return profileRepository.findByUserId(userId)
                .orElseGet(() -> {

                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found"));

                    UserProfile profile = UserProfile.builder()
                            .user(user)
                            .createdAt(LocalDateTime.now())
                            .build();

                    return profileRepository.save(profile);
                });
    }


    public UserProfile updateProfile(UUID userId, UserProfile incoming) {

        UserProfile profile = getOrCreateProfile(userId);

        copyAllFields(profile, incoming);

        return profileRepository.save(profile);
    }


    public UserProfile patchProfile(UUID userId, UserProfile incoming) {

        UserProfile profile = getOrCreateProfile(userId);

        if (incoming.getFirstName() != null)
            profile.setFirstName(incoming.getFirstName());

        if (incoming.getLastName() != null)
            profile.setLastName(incoming.getLastName());

        if (incoming.getBirthDate() != null)
            profile.setBirthDate(incoming.getBirthDate());

        if (incoming.getCountry() != null)
            profile.setCountry(incoming.getCountry());

        if (incoming.getCity() != null)
            profile.setCity(incoming.getCity());

        if (incoming.getWalkingRadiusM() != null)
            profile.setWalkingRadiusM(incoming.getWalkingRadiusM());

        if (incoming.getPreferredLanguage() != null)
            profile.setPreferredLanguage(incoming.getPreferredLanguage());

        if (incoming.getTravelStyle() != null)
            profile.setTravelStyle(incoming.getTravelStyle());

        if (incoming.getDailyBudget() != null)
            profile.setDailyBudget(incoming.getDailyBudget());

        if (incoming.getAccessibilityNeeds() != null)
            profile.setAccessibilityNeeds(incoming.getAccessibilityNeeds());

        return profileRepository.save(profile);
    }


    public void deleteProfile(UUID userId) {

        profileRepository.findByUserId(userId)
                .ifPresent(profileRepository::delete);
    }


    private void copyAllFields(UserProfile target, UserProfile source) {

        target.setFirstName(source.getFirstName());
        target.setLastName(source.getLastName());
        target.setBirthDate(source.getBirthDate());
        target.setCountry(source.getCountry());
        target.setCity(source.getCity());
        target.setWalkingRadiusM(source.getWalkingRadiusM());

        target.setPreferredLanguage(source.getPreferredLanguage());
        target.setTravelStyle(source.getTravelStyle());
        target.setDailyBudget(source.getDailyBudget());
        target.setAccessibilityNeeds(source.getAccessibilityNeeds());
    }
}
