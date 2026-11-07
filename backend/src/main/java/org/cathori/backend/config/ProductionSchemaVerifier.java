package org.cathori.backend.config;

import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.core.io.ClassPathResource;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;

@ImportAutoConfiguration(DataSourceAutoConfiguration.class)
public class ProductionSchemaVerifier {

    public static void main(String[] args) {
        var app = new SpringApplication(ProductionSchemaVerifier.class);
        app.setWebApplicationType(WebApplicationType.NONE);
        app.setAdditionalProfiles("prod");
        app.setBannerMode(Banner.Mode.OFF);
        app.setLogStartupInfo(false);

        try (var context = app.run(args)) {
            var environment = context.getEnvironment();
            if (!"validate".equals(environment.getProperty("spring.jpa.hibernate.ddl-auto"))
                    || !"validate".equals(environment.getProperty("spring.jpa.properties.hibernate.hbm2ddl.auto", "validate"))
                    || environment.containsProperty("spring.jpa.properties.jakarta.persistence.schema-generation.database.action")
                    || environment.getProperty("spring.jpa.generate-ddl", Boolean.class, false)
                    || !"never".equals(environment.getProperty("spring.sql.init.mode"))) {
                System.err.println("운영 스키마 검증 실패. Hibernate는 validate, SQL 초기화는 never여야 합니다.");
                System.exit(1);
            }
            verify(context.getBean(DataSource.class));
        } catch (SQLException e) {
            String reason = switch (String.valueOf(e.getSQLState())) {
                case "P2171" -> "001의 users.session_version 정의를 확인하세요.";
                case "P2172" -> "002의 토큰 소유권 테이블과 제약을 확인하세요.";
                case "P2173" -> "003의 푸시 등록 확인 세대와 제약을 확인하세요.";
                default -> "DB 연결 또는 스키마 조회에 실패했습니다.";
            };
            System.err.println("운영 스키마 검증 실패. " + reason);
            System.exit(1);
        } catch (IOException | RuntimeException e) {
            System.err.println("운영 스키마 검사 설정을 확인하세요.");
            System.exit(1);
        }
        System.out.println("이슈 #217 운영 DB 스키마 검증 통과.");
    }

    private static void verify(DataSource dataSource) throws IOException, SQLException {
        String sql = new ClassPathResource("db/verify-issue-217-schema.sql").getContentAsString(StandardCharsets.UTF_8);
        try (var connection = dataSource.getConnection()) {
            connection.setReadOnly(true);
            connection.setAutoCommit(false);
            try (var statement = connection.createStatement()) {
                statement.setQueryTimeout(10);
                statement.execute("SET LOCAL lock_timeout = '3s'");
                statement.execute(sql);
            }
            connection.rollback();
        }
    }
}
