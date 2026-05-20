package org.cathori.backend.bookmark.infra;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.bookmark.domain.Bookmark;
import org.cathori.backend.bookmark.domain.BookmarkRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class BookmarkRepositoryImpl implements BookmarkRepository {

    private final BookmarkJpaRepository jpaRepository;

    @Override
    public boolean existsByUserIdAndNoticeId(Long userId, Long noticeId) {
        return jpaRepository.existsByUserIdAndNoticeId(userId, noticeId);
    }

    @Override
    public Bookmark save(Bookmark bookmark) {
        return jpaRepository.save(bookmark);
    }

    @Override
    public void deleteByUserIdAndNoticeId(Long userId, Long noticeId) {
        jpaRepository.deleteByUserIdAndNoticeId(userId, noticeId);
    }
}
