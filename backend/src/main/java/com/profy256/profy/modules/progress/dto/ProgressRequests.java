package com.profy256.profy.modules.progress.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ProgressRequests {

    public record ProgressRequest(
            @NotBlank(message = "status is required") String status
    ) {}

    public record QuizAttemptRequest(
            @NotNull(message = "score is required")
            @Min(value = 0, message = "score must be 0 or more")
            Integer score,
            @NotNull(message = "total is required")
            @Min(value = 1, message = "total must be at least 1")
            Integer total
    ) {}
}
