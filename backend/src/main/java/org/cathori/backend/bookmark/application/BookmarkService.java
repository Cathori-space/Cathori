package org.cathori.backend.bookmark.application;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.bookmark.api.dto.BookmarkToggleResponse;
import org.cathori.backend.bookmark.domain.Bookmark;
import org.cathori.backend.bookmark.domain.BookmarkRepository;
import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.notice.application.NoticeErrorCode;
import org.cathori.backend.notice.model.NoticeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final NoticeRepository noticeRepository;

    @Transactional
    public BookmarkToggleResponse toggle(Long userId, Long noticeId) {
        if (!noticeRepository.existsById(noticeId)) {
            throw new BusinessException(NoticeErrorCode.NOTICE_NOT_FOUND);
        }

        if (bookmarkRepository.existsByUserIdAndNoticeId(userId, noticeId)) {
            bookmarkRepository.deleteByUserIdAndNoticeId(userId, noticeId);
            return new BookmarkToggleResponse(noticeId, false);
        }

        bookmarkRepository.save(Bookmark.create(userId, noticeId));
        return new BookmarkToggleResponse(noticeId, true);
    }
}
