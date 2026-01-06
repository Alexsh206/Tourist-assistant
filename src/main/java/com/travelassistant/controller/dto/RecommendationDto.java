package com.travelassistant.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class RecommendationDto {
    private UUID id;
    private String name;
    private String category;
    private Double latitude;
    private Double longitude;

    private Double score;
    private String source;
}
