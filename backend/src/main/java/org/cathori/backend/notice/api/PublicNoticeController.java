package org.cathori.backend.notice.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.cathori.backend.notice.api.dto.PublicNoticeDetailResponse;
import org.cathori.backend.notice.api.dto.PublicNoticeFeedResponse;
import org.cathori.backend.notice.api.dto.PublicNoticeSearchResponse;
import org.cathori.backend.notice.application.query.PublicNoticeService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/public/notices")
@RequiredArgsConstructor
public class PublicNoticeController {

    private final PublicNoticeService publicNoticeService;

    @GetMapping
    public ResponseEntity<PublicNoticeFeedResponse> getFeed(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(publicNoticeService.getFeed(category, page, size));
    }

    @GetMapping("/search")
    public ResponseEntity<PublicNoticeSearchResponse> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(publicNoticeService.search(q, page, size));
    }

    @GetMapping("/{noticeId}")
    public ResponseEntity<PublicNoticeDetailResponse> getDetail(@PathVariable @Positive Long noticeId) {
        return ResponseEntity.ok(publicNoticeService.getDetail(noticeId));
    }
}
