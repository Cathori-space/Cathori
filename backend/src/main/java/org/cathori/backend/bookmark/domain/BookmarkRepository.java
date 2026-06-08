package org.cathori.backend.bookmark.domain;

public interface BookmarkRepository {
    boolean existsByUserIdAndNoticeId(Long userId, Long noticeId);
    Bookmark save(Bookmark bookmark);
    void deleteByUserIdAndNoticeId(Long userId, Long noticeId);
    void deleteByUserId(Long userId);
}
