package com.verdict;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

// Exclude Redis repository auto-config — we use RedisTemplate directly,
// not Spring Data Redis repositories. This silences the
// "Could not safely identify store assignment" warning.
@SpringBootApplication(exclude = { RedisRepositoriesAutoConfiguration.class })
@EnableJpaRepositories(basePackages = "com.verdict.repository")
public class VerdictApplication {
    public static void main(String[] args) {
        SpringApplication.run(VerdictApplication.class, args);
    }
}
