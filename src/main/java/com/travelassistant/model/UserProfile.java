package com.travelassistant.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfile {

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(length = 100)
    private String country;

    @Column(length = 100)
    private String city;

    private String preferredLanguage;
    private String travelStyle;
    private Double dailyBudget;

    @Column(name = "walking_radius_m")
    private Integer walkingRadiusM;

    private Boolean accessibilityNeeds;

    private LocalDateTime createdAt;
}
