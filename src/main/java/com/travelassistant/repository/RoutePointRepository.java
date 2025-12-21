package com.travelassistant.repository;

import com.travelassistant.model.RoutePoint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoutePointRepository extends JpaRepository<RoutePoint, Long> {
}
