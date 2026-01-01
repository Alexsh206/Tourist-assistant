package com.travelassistant.controller;

import com.travelassistant.controller.dto.UserMeResponse;
import com.travelassistant.controller.dto.auth.RegisterRequest;
import com.travelassistant.model.User;
import com.travelassistant.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public User getUser(@PathVariable UUID id) {
        return userService.getById(id);
    }

    public User createUser(@RequestBody RegisterRequest request) {
        User user = new User();
        user.setEmail(request.getEmail());


        return userService.createUser(user, request.getPassword());
    }

    @GetMapping("/me")
    public UserMeResponse getMe() {

        User user = userService.getCurrentUser();

        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt(),
                user.getLastLogin()
        );
    }
}
