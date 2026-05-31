package org.cathori.backend.notice.model;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    boolean existsByArticleNo(String articleNo);

    @Modifying
    @Query("UPDATE Notice n SET n.viewCount = n.viewCount + 1 WHERE n.id = :id")
    void incrementViewCount(@Param("id") Long id);

    @Query(value = "SELECT MAX(CAST(article_no AS INTEGER)) FROM notices" +
            " WHERE source_type = :sourceType AND (source_id = :sourceId OR source_id IS NULL)",
            nativeQuery = true)
    Optional<Integer> findMaxArticleNo(@Param("sourceType") String sourceType, @Param("sourceId") String sourceId);

    @Query("SELECT n FROM Notice n WHERE n.aiSummaryStatus IN :statuses ORDER BY n.id ASC")
    List<Notice> findTop15ForSummary(@Param("statuses") List<String> statuses, Pageable pageable);

    @Query("SELECT n FROM Notice n WHERE n.id NOT IN :sentIds")
    List<Notice> findUnsentNotices(@Param("sentIds") Set<Long> sentIds);
}
