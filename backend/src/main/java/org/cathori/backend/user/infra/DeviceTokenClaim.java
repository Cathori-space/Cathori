package org.cathori.backend.user.infra;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.cathori.backend.user.domain.User;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Check(name = "ck_device_token_claims_latest", constraints = "latest_claim IS NULL OR latest_claim")
@Check(name = "ck_device_token_claims_confirmation", constraints = """
        confirmed_session_version IS NULL
        OR (latest_claim IS TRUE AND confirmed_session_version = session_version)
        """)
@Table(name = "device_token_claims", uniqueConstraints = {
        @UniqueConstraint(name = "uk_device_token_claims_token_user", columnNames = {"token_hash", "user_id"}),
        @UniqueConstraint(name = "uk_device_token_claims_latest", columnNames = {"token_hash", "latest_claim"})
}, indexes = @Index(name = "idx_device_token_claims_user", columnList = "user_id"))
class DeviceTokenClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_device_token_claims_user"))
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @Column(nullable = false)
    private long sessionVersion;

    private Boolean latestClaim;

    private Long confirmedSessionVersion;

    protected DeviceTokenClaim() {}
}
