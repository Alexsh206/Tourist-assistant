package com.travelassistant.service;

import com.travelassistant.model.AudioGuide;
import com.travelassistant.repository.AudioGuideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AudioGuideService {

    private final AudioGuideRepository audioGuideRepository;

    public AudioGuide getGuide(UUID placeId, String lang) {
        return audioGuideRepository
                .findByPlaceIdAndLanguage(placeId, lang)
                .orElseThrow(() -> new RuntimeException("Audio guide not generated yet"));
    }
}
