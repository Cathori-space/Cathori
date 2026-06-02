package org.cathori.backend.user.api;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.cathori.backend.security.CustomUserDetails;
import org.cathori.backend.user.api.dto.UpdateDeviceTokenRequest;
import org.cathori.backend.user.application.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PutMapping("/device-token")
    public ResponseEntity<Void> updateDeviceToken(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody @Valid UpdateDeviceTokenRequest request) {
        userService.updateDeviceToken(userDetails.getUserId(), request.deviceToken());
        return ResponseEntity.noContent().build();
    }
}
