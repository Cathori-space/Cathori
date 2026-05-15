package org.cathori.backend.user.application;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class VerificationStore {

    private static final int TTL_MINUTES = 3;

    record Entry(String code, LocalDateTime expiresAt) {}

    private final ConcurrentHashMap<String, Entry> store = new ConcurrentHashMap<>();

    public void save(String email, String code) {
        store.put(email, new Entry(code, LocalDateTime.now().plusMinutes(TTL_MINUTES)));
    }

    public Optional<Entry> find(String email) {
        return Optional.ofNullable(store.get(email));
    }

    public void remove(String email) {
        store.remove(email);
    }
}
