package com.travelassistant.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRoutePointDto {
    private String placeName;
    private Double latitude;
    private Double longitude;
    private String category;
    private String reason;
    private Integer stopOrder;
    private Integer suggestedStayMinutes;
}