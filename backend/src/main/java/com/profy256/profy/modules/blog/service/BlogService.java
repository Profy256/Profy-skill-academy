package com.profy256.profy.modules.blog.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profy256.profy.modules.auth.entity.AdminUser;
import com.profy256.profy.modules.auth.repository.AdminUserRepository;
import com.profy256.profy.modules.blog.dto.BlogRequests.BlogPostRequest;
import com.profy256.profy.modules.blog.dto.BlogResponses.AdminPost;
import com.profy256.profy.modules.blog.dto.BlogResponses.PostDetail;
import com.profy256.profy.modules.blog.dto.BlogResponses.PostSummary;
import com.profy256.profy.modules.blog.entity.BlogPost;
import com.profy256.profy.modules.blog.repository.BlogPostRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ConflictException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Blog authoring and publishing.
 *
 * The API only ever ships Markdown + SEO fields; rendering (marked) and
 * sanitising happen in the web app, so an authoring bug can never inject HTML
 * into the site and the marketing site stays free of a CMS dependency.
 */
@Service
public class BlogService {

    private static final Logger log = LoggerFactory.getLogger(BlogService.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final int WORDS_PER_MINUTE = 200;
    private static final String PUBLISHED = "published";

    private final BlogPostRepository repository;
    private final AdminUserRepository adminUserRepository;

    public BlogService(BlogPostRepository repository, AdminUserRepository adminUserRepository) {
        this.repository = repository;
        this.adminUserRepository = adminUserRepository;
    }

    // ═══════════════════════════════════════════════════════════════
    //  Public reads
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<PostSummary> listPublished(String tag, Pageable pageable) {
        Page<BlogPost> page = tag == null || tag.isBlank()
                ? repository.findByStatusOrderByPublishedAtDesc(PUBLISHED, pageable)
                : repository.findPublishedByTag(tag.trim(), pageable);
        return page.map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public PostDetail getBySlug(String slug) {
        BlogPost post = repository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("No post with that slug"));
        if (!PUBLISHED.equals(post.getStatus())) {
            throw new ResourceNotFoundException("No post with that slug");
        }
        return toDetail(post);
    }

    @Transactional(readOnly = true)
    public List<String> publishedSlugs() {
        return repository.findByStatusOrderByPublishedAtDesc(PUBLISHED, Pageable.unpaged())
                .map(BlogPost::getSlug)
                .getContent();
    }

    // ═══════════════════════════════════════════════════════════════
    //  Admin
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<AdminPost> listAdmin(String status, Pageable pageable) {
        Page<BlogPost> page = status == null || status.isBlank() || "all".equalsIgnoreCase(status)
                ? repository.findAllByOrderByUpdatedAtDesc(pageable)
                : repository.findByStatusOrderByUpdatedAtDesc(status.toLowerCase(Locale.ROOT), pageable);
        return page.map(this::toAdmin);
    }

    @Transactional(readOnly = true)
    public AdminPost getAdmin(String id) {
        return toAdmin(require(UUID.fromString(id)));
    }

    @Transactional
    public AdminPost create(BlogPostRequest request, UUID adminUserId) {
        BlogPost post = new BlogPost();
        post.setSlug(resolveSlug(request));
        apply(post, request);
        post.setAuthorId(adminUserId);
        normalizeStatus(post, request.status());
        BlogPost saved = repository.save(post);
        log.info("Blog post created: {} by {}", saved.getSlug(), adminUserId);
        return toAdmin(saved);
    }

    @Transactional
    public AdminPost update(String id, BlogPostRequest request, UUID adminUserId) {
        BlogPost post = require(UUID.fromString(id));
        if (request.slug() != null && !request.slug().isBlank()) {
            String slug = slugify(request.slug());
            if (!slug.equals(post.getSlug()) && repository.existsBySlug(slug)) {
                throw new ConflictException("A post with that slug already exists");
            }
            post.setSlug(slug);
        }
        apply(post, request);
        post.setAuthorId(adminUserId);
        normalizeStatus(post, request.status());
        return toAdmin(repository.save(post));
    }

    @Transactional
    public AdminPost updateStatus(String id, String status, UUID adminUserId) {
        BlogPost post = require(UUID.fromString(id));
        post.setStatus(status.toLowerCase(Locale.ROOT));
        post.setAuthorId(adminUserId);
        if (PUBLISHED.equals(post.getStatus()) && post.getPublishedAt() == null) {
            post.setPublishedAt(Instant.now());
        }
        return toAdmin(repository.save(post));
    }

    @Transactional
    public void delete(String id) {
        repository.delete(require(UUID.fromString(id)));
    }

    // ═══════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════

    private BlogPost require(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
    }

    private void apply(BlogPost post, BlogPostRequest request) {
        if (request.title() != null && !request.title().isBlank()) {
            post.setTitle(request.title().trim());
        }
        post.setExcerpt(trimOrNull(request.excerpt()));
        if (request.contentMd() != null) post.setContentMd(request.contentMd());
        post.setCoverImageUrl(trimOrNull(request.coverImageUrl()));
        post.setMetaTitle(trimOrNull(request.metaTitle()));
        post.setMetaDescription(trimOrNull(request.metaDescription()));
        if (request.tags() != null) post.setTags(writeTags(normalizeTags(request.tags())));
    }

    private void normalizeStatus(BlogPost post, String requested) {
        String status = requested == null || requested.isBlank()
                ? post.getStatus()
                : requested.toLowerCase(Locale.ROOT);
        if (!List.of("draft", "published", "archived").contains(status)) {
            throw new BadRequestException("Unknown status: " + status);
        }
        post.setStatus(status);
        if (PUBLISHED.equals(status)) {
            if (post.getPublishedAt() == null) post.setPublishedAt(Instant.now());
        } else if ("draft".equals(status)) {
            // Un-publishing keeps history rather than losing the date.
            post.setPublishedAt(null);
        }
    }

    private String resolveSlug(BlogPostRequest request) {
        String raw = (request.slug() != null && !request.slug().isBlank())
                ? request.slug() : request.title();
        String slug = slugify(raw);
        if (repository.existsBySlug(slug)) throw new ConflictException("A post with that slug already exists");
        return slug;
    }

    private String slugify(String value) {
        if (value == null) throw new BadRequestException("A title or slug is required");
        String slug = value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (slug.isEmpty()) throw new BadRequestException("Could not derive a slug from: " + value);
        return slug;
    }

    private List<String> normalizeTags(List<String> tags) {
        LinkedHashSet<String> out = new LinkedHashSet<>();
        for (String tag : tags) {
            if (tag == null) continue;
            String t = tag.trim().toLowerCase(Locale.ROOT);
            if (!t.isEmpty()) out.add(t);
        }
        return new ArrayList<>(out);
    }

    private String writeTags(List<String> tags) {
        try {
            return MAPPER.writeValueAsString(tags);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private List<String> readTags(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return MAPPER.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private String readingTime(String contentMd) {
        if (contentMd == null || contentMd.isBlank()) return "1 min read";
        int words = contentMd.trim().split("\\s+").length;
        int minutes = Math.max(1, (int) Math.ceil(words / (double) WORDS_PER_MINUTE));
        return minutes + " min read";
    }

    private String authorName(UUID adminId) {
        if (adminId == null) return null;
        return adminUserRepository.findById(adminId).map(AdminUser::getName).orElse(null);
    }

    private PostSummary toSummary(BlogPost post) {
        return new PostSummary(
                post.getSlug(),
                post.getTitle(),
                post.getExcerpt(),
                post.getCoverImageUrl(),
                readTags(post.getTags()),
                readingTime(post.getContentMd()),
                post.getPublishedAt(),
                authorName(post.getAuthorId())
        );
    }

    private PostDetail toDetail(BlogPost post) {
        return new PostDetail(
                post.getSlug(),
                post.getTitle(),
                post.getExcerpt(),
                post.getContentMd(),
                post.getCoverImageUrl(),
                readTags(post.getTags()),
                post.getMetaTitle(),
                post.getMetaDescription(),
                readingTime(post.getContentMd()),
                post.getPublishedAt(),
                post.getUpdatedAt(),
                authorName(post.getAuthorId())
        );
    }

    private AdminPost toAdmin(BlogPost post) {
        return new AdminPost(
                post.getId().toString(),
                post.getSlug(),
                post.getTitle(),
                post.getExcerpt(),
                post.getContentMd(),
                post.getCoverImageUrl(),
                readTags(post.getTags()),
                post.getMetaTitle(),
                post.getMetaDescription(),
                post.getStatus(),
                post.getPublishedAt(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                authorName(post.getAuthorId())
        );
    }

    private String trimOrNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}
