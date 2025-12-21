package com.travelassistant.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_interests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(UserInterestId.class)
public class UserInterest {

    @Id
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Id
    @ManyToOne
    @JoinColumn(name = "interest_id")
    private Interest interest;

    @Column(nullable = false)
    private Integer weight;
}
