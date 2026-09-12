package com.profy256.profy.platform.error;

public class RateLimitException extends RuntimeException {
    public RateLimitException(String message) { super(message); }
}
