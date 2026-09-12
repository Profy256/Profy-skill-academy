package com.profy256.profy.modules.auth.controller;

import com.profy256.profy.modules.auth.dto.AuthResponses.AdminLoginResponse;
import com.profy256.profy.modules.auth.service.AdminAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/auth")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @PostMapping("/login")
    public ResponseEntity<AdminLoginResponse> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        return ResponseEntity.ok(adminAuthService.login(email, password));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AdminLoginResponse> refresh(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminAuthService.refresh(body.get("refreshToken")));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> logout(@RequestBody Map<String, String> body) {
        adminAuthService.logout(body.get("refreshToken"));
        return ResponseEntity.noContent().build();
    }
}
