package com.travelassistant.controller.dto;

import lombok.Data;

@Data
public class AiRouteRequestDto {
    private Double latitude;
    private Double longitude;
    private Integer desiredDurationMinutes;
    private Double maxBudget;
    private String routeStyle;
}