package org.cathori.backend.config;

import jakarta.servlet.http.HttpServletResponse;
import org.cathori.backend.security.JwtFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final boolean metricsPublic;
    private final boolean prometheusPublic;

    public SecurityConfig(
            JwtFilter jwtFilter,
            @Value("${app.actuator.metrics-public:false}") boolean metricsPublic,
            @Value("${app.actuator.prometheus-public:false}") boolean prometheusPublic
    ) {
        this.jwtFilter = jwtFilter;
        this.metricsPublic = metricsPublic;
        this.prometheusPublic = prometheusPublic;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(
                                "/api/auth/login",
                                "/api/auth/reissue",
                                "/api/auth/register",
                                "/api/auth/email/send",
                                "/api/auth/email/verify",
                                "/actuator/health",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**"
                    ).permitAll();
                    if (metricsPublic) {
                        auth.requestMatchers("/actuator/metrics", "/actuator/metrics/**").permitAll();
                    }
                    if (prometheusPublic) {
                        auth.requestMatchers("/actuator/prometheus").permitAll();
                    }
                    auth.anyRequest().authenticated();
                })
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((request, response, authException) ->
                        response.sendError(HttpServletResponse.SC_UNAUTHORIZED))
                );

        return http.build();
    }
}
