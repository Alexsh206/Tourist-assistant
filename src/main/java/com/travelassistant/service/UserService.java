package com.travelassistant.service;

import com.travelassistant.model.User;
import com.travelassistant.repository.UserRepository;
import com.travelassistant.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User createUser(User user, String rawPassword) {
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setCreatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User getById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User getCurrentUser() {

        UUID userId = SecurityUtils.getCurrentUserId();

        return userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalStateException("User not found"));
    }

    public boolean checkPassword(User user, String rawPassword) {
        return passwordEncoder.matches(rawPassword, user.getPasswordHash());
    }

    public void updateLastLogin(UUID userId) {
        User user = getById(userId);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
    }
}
