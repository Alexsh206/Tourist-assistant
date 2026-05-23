package com.travelassistant.service;

import com.travelassistant.model.TimeOfDayKind;
import org.springframework.stereotype.Service;

import java.time.LocalTime;

@Service
public class TimeContextService {

    public TimeOfDayKind getCurrentTimeOfDay() {
        int hour = LocalTime.now().getHour();

        if (hour >= 6 && hour < 12) {
            return TimeOfDayKind.MORNING;
        }

        if (hour >= 12 && hour < 18) {
            return TimeOfDayKind.DAY;
        }

        if (hour >= 18 && hour < 22) {
            return TimeOfDayKind.EVENING;
        }

        return TimeOfDayKind.NIGHT;
    }

    public String buildTimeMessage(TimeOfDayKind timeOfDayKind) {
        return switch (timeOfDayKind) {
            case MORNING -> "Morning recommendations focus on light walks, coffee places and calm locations";
            case DAY -> "Daytime recommendations include museums, attractions, parks and active city exploration";
            case EVENING -> "Evening recommendations focus on restaurants, cafes, viewpoints and relaxed walks";
            case NIGHT -> "Night recommendations are limited to safer and more suitable places";
        };
    }
}