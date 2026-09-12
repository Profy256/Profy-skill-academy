package com.profy256.profy.modules.ai.service;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;

class CircuitBreakerTest {

    private final CircuitBreaker circuitBreaker = new CircuitBreaker();

    @Test
    void isOpen_initiallyFalse() {
        assertThat(circuitBreaker.isOpen("user-1")).isFalse();
    }

    @Test
    void recordFailure_opensAfterFiveFailures() {
        String key = "user-2";

        for (int i = 0; i < 4; i++) {
            circuitBreaker.recordFailure(key);
            assertThat(circuitBreaker.isOpen(key)).isFalse();
        }

        circuitBreaker.recordFailure(key);
        assertThat(circuitBreaker.isOpen(key)).isTrue();
    }

    @Test
    void recordSuccess_resetsFailureCount() {
        String key = "user-3";

        for (int i = 0; i < 4; i++) {
            circuitBreaker.recordFailure(key);
        }

        circuitBreaker.recordSuccess(key);

        circuitBreaker.recordFailure(key);
        assertThat(circuitBreaker.isOpen(key)).isFalse();
    }

    @Test
    void isOpen_closesAfterResetWindow() throws Exception {
        String key = "user-4";

        for (int i = 0; i < 5; i++) {
            circuitBreaker.recordFailure(key);
        }
        assertThat(circuitBreaker.isOpen(key)).isTrue();

        forceSetLastFailureTime(key, System.currentTimeMillis() - 61_000);

        assertThat(circuitBreaker.isOpen(key)).isFalse();
    }

    @Test
    void isOpen_staysOpenWithinResetWindow() {
        String key = "user-5";

        for (int i = 0; i < 5; i++) {
            circuitBreaker.recordFailure(key);
        }

        assertThat(circuitBreaker.isOpen(key)).isTrue();
    }

    @Test
    void independentKeys_areIsolated() {
        circuitBreaker.recordFailure("user-A");
        circuitBreaker.recordFailure("user-A");
        circuitBreaker.recordFailure("user-A");
        circuitBreaker.recordFailure("user-A");
        circuitBreaker.recordFailure("user-A");

        assertThat(circuitBreaker.isOpen("user-A")).isTrue();
        assertThat(circuitBreaker.isOpen("user-B")).isFalse();
    }

    private void forceSetLastFailureTime(String key, long timeMs) throws Exception {
        Field statesField = CircuitBreaker.class.getDeclaredField("states");
        statesField.setAccessible(true);
        @SuppressWarnings("unchecked")
        ConcurrentHashMap<String, Object> states =
                (ConcurrentHashMap<String, Object>) statesField.get(circuitBreaker);
        Object state = states.get(key);

        Field lastFailureField = state.getClass().getDeclaredField("lastFailureTime");
        lastFailureField.setAccessible(true);
        lastFailureField.setLong(state, timeMs);
    }
}
