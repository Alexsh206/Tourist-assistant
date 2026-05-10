package com.travelassistant.controller;

import com.travelassistant.controller.dto.AiRouteRequestDto;
import com.travelassistant.controller.dto.AiRouteResponseDto;
import com.travelassistant.service.AiRouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai-routes")
@RequiredArgsConstructor
public class AiRouteController {

    private final AiRouteService aiRouteService;

    @PostMapping("/me")
    public AiRouteResponseDto generateRoute(
            Authentication authentication,
            @RequestBody AiRouteRequestDto request
    ) {
        System.out.println("AI ROUTE CONTROLLER HIT");
        System.out.println("AUTH = " + authentication);

        UUID userId = UUID.fromString(authentication.getName());
        return aiRouteService.generateRouteForUser(userId, request);
    }
}