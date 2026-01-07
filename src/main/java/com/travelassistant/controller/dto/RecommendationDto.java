package com.travelassistant.controller.dto;

import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationDto {

    // OSM identity
    private String osmType;   // node/way/relation
    private Long osmId;

    // core
    private String name;
    private String category;
    private Double latitude;
    private Double longitude;
    private Double score;
    private String source;

    // extra info
    private String address;
    private String website;
    private String phone;
    private String openingHours;
    private Boolean wheelchair;

    // optional: full tags (можеш прибрати, якщо не треба)
    private Map<String, String> tags;
}
