package com.travelassistant.controller;

import com.travelassistant.controller.dto.UserInterestDto;
import com.travelassistant.controller.dto.UserInterestViewDto;
import com.travelassistant.service.UserInterestService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/user-interests")
@RequiredArgsConstructor
public class UserInterestController {

    private final UserInterestService userInterestService;

    @GetMapping("/me")
    public List<UserInterestViewDto> getMyInterests(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return userInterestService.getUserInterests(userId);
    }

    @PutMapping("/me")
    public void updateInterests(
            Authentication authentication,
            @RequestBody List<UserInterestDto> interests
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        userInterestService.updateUserInterests(userId, interests);
    }
}

