package com.travelassistant.repository;

import com.travelassistant.model.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PlaceRepository extends JpaRepository<Place, UUID> {

    List<Place> findByCity(String city);

    List<Place> findByType(String type);

    List<Place> findByIndoorTrue();

    @Query("""
        SELECT p FROM Place p
        WHERE p.latitude BETWEEN :latMin AND :latMax
          AND p.longitude BETWEEN :lngMin AND :lngMax
    """)
    List<Place> findNearby(
            @Param("latMin") Double latMin,
            @Param("latMax") Double latMax,
            @Param("lngMin") Double lngMin,
            @Param("lngMax") Double lngMax
    );
}
