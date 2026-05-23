package com.travelassistant.controller.dto;

import lombok.Data;

@Data
public class RecommendationRequestDto {
    private Double latitude;
    private Double longitude;
    private Boolean useWeatherContext;
    private Boolean useTimeContext;
}
