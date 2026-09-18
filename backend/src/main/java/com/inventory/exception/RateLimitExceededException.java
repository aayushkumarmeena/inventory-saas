package com.inventory.exception;

/** Thrown when a caller exceeds an endpoint's allowed request rate. */
public class RateLimitExceededException extends RuntimeException {
    public RateLimitExceededException(String message) {
        super(message);
    }
}
