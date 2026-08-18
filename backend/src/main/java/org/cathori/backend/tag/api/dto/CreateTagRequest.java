package org.cathori.backend.tag.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateTagRequest(
        @Schema(example = "장학")
        @NotBlank
        @Size(max = 20)
        @Pattern(regexp = "^[가-힣a-zA-Z0-9]+$")
        String tagName
) {}
