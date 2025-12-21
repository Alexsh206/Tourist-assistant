package com.travelassistant.repository;

import com.travelassistant.model.AudioGuide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AudioGuideRepository extends JpaRepository<AudioGuide, UUID> {

    Optional<AudioGuide> findByPlaceIdAndLanguage(UUID placeId, String language);
}
