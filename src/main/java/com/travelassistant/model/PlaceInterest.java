package com.travelassistant.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "place_interests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(PlaceInterestId.class)
public class PlaceInterest {

    @Id
    @ManyToOne
    @JoinColumn(name = "place_id")
    private Place place;

    @Id
    @ManyToOne
    @JoinColumn(name = "interest_id")
    private Interest interest;

    @Column(nullable = false)
    private Integer relevance;
}
