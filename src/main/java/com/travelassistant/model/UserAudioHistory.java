package com.travelassistant.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_audio_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@IdClass(UserAudioHistoryId.class)
public class UserAudioHistory {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_id")
    private AudioGuide audioGuide;

    private LocalDateTime listenedAt;
}
