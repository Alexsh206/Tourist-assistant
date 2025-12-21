package com.travelassistant.service;

import com.travelassistant.model.Place;
import com.travelassistant.repository.PlaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlaceService {

    private final PlaceRepository placeRepository;

    public Place createPlace(Place place) {
        place.setCreatedAt(java.time.LocalDateTime.now());
        return placeRepository.save(place);
    }

    public Place getById(UUID placeId) {
        return placeRepository.findById(placeId)
                .orElseThrow(() -> new RuntimeException("Place not found"));
    }

    public List<Place> getByCity(String city) {
        return placeRepository.findByCity(city);
    }

    public List<Place> getIndoorPlaces() {
        return placeRepository.findByIndoorTrue();
    }

    public List<Place> findNearby(
            Double lat, Double lng, Double radiusKm
    ) {
        double delta = radiusKm / 111.0;
        return placeRepository.findNearby(
                lat - delta,
                lat + delta,
                lng - delta,
                lng + delta
        );
    }
}
