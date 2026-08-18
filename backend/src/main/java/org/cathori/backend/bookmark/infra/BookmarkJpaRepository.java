package org.cathori.backend.bookmark.infra;

import org.cathori.backend.bookmark.domain.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookmarkJpaRepository extends JpaRepository<Bookmark, Long> {
    boolean existsByUserIdAndNoticeId(Long userId, Long noticeId);
    void deleteByUserIdAndNoticeId(Long userId, Long noticeId);
    void deleteByUserId(Long userId);
}
