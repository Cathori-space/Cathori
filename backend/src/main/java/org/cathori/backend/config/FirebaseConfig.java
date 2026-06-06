package org.cathori.backend.config;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            logger.info("FirebaseApp이 이미 시작 되었습니다.");
            return FirebaseApp.getInstance();
        }
        ClassPathResource resource = new ClassPathResource("cathori-firebase.json");
        
        try (InputStream serviceAccount = resource.getInputStream()) { // try-with-resources 사용
            GoogleCredentials credentials = GoogleCredentials.fromStream(serviceAccount)
            .createScoped(List.of("https://www.googleapis.com/auth/firebase.messaging"));
            
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .setProjectId(credentials.getProjectId())
                    .build();
            
            FirebaseApp app = FirebaseApp.initializeApp(options);
            return app;
        } catch (IOException e) {
            logger.error("FirebaseApp 시작 실패: {}", e.getMessage());
            throw e; // 예외를 다시 던져서 애플리케이션 시작 실패 알림
        }
    }
}
