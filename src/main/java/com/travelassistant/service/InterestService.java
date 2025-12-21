package com.travelassistant.service;

import com.travelassistant.model.Interest;
import com.travelassistant.repository.InterestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InterestService {

    private final InterestRepository interestRepository;

    public List<Interest> getAllInterests() {
        return interestRepository.findAll();
    }

    public Interest getById(Integer id) {
        return interestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Interest not found"));
    }

    public Interest createInterest(Interest interest) {
        return interestRepository.save(interest);
    }
}
