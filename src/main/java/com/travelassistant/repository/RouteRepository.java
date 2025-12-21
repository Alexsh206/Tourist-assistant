package com.travelassistant.repository;

import com.travelassistant.model.Route;
import com.travelassistant.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RouteRepository extends JpaRepository<Route, UUID> {

    List<Route> findByUser(User user);

    List<Route> findByUserId(UUID userId);
}
