package com.travelassistant.controller.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class WeatherDto {
    private Double tempC;
    private Double windMs;
    private Integer weatherCode;
    private String summary;
    private Boolean isDay;
}