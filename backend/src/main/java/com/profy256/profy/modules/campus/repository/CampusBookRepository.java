package com.profy256.profy.modules.campus.repository;

import com.profy256.profy.modules.campus.entity.CampusBook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CampusBookRepository extends JpaRepository<CampusBook, UUID> {

    Optional<CampusBook> findByCampusBookId(String campusBookId);

    boolean existsByCampusBookId(String campusBookId);

    Page<CampusBook> findByCategorySlugOrderByTitleAsc(String categorySlug, Pageable pageable);

    Page<CampusBook> findByIsAvailableTrueOrderByTitleAsc(Pageable pageable);

    @Query("SELECT b FROM CampusBook b WHERE LOWER(b.title) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(b.author) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<CampusBook> searchByTitleOrAuthor(@Param("query") String query, Pageable pageable);

    @Query("SELECT b FROM CampusBook b WHERE LOWER(b.title) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(b.author) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<CampusBook> searchByTitleOrAuthor(@Param("query") String query);

    List<CampusBook> findByCategorySlug(String categorySlug);

    @Query("SELECT DISTINCT b.categorySlug FROM CampusBook b WHERE b.categorySlug IS NOT NULL ORDER BY b.categorySlug")
    List<String> findDistinctCategorySlugs();

    @Query("SELECT DISTINCT b.categoryName FROM CampusBook b WHERE b.categoryName IS NOT NULL ORDER BY b.categoryName")
    List<String> findDistinctCategoryNames();

    long countByCategorySlug(String categorySlug);
}
