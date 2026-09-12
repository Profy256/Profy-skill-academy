package com.profy256.profy.modules.ai.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class CircuitBreaker {

    private static final int FAILURE_THRESHOLD = 5;
    private static final long RESET_WINDOW_MS = 60_000;

    private final ConcurrentHashMap<String, State> states = new ConcurrentHashMap<>();

    public boolean isOpen(String key) {
        State state = states.computeIfAbsent(key, k -> new State());
        if (state.failures < FAILURE_THRESHOLD) {
            return false;
        }
        if (System.currentTimeMillis() - state.lastFailureTime > RESET_WINDOW_MS) {
            state.failures = 0;
            return false;
        }
        return true;
    }

    public void recordSuccess(String key) {
        State state = states.computeIfAbsent(key, k -> new State());
        state.failures = 0;
    }

    public void recordFailure(String key) {
        State state = states.computeIfAbsent(key, k -> new State());
        state.failures++;
        state.lastFailureTime = System.currentTimeMillis();
    }

    private static class State {
        int failures = 0;
        long lastFailureTime = 0;
    }
}
