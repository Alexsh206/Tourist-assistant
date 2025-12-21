package com.travelassistant.repository;

import com.travelassistant.model.WeatherSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeatherSnapshotRepository extends JpaRepository<WeatherSnapshot, Long> {
}
