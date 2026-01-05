package com.travelassistant.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserInterestViewDto {
    private Integer interestId;
    private String interestName;
    private Integer weight;
}
