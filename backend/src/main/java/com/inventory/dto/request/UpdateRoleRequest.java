package com.inventory.dto.request;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateRoleRequest {
    @Pattern(regexp = "ADMIN|MANAGER|STAFF")
    private String role;
}
