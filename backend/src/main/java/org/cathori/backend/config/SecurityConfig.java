package org.cathori.backend.config;

import jakarta.servlet.http.HttpServletResponse;
import org.cathori.backend.security.JwtFilter;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
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
    private final boolean prometheusScrapePermitted;

    public SecurityConfig(
            JwtFilter jwtFilter,
            @Value("${app.actuator.metrics-public:false}") boolean metricsPublic,
            @Value("${app.actuator.prometheus-scrape-permitted:false}") boolean prometheusScrapePermitted
    ) {
        this.jwtFilter = jwtFilter;
        this.metricsPublic = metricsPublic;
        this.prometheusScrapePermitted = prometheusScrapePermitted;
    }

    @Bean
    @Order(1)
    public SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher(EndpointRequest.toAnyEndpoint())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(EndpointRequest.to("health")).permitAll();
                    if (metricsPublic) {
                        auth.requestMatchers(EndpointRequest.to("metrics")).permitAll();
                    }
                    if (prometheusScrapePermitted) {
                        auth.requestMatchers(EndpointRequest.to("prometheus")).permitAll();
                    }
                    auth.anyRequest().denyAll();
                });

        return http.build();
    }

    @Bean
    @Order(2)
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
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**"
                    ).permitAll();
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
