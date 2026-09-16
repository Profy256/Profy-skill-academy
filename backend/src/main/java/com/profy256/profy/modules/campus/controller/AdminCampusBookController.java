package com.profy256.profy.modules.campus.controller;

import com.profy256.profy.modules.campus.dto.CampusBookDto.CampusBookListResponse;
import com.profy256.profy.modules.campus.dto.CampusBookDto.SyncResult;
import com.profy256.profy.modules.campus.dto.CampusBookDto.UpdateSettingsRequest;
import com.profy256.profy.modules.campus.service.CampusLibraryService;
import com.profy256.profy.platform.audit.Audited;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/campus-books")
public class AdminCampusBookController {

    private final CampusLibraryService campusLibraryService;

    public AdminCampusBookController(CampusLibraryService campusLibraryService) {
        this.campusLibraryService = campusLibraryService;
    }

    @GetMapping
    public ResponseEntity<CampusBookListResponse> listBooks(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(campusLibraryService.adminListBooks(page, Math.min(limit, 100), search));
    }

    @PutMapping("/{campusBookId}/settings")
    @Audited
    public ResponseEntity<Map<String, String>> updateSettings(
            @PathVariable String campusBookId,
            @RequestBody UpdateSettingsRequest request) {
        campusLibraryService.updateSettings(campusBookId, request);
        return ResponseEntity.ok(Map.of("status", "updated"));
    }

    @PostMapping("/sync")
    @Audited
    public ResponseEntity<SyncResult> sync() {
        SyncResult result = campusLibraryService.syncBooks();
        return ResponseEntity.ok(result);
    }
}
