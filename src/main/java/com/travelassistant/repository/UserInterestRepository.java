package com.travelassistant.repository;

import com.travelassistant.model.User;
import com.travelassistant.model.UserInterest;
import com.travelassistant.model.UserInterestId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserInterestRepository
        extends JpaRepository<UserInterest, UserInterestId> {

    List<UserInterest> findByUser(User user);

    void deleteByUserId(UUID userId);
}
