package org.cathori.backend.user.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 100, nullable = false, unique = true)
    private String email;

    @Column(length = 255, nullable = false)
    private String password;

    @Column(length = 30, nullable = false)
    private String major;

    @Column(length = 30)
    private String secondMajor;

    @Column(nullable = false)
    private int grade;

    @Column(length = 10, nullable = false)
    private String enrollmentStatus;

    @Column(length = 255)
    private String deviceToken;

    @Column(nullable = false)
    private int dailyAlertLimit = 1;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public void updateDeviceToken(String deviceToken) {
        this.deviceToken = deviceToken;
    }

    /** 로그아웃 등으로 기기 토큰을 반납합니다. 이후 이 사용자는 알림 대상에서 제외됩니다. */
    public void clearDeviceToken() {
        this.deviceToken = null;
    }

    public static User create(String email, String encodedPassword,
                              String major, String secondMajor,
                              int grade, String enrollmentStatus) {
        User user = new User();
        user.email = email;
        user.password = encodedPassword;
        user.major = major;
        user.secondMajor = secondMajor;
        user.grade = grade;
        user.enrollmentStatus = enrollmentStatus;
        user.createdAt = LocalDateTime.now();
        return user;
    }
}
