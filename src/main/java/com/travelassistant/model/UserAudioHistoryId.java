package com.travelassistant.model;

import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserAudioHistoryId implements Serializable {

    private UUID user;
    private UUID audioGuide;
}
