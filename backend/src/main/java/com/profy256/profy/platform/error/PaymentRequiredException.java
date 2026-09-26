package com.profy256.profy.platform.error;

public class PaymentRequiredException extends RuntimeException {
    public PaymentRequiredException(String message) { super(message); }
}
