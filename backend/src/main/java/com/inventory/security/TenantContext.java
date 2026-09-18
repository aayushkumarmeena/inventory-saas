package com.inventory.security;
public class TenantContext {
    private static final ThreadLocal<Long> CURRENT = new ThreadLocal<>();
    public static Long getCurrentTenant() { return CURRENT.get(); }
    public static void setCurrentTenant(Long id) { CURRENT.set(id); }
    public static void clear() { CURRENT.remove(); }
}
