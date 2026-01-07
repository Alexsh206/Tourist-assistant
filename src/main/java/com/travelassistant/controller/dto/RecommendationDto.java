package com.travelassistant.controller.dto;

import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationDto {

    private String osmType;
    private Long osmId;

    private String name;
    private String category;
    private Double latitude;
    private Double longitude;
    private Double score;
    private String source;

    private String address;
    private String website;
    private String phone;
    private String openingHours;
    private Boolean wheelchair;

    private Double estimatedCostEur;
    private String costLevel;

    private Map<String, String> tags;
}
