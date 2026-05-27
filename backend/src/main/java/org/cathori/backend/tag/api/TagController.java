package org.cathori.backend.tag.api;

import jakarta.validation.Valid;
import org.cathori.backend.security.CustomUserDetails;
import org.cathori.backend.tag.api.dto.TagCreateRequest;
import org.cathori.backend.tag.api.dto.TagResponse;
import org.cathori.backend.tag.application.TagService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    public ResponseEntity<List<TagResponse>> getTags(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(tagService.getTags(userDetails.getUserId()));
    }

    @PostMapping
    public ResponseEntity<TagResponse> createTag(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody @Valid TagCreateRequest request) {
        TagResponse response = tagService.createTag(userDetails.getUserId(), request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{tagId}")
    public ResponseEntity<Void> deleteTag(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long tagId) {
        tagService.deleteTag(userDetails.getUserId(), tagId);
        return ResponseEntity.noContent().build();
    }
}
