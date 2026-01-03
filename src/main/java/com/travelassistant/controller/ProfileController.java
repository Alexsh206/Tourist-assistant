package com.travelassistant.controller;

import com.travelassistant.model.UserProfile;
import com.travelassistant.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserProfileService profileService;

    private UUID currentUserId() {
        String userId = (String) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();
        return UUID.fromString(userId);
    }


    @GetMapping("/me")
    public UserProfile getMyProfile() {
        return profileService.getOrCreateProfile(currentUserId());
    }



    @PostMapping("/me")
    public UserProfile saveMyProfile(@RequestBody UserProfile profile) {
        return profileService.updateProfile(currentUserId(), profile);
    }



    @PatchMapping("/me")
    public UserProfile patchMyProfile(@RequestBody UserProfile profile) {
        return profileService.patchProfile(currentUserId(), profile);
    }



    @DeleteMapping("/me")
    public void deleteMyProfile() {
        profileService.deleteProfile(currentUserId());
    }
}
