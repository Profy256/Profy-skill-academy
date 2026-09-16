package com.profy256.profy.modules.campus.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profy256.profy.modules.campus.dto.CampusBookDto.*;
import com.profy256.profy.modules.campus.entity.CampusBook;
import com.profy256.profy.modules.campus.entity.CampusBookSettings;
import com.profy256.profy.modules.campus.repository.CampusBookRepository;
import com.profy256.profy.modules.campus.repository.CampusBookSettingsRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CampusLibraryService {

    private static final Logger log = LoggerFactory.getLogger(CampusLibraryService.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final String CACHE_PREFIX = "campus:books:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    private final CampusLibraryClient client;
    private final CampusBookRepository bookRepository;
    private final CampusBookSettingsRepository settingsRepository;
    private final StringRedisTemplate redisTemplate;

    public CampusLibraryService(CampusLibraryClient client,
                                CampusBookRepository bookRepository,
                                CampusBookSettingsRepository settingsRepository,
                                StringRedisTemplate redisTemplate) {
        this.client = client;
        this.bookRepository = bookRepository;
        this.settingsRepository = settingsRepository;
        this.redisTemplate = redisTemplate;
    }

    // ── Public: list books ─────────────────────────────────

    @Transactional(readOnly = true)
    public CampusBookListResponse listBooks(int page, int limit, String category, String search) {
        String cacheKey = buildCacheKey("list", page, limit, category, search);
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, CampusBookListResponse.class);
            } catch (Exception ignored) {}
        }

        // Try CampusLibrary API first, fall back to local cache
        CampusLibraryResponse apiResponse = client.listBooks(page, limit, category, search);

        List<CampusBookResponse> books;
        if (apiResponse.books() != null && !apiResponse.books().isEmpty()) {
            books = apiResponse.books().stream()
                    .map(this::toResponse)
                    .toList();

            // Cache the response
            try {
                CampusBookListResponse result = new CampusBookListResponse(
                        books, page, limit,
                        apiResponse.pagination().total(),
                        apiResponse.pagination().totalPages());
                redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), CACHE_TTL);
                return result;
            } catch (JsonProcessingException ignored) {}
        }

        // Fallback: serve from local DB cache
        books = listFromLocalCache(page, limit, category, search);
        return new CampusBookListResponse(books, page, limit, books.size(), 1);
    }

    // ── Public: get single book ────────────────────────────

    @Transactional(readOnly = true)
    public CampusBookResponse getBook(String campusBookId) {
        CampusLibraryBook apiBook = client.getBook(campusBookId);
        if (apiBook != null) {
            return toResponse(apiBook);
        }

        // Fallback to local cache
        CampusBook local = bookRepository.findByCampusBookId(campusBookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found"));
        return toResponseFromEntity(local);
    }

    // ── Public: categories ─────────────────────────────────

    @Transactional(readOnly = true)
    public List<CampusBookCategoryResponse> getCategories() {
        List<CampusLibraryCategory> apiCategories = client.getCategories();
        if (!apiCategories.isEmpty()) {
            return apiCategories.stream()
                    .map(c -> new CampusBookCategoryResponse(
                            c.name(), c.slug(),
                            bookRepository.countByCategorySlug(c.slug())))
                    .toList();
        }

        // Fallback: derive from local cache
        List<String> slugs = bookRepository.findDistinctCategorySlugs();
        return slugs.stream()
                .map(slug -> new CampusBookCategoryResponse(
                        slug, slug, bookRepository.countByCategorySlug(slug)))
                .toList();
    }

    // ── Admin: update settings ─────────────────────────────

    @Transactional
    public void updateSettings(String campusBookId, UpdateSettingsRequest request) {
        CampusBookSettings settings = settingsRepository.findByCampusBookId(campusBookId)
                .orElseGet(() -> {
                    CampusBookSettings s = new CampusBookSettings();
                    s.setCampusBookId(campusBookId);
                    return s;
                });

        if (request.isPremium() != null) settings.setIsPremium(request.isPremium());
        if (request.isFeatured() != null) settings.setIsFeatured(request.isFeatured());
        if (request.customNote() != null) settings.setCustomNote(request.customNote());

        settingsRepository.save(settings);
        invalidateCache(campusBookId);
    }

    // ── Admin: sync books from CampusLibrary ───────────────

    @Transactional
    public SyncResult syncBooks() {
        int added = 0, updated = 0, removed = 0;
        int page = 1;
        int pageSize = 100;
        boolean hasMore = true;

        while (hasMore) {
            CampusLibraryResponse response = client.listBooks(page, pageSize, null, null);
            if (response.books() == null || response.books().isEmpty()) {
                hasMore = false;
                break;
            }

            for (CampusLibraryBook book : response.books()) {
                Optional<CampusBook> existing = bookRepository.findByCampusBookId(book.id());
                if (existing.isPresent()) {
                    updateBookEntity(existing.get(), book);
                    bookRepository.save(existing.get());
                    updated++;
                } else {
                    CampusBook newBook = createBookEntity(book);
                    bookRepository.save(newBook);
                    added++;
                }
            }

            page++;
            hasMore = response.pagination() != null && page <= response.pagination().totalPages();
        }

        // Remove books no longer in CampusLibrary
        List<CampusBook> localBooks = bookRepository.findAll();
        Set<String> remoteIds = new HashSet<>();
        for (int p = 1; p < page; p++) {
            CampusLibraryResponse r = client.listBooks(p, pageSize, null, null);
            if (r.books() != null) {
                r.books().forEach(b -> remoteIds.add(b.id()));
            }
        }

        if (!remoteIds.isEmpty()) {
            for (CampusBook local : localBooks) {
                if (!remoteIds.contains(local.getCampusBookId())) {
                    bookRepository.delete(local);
                    removed++;
                }
            }
        }

        String msg = "Sync complete: %d added, %d updated, %d removed".formatted(added, updated, removed);
        log.info(msg);
        return new SyncResult(added, updated, removed, msg);
    }

    // ── Admin: list with settings ──────────────────────────

    @Transactional(readOnly = true)
    public CampusBookListResponse adminListBooks(int page, int limit, String search) {
        Page<CampusBook> books;
        if (search != null && !search.isBlank()) {
            books = bookRepository.searchByTitleOrAuthor(search, PageRequest.of(page - 1, limit));
        } else {
            books = bookRepository.findAll(PageRequest.of(page - 1, limit));
        }

        List<CampusBookResponse> responses = books.getContent().stream()
                .map(this::toResponseFromEntity)
                .toList();

        return new CampusBookListResponse(
                responses, page, limit,
                books.getTotalElements(),
                books.getTotalPages());
    }

    // ── Helpers ────────────────────────────────────────────

    private CampusBookResponse toResponse(CampusLibraryBook book) {
        boolean isPremium = settingsRepository.existsByCampusBookIdAndIsPremiumTrue(book.id());
        CampusBookSettings settings = settingsRepository.findByCampusBookId(book.id()).orElse(null);

        return new CampusBookResponse(
                null,
                book.id(),
                book.title(),
                book.author(),
                book.description(),
                book.coverUrl(),
                book.category() != null ? book.category().name() : null,
                book.category() != null ? book.category().slug() : null,
                book.language(),
                book.pageCount(),
                book.publishedYear(),
                book.formats() != null ? book.formats() : List.of("pdf"),
                book.rating(),
                book.ratingCount() != null ? book.ratingCount() : 0,
                isPremium,
                book.isAvailable() != null ? book.isAvailable() : true,
                settings != null ? settings.getCustomNote() : null
        );
    }

    private CampusBookResponse toResponseFromEntity(CampusBook book) {
        boolean isPremium = settingsRepository.existsByCampusBookIdAndIsPremiumTrue(book.getCampusBookId());
        CampusBookSettings settings = settingsRepository.findByCampusBookId(book.getCampusBookId()).orElse(null);

        List<String> formats = List.of("pdf");
        if (book.getFormats() != null) {
            try {
                formats = objectMapper.readValue(book.getFormats(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            } catch (Exception ignored) {}
        }

        return new CampusBookResponse(
                book.getId(),
                book.getCampusBookId(),
                book.getTitle(),
                book.getAuthor(),
                book.getDescription(),
                book.getCoverUrl(),
                book.getCategoryName(),
                book.getCategorySlug(),
                book.getLanguage(),
                book.getPageCount(),
                book.getPublishedYear(),
                formats,
                book.getRating() != null ? book.getRating().doubleValue() : null,
                book.getRatingCount(),
                isPremium,
                book.getIsAvailable(),
                settings != null ? settings.getCustomNote() : null
        );
    }

    private CampusBook createBookEntity(CampusLibraryBook book) {
        CampusBook entity = new CampusBook();
        entity.setCampusBookId(book.id());
        updateBookEntity(entity, book);
        return entity;
    }

    private void updateBookEntity(CampusBook entity, CampusLibraryBook book) {
        entity.setTitle(book.title());
        entity.setAuthor(book.author());
        entity.setDescription(book.description());
        entity.setCoverUrl(book.coverUrl());
        entity.setCategorySlug(book.category() != null ? book.category().slug() : null);
        entity.setCategoryName(book.category() != null ? book.category().name() : null);
        entity.setLanguage(book.language());
        entity.setPageCount(book.pageCount());
        entity.setPublishedYear(book.publishedYear());
        entity.setRating(book.rating() != null ? BigDecimal.valueOf(book.rating()) : null);
        entity.setRatingCount(book.ratingCount());
        entity.setIsAvailable(book.isAvailable() != null ? book.isAvailable() : true);
        entity.setLastSyncedAt(Instant.now());

        if (book.formats() != null) {
            try {
                entity.setFormats(objectMapper.writeValueAsString(book.formats()));
            } catch (JsonProcessingException ignored) {
                entity.setFormats("[\"pdf\"]");
            }
        }
    }

    private List<CampusBookResponse> listFromLocalCache(int page, int limit, String category, String search) {
        Page<CampusBook> books;
        if (search != null && !search.isBlank()) {
            books = bookRepository.searchByTitleOrAuthor(search, PageRequest.of(page - 1, limit));
        } else if (category != null && !category.isBlank()) {
            books = bookRepository.findByCategorySlugOrderByTitleAsc(category, PageRequest.of(page - 1, limit));
        } else {
            books = bookRepository.findByIsAvailableTrueOrderByTitleAsc(PageRequest.of(page - 1, limit));
        }
        return books.getContent().stream().map(this::toResponseFromEntity).toList();
    }

    private String buildCacheKey(String action, int page, int limit, String category, String search) {
        return CACHE_PREFIX + action + ":" + page + ":" + limit
                + ":" + (category != null ? category : "")
                + ":" + (search != null ? search : "");
    }

    private void invalidateCache(String campusBookId) {
        Set<String> keys = redisTemplate.keys(CACHE_PREFIX + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
