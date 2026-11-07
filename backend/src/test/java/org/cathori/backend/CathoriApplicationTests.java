package org.cathori.backend;

import org.junit.jupiter.api.Test;
import org.cathori.backend.user.application.NotificationPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class CathoriApplicationTests extends IntegrationTestBase {

    @MockitoBean NotificationPort notificationPort;

    @Test
    void contextLoads() {
    }

}
