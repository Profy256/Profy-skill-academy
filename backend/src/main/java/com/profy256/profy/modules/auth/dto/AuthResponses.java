package com.profy256.profy.modules.auth.dto;

import java.util.UUID;

public class AuthResponses {

    public record TokenPairResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            int expiresIn
    ) {}

    public record AdminUserResponse(
            UUID id,
            String email,
            String name,
            String role
    ) {}

    public record AdminLoginResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            int expiresIn,
            AdminUserResponse adminUser
    ) {}
}
