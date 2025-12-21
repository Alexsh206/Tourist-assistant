package com.travelassistant.repository;

import com.travelassistant.model.Place;
import com.travelassistant.model.PlaceInterest;
import com.travelassistant.model.PlaceInterestId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlaceInterestRepository
        extends JpaRepository<PlaceInterest, PlaceInterestId> {

    List<PlaceInterest> findByInterestId(Integer interestId);

    List<PlaceInterest> findByPlace(Place place);

    List<PlaceInterest> findByPlaceId(UUID placeId);
}
