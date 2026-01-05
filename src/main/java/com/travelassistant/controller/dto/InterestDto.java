package com.travelassistant.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InterestDto {
    private Integer id;
    private String name;
    private String category;
}
