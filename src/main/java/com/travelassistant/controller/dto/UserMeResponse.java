package com.travelassistant.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class UserMeResponse {

    private UUID id;
    private String email;
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;
}