package org.cathori.backend.user.application;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class VerifiedEmailStore {

    private final ConcurrentHashMap<String, Boolean> store = new ConcurrentHashMap<>();

    public void markVerified(String email) {
        store.put(email, true);
    }

    public boolean isVerified(String email) {
        return store.getOrDefault(email, false);
    }

    public void remove(String email) {
        store.remove(email);
    }
}
