package com.profy256.profy.modules.blog.repository;

import com.profy256.profy.modules.blog.entity.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, UUID> {

    Optional<BlogPost> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /** Public list — published posts only, newest first. */
    Page<BlogPost> findByStatusOrderByPublishedAtDesc(String status, Pageable pageable);

    /**
     * Public list filtered by tag — published only.
     *
     * Native SQL: {@code tags} is a {@code jsonb} array, which JPQL cannot
     * predicate against (no string operators on a JSON-typed attribute). The
     * element match is exact and case-insensitive; {@code jsonb_typeof} keeps
     * malformed rows from throwing at query time.
     */
    @Query(
            value = """
                    SELECT * FROM blog_posts p
                    WHERE p.status = 'published'
                      AND jsonb_typeof(p.tags) = 'array'
                      AND EXISTS (
                          SELECT 1 FROM jsonb_array_elements_text(p.tags) t
                          WHERE lower(t) = lower(:tag)
                      )
                    ORDER BY p.published_at DESC NULLS LAST
                    """,
            countQuery = """
                    SELECT COUNT(*) FROM blog_posts p
                    WHERE p.status = 'published'
                      AND jsonb_typeof(p.tags) = 'array'
                      AND EXISTS (
                          SELECT 1 FROM jsonb_array_elements_text(p.tags) t
                          WHERE lower(t) = lower(:tag)
                      )
                    """,
            nativeQuery = true)
    Page<BlogPost> findPublishedByTag(@Param("tag") String tag, Pageable pageable);

    /** Admin list, optionally filtered by status. */
    Page<BlogPost> findByStatusOrderByUpdatedAtDesc(String status, Pageable pageable);

    Page<BlogPost> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}
