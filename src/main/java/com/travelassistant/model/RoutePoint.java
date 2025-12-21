package com.travelassistant.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "route_points")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoutePoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @ManyToOne
    @JoinColumn(name = "place_id")
    private Place place;

    private Integer sequence;
}
