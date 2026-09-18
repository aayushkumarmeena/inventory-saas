package com.inventory.exception;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success",false,"message",e.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusiness(BusinessException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("success",false,"message",e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException e) {
        List<String> errors = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField()+": "+f.getDefaultMessage()).collect(Collectors.toList());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("success",false,"message","Validation failed","errors",errors));
    }

    @ExceptionHandler({BadCredentialsException.class, AccessDeniedException.class})
    public ResponseEntity<?> handleAuth(RuntimeException e) {
        // Same generic message for both "wrong password" and "no permission" so callers
        // can't use response differences to enumerate valid accounts/roles.
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success",false,"message","Access denied"));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<?> handleRateLimit(RateLimitExceededException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("success",false,"message",e.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrity(DataIntegrityViolationException e) {
        // Never surface raw constraint/SQL text (leaks schema/table names) to the client.
        log.warn("Data integrity violation: {}", e.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("success",false,"message","This action conflicts with existing data (duplicate or referenced record)."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneral(Exception e) {
        // Log the real exception (with stack trace) server-side only. The client never sees
        // e.getMessage() — that previously leaked internals (SQL errors, file paths, class
        // names) to anyone who could trigger a 500.
        log.error("Unhandled exception", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success",false,"message","Something went wrong. Please try again."));
    }
}
