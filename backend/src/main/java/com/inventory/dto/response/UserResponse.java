package com.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private Long tenantId;
    private String tenantName;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
}
