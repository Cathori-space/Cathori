package org.cathori.backend.notice.api;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.notice.api.dto.NoticeDetailResponse;
import org.cathori.backend.notice.api.dto.NoticeFeedResponse;
import org.cathori.backend.notice.application.NoticeFeedService;
import org.cathori.backend.security.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeFeedService noticeFeedService;

    @GetMapping
    public ResponseEntity<NoticeFeedResponse> getFeed(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tags,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        NoticeFeedResponse response = noticeFeedService.getFeed(
                userDetails.getUserId(), category, tags, page, size
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{noticeId}")
    public ResponseEntity<NoticeDetailResponse> getDetail(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long noticeId) {
        return ResponseEntity.ok(noticeFeedService.getDetail(userDetails.getUserId(), noticeId));
    }
}
