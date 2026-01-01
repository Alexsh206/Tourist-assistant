package com.travelassistant.controller;

import com.travelassistant.controller.dto.auth.AuthResponse;
import com.travelassistant.controller.dto.auth.LoginRequest;
import com.travelassistant.controller.dto.auth.RegisterRequest;
import com.travelassistant.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /* ===================== REGISTER ===================== */

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(authService.register(request));
    }

    /* ===================== LOGIN ===================== */

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(authService.login(request));
    }
}
