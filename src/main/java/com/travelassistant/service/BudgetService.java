package com.travelassistant.service;

import com.travelassistant.model.BudgetPlan;
import com.travelassistant.repository.BudgetPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetPlanRepository planRepository;

    public BudgetPlan createPlan(BudgetPlan plan) {
        plan.setCreatedAt(LocalDateTime.now());
        return planRepository.save(plan);
    }

    public List<BudgetPlan> getUserPlans(UUID userId) {
        return planRepository.findByUserId(userId);
    }
}
