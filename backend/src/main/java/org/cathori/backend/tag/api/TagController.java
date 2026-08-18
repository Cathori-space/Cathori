package org.cathori.backend.tag.api;

import jakarta.validation.Valid;
import org.cathori.backend.security.CustomUserDetails;
import org.cathori.backend.tag.api.dto.CreateTagRequest;
import org.cathori.backend.tag.application.TagService;
import org.cathori.backend.tag.api.dto.TagDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<List<TagDto>> getTags(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<TagDto> response = tagService.getTagsByUserId(userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<TagDto> createTag(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody @Valid CreateTagRequest request) {
        TagDto response = tagService.createTag(userDetails.getUserId(), request.tagName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{tagId}")
    public ResponseEntity<Void> deleteTag(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long tagId) {
        tagService.deleteTag(userDetails.getUserId(), tagId);
        return ResponseEntity.ok().build();
    }
}
