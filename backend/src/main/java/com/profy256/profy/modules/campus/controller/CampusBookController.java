package com.profy256.profy.modules.campus.controller;

import com.profy256.profy.modules.campus.dto.CampusBookDto.CampusBookCategoryResponse;
import com.profy256.profy.modules.campus.dto.CampusBookDto.CampusBookListResponse;
import com.profy256.profy.modules.campus.dto.CampusBookDto.CampusBookResponse;
import com.profy256.profy.modules.campus.service.CampusLibraryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/campus-books")
public class CampusBookController {

    private final CampusLibraryService campusLibraryService;

    public CampusBookController(CampusLibraryService campusLibraryService) {
        this.campusLibraryService = campusLibraryService;
    }

    @GetMapping
    public ResponseEntity<CampusBookListResponse> listBooks(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(campusLibraryService.listBooks(page, Math.min(limit, 100), category, search));
    }

    @GetMapping("/{campusBookId}")
    public ResponseEntity<CampusBookResponse> getBook(@PathVariable String campusBookId) {
        return ResponseEntity.ok(campusLibraryService.getBook(campusBookId));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<CampusBookCategoryResponse>> getCategories() {
        return ResponseEntity.ok(campusLibraryService.getCategories());
    }
}
