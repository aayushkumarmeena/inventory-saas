package com.inventory.controller;

import com.inventory.dto.request.ChangePasswordRequest;
import com.inventory.dto.request.TeamMemberRequest;
import com.inventory.dto.request.UpdateRoleRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.ResetPasswordResponse;
import com.inventory.dto.response.TeamMemberResponse;
import com.inventory.security.CurrentUser;
import com.inventory.security.TenantContext;
import com.inventory.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/team")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TeamMemberResponse>>> list() {
        return ok("Team", teamService.list(tid()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TeamMemberResponse>> invite(@Valid @RequestBody TeamMemberRequest req) {
        return ok("Team member added", teamService.invite(tid(), req));
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TeamMemberResponse>> updateRole(@PathVariable Long id, @Valid @RequestBody UpdateRoleRequest req) {
        return ok("Role updated", teamService.updateRole(tid(), id, req));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TeamMemberResponse>> deactivate(@PathVariable Long id) {
        return ok("Member deactivated", teamService.setActive(tid(), id, false));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TeamMemberResponse>> activate(@PathVariable Long id) {
        return ok("Member activated", teamService.setActive(tid(), id, true));
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ResetPasswordResponse>> resetPassword(@PathVariable Long id) {
        return ok("Password reset", teamService.resetPassword(tid(), id));
    }

    @PostMapping("/me/change-password")
    public ResponseEntity<ApiResponse<Void>> changeOwnPassword(@Valid @RequestBody ChangePasswordRequest req) {
        teamService.changeOwnPassword(CurrentUser.id(), req);
        return ok("Password updated", null);
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String msg, T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());
    }
}
