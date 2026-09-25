package com.profy256.profy.platform.error;

public class AiUnavailableException extends RuntimeException {

    public enum Reason {
        /** Key rejected by provider (401/403) — rotate to another key. */
        AUTH,
        /** Provider rate limit (429) — rotate to another key, cool this one down briefly. */
        RATE_LIMIT,
        /** Network / provider outage — key rotation cannot fix this. */
        NETWORK,
        /** Anything else (bad model, malformed response, ...). */
        OTHER
    }

    private final Reason reason;

    public AiUnavailableException(String message) {
        this(message, Reason.OTHER);
    }

    public AiUnavailableException(String message, Reason reason) {
        super(message);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
