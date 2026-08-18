package org.cathori.backend.bookmark.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bookmark",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "notice_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "notice_id", nullable = false)
    private Long noticeId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static Bookmark create(Long userId, Long noticeId) {
        Bookmark bookmark = new Bookmark();
        bookmark.userId = userId;
        bookmark.noticeId = noticeId;
        return bookmark;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
