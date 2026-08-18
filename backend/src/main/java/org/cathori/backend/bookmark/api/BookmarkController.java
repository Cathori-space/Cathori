package org.cathori.backend.bookmark.api;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.bookmark.api.dto.BookmarkToggleResponse;
import org.cathori.backend.bookmark.application.BookmarkService;
import org.cathori.backend.security.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @PostMapping("/{noticeId}/bookmark")
    public ResponseEntity<BookmarkToggleResponse> toggle(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long noticeId) {
        BookmarkToggleResponse response = bookmarkService.toggle(userDetails.getUserId(), noticeId);
        return ResponseEntity.ok(response);
    }
}
