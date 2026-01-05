package com.travelassistant.controller;

import com.travelassistant.controller.dto.InterestDto;
import com.travelassistant.model.Interest;
import com.travelassistant.service.InterestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interests")
@RequiredArgsConstructor
public class InterestController {

    private final InterestService interestService;

    @GetMapping
    public List<InterestDto> getAll() {
        return interestService.getAllInterests();
    }

    @PostMapping
    public Interest create(@RequestBody Interest interest) {
        return interestService.createInterest(interest);
    }
}
