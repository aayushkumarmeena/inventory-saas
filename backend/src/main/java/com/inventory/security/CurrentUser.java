package com.inventory.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Convenience accessor for the authenticated user, populated by
 * JwtAuthFilter into the Spring Security context (principal = userId).
 * Used for audit trail (who created/cancelled a sale, purchase, etc).
 */
public final class CurrentUser {

    private CurrentUser() {}

    public static Long id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long)) return null;
        return (Long) auth.getPrincipal();
    }

    public static String role() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
                .orElse(null);
    }
}
