package com.travelassistant.model;

import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class PlaceInterestId implements Serializable {

    private UUID place;
    private Integer interest;
}
