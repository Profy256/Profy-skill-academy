package com.profy256.profy.modules.progress.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ProgressRequests {

    public record ProgressRequest(
            @NotBlank(message = "status is required") String status
    ) {}

    public record QuizAttemptRequest(
            @NotNull(message = "score is required") Integer score,
            @NotNull(message = "total is required") Integer total
    ) {}
}
