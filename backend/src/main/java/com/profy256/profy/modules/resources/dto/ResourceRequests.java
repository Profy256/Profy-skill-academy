package com.profy256.profy.modules.resources.dto;

import java.util.List;

public class ResourceRequests {

    public record CreateResourceRequest(
            String nodeId,
            String title,
            String description,
            String fileName,
            String fileSize,
            String fileUrl,
            Boolean allowDownload,
            Boolean pageFlipEnabled
    ) {}

    public record UpdateResourceRequest(
            String title,
            String description,
            Boolean allowDownload,
            Boolean pageFlipEnabled,
            Boolean isActive
    ) {}
}
