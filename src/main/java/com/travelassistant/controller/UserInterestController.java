package com.travelassistant.controller;

import com.travelassistant.model.UserInterest;
import com.travelassistant.service.UserInterestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/user-interests")
@RequiredArgsConstructor
public class UserInterestController {

    private final UserInterestService userInterestService;

    @GetMapping("/{userId}")
    public List<UserInterest> getUserInterests(@PathVariable UUID userId) {
        return userInterestService.getUserInterests(userId);
    }

    @PostMapping("/{userId}")
    public UserInterest addInterest(
            @PathVariable UUID userId,
            @RequestParam Integer interestId,
            @RequestParam Integer weight
    ) {
        return userInterestService.addInterest(userId, interestId, weight);
    }

    @PutMapping("/{userId}")
    public void updateInterests(
            @PathVariable UUID userId,
            @RequestBody List<UserInterest> interests
    ) {
        userInterestService.updateUserInterests(userId, interests);
    }
}
