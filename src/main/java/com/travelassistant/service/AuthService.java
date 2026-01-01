package com.travelassistant.service;

import com.travelassistant.controller.dto.auth.AuthResponse;
import com.travelassistant.controller.dto.auth.LoginRequest;
import com.travelassistant.controller.dto.auth.RegisterRequest;
import com.travelassistant.model.User;
import com.travelassistant.repository.UserRepository;
import com.travelassistant.config.JwtConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtConfig jwtConfig;

    /* ===================== REGISTER ===================== */

    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        String token = jwtConfig.createToken(
                user.getId().toString(),
                user.getRole()
        );

        return new AuthResponse(token, user.getRole(), user.getId().toString());
    }

    /* ===================== LOGIN ===================== */

    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtConfig.createToken(
                user.getId().toString(),
                user.getRole()
        );

        return new AuthResponse(token, user.getRole(), user.getId().toString());
    }
}
