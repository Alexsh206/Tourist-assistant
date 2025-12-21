package com.travelassistant.controller;

import com.travelassistant.model.AudioGuide;
import com.travelassistant.service.AudioGuideService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/audio-guides")
@RequiredArgsConstructor
public class AudioGuideController {

    private final AudioGuideService service;

    @GetMapping
    public AudioGuide getGuide(
            @RequestParam UUID placeId,
            @RequestParam String lang
    ) {
        return service.getGuide(placeId, lang);
    }
}
