package com.travelassistant.controller;

import com.travelassistant.model.BudgetPlan;
import com.travelassistant.service.BudgetService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    @PostMapping
    public BudgetPlan create(@RequestBody BudgetPlan plan) {
        return budgetService.createPlan(plan);
    }

    @GetMapping("/{userId}")
    public List<BudgetPlan> getUserBudgets(@PathVariable UUID userId) {
        return budgetService.getUserPlans(userId);
    }
}
