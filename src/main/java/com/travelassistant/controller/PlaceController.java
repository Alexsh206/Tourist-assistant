package com.travelassistant.controller;

import com.travelassistant.model.Place;
import com.travelassistant.service.PlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService placeService;

    @PostMapping
    public Place create(@RequestBody Place place) {
        return placeService.createPlace(place);
    }

    @GetMapping("/{id}")
    public Place getById(@PathVariable UUID id) {
        return placeService.getById(id);
    }

    @GetMapping("/city/{city}")
    public List<Place> getByCity(@PathVariable String city) {
        return placeService.getByCity(city);
    }

    @GetMapping("/nearby")
    public List<Place> getNearby(
            @RequestParam Double lat,
            @RequestParam Double lng,
            @RequestParam(defaultValue = "1.0") Double radiusKm
    ) {
        return placeService.findNearby(lat, lng, radiusKm);
    }
}
