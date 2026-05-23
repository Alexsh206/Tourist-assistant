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
public class RecommendationResponseDto {
    private String weatherKind;
    private String weatherMessage;
    private String timeOfDay;
    private String timeMessage;
    private List<RecommendationDto> recommendations;
}