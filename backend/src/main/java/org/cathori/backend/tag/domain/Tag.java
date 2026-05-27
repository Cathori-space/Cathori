package org.cathori.backend.tag.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.cathori.backend.user.domain.User;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "tags",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_tags_user_normalized_name",
                        columnNames = {"user_id", "normalized_name"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String name;

    @Column(name = "normalized_name", nullable = false, length = 30)
    private String normalizedName;

    @Column(nullable = false)
    private int sortOrder;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static Tag create(User user, String name, int sortOrder) {
        Tag tag = new Tag();
        tag.user = user;
        tag.name = name;
        tag.normalizedName = normalize(name);
        tag.sortOrder = sortOrder;
        tag.createdAt = LocalDateTime.now();
        return tag;
    }

    public static String normalize(String name) {
        return name.trim().toLowerCase();
    }
}
