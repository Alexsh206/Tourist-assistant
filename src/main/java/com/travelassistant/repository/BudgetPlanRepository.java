package com.travelassistant.repository;

import com.travelassistant.model.BudgetPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BudgetPlanRepository extends JpaRepository<BudgetPlan, UUID> {

    List<BudgetPlan> findByUserId(UUID userId);
}
