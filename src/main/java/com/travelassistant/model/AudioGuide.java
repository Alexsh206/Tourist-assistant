package com.travelassistant.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "audio_guides",
        uniqueConstraints = @UniqueConstraint(columnNames = {"place_id", "language"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AudioGuide {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id")
    private Place place;

    @Column(nullable = false, length = 10)
    private String language;

    @Column(columnDefinition = "TEXT")
    private String text;

    private String audioUrl; // where stored
    private Integer duration; // seconds
    private LocalDateTime createdAt;
}
