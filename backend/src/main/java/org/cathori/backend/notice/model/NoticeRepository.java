package org.cathori.backend.notice.model;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    boolean existsByArticleNo(String articleNo);

    @Query(value = "SELECT MAX(CAST(article_no AS INTEGER)) FROM notices" +
            " WHERE source_type = :sourceType AND (source_id = :sourceId OR source_id IS NULL)",
            nativeQuery = true)
    Optional<Integer> findMaxArticleNo(@Param("sourceType") String sourceType, @Param("sourceId") String sourceId);

    @Query("SELECT n FROM Notice n WHERE n.aiSummaryStatus IN :statuses ORDER BY n.id ASC")
    List<Notice> findTop15ForSummary(@Param("statuses") List<String> statuses, Pageable pageable);
}
