package com.travelassistant.repository;

import com.travelassistant.model.UserAudioHistory;
import com.travelassistant.model.UserAudioHistoryId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAudioHistoryRepository extends JpaRepository<UserAudioHistory, UserAudioHistoryId> {
}
