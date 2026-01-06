package com.travelassistant.repository;

import com.travelassistant.model.User;
import com.travelassistant.model.UserInterest;
import com.travelassistant.model.UserInterestId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface UserInterestRepository
        extends JpaRepository<UserInterest, UserInterestId> {

    @Query("""
        select ui
        from UserInterest ui
        join fetch ui.interest i
        where ui.user.id = :userId
    """)
    List<UserInterest> findByUserIdWithInterest(UUID userId);

    List<UserInterest> findByUser(User user);

    void deleteByUserId(UUID userId);
}
