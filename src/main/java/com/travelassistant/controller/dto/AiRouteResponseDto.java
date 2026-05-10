package com.travelassistant.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRouteResponseDto {
    private String title;
    private String summary;
    private String weatherContext;
    private Integer estimatedDurationMinutes;
    private Double estimatedBudget;
    private List<AiRoutePointDto> points;
}