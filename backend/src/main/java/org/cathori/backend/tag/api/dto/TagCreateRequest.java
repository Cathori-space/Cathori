package org.cathori.backend.tag.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TagCreateRequest(
        @NotBlank(message = "태그 이름을 입력해주세요")
        @Size(max = 30, message = "태그 이름은 30자 이하로 입력해주세요")
        String name
) {
}
