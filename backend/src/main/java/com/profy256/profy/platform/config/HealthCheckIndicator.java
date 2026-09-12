package com.profy256.profy.platform.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class HealthCheckIndicator implements HealthIndicator {

    private final JdbcTemplate jdbc;
    private final RedisConnectionFactory redisFactory;

    public HealthCheckIndicator(JdbcTemplate jdbc, RedisConnectionFactory redisFactory) {
        this.jdbc = jdbc;
        this.redisFactory = redisFactory;
    }

    @Override
    public Health health() {
        boolean pgUp = checkPostgres();
        boolean redisUp = checkRedis();

        if (pgUp && redisUp) {
            return Health.up()
                    .withDetail("postgres", "up")
                    .withDetail("redis", "up")
                    .build();
        }

        var builder = Health.down();
        builder.withDetail("postgres", pgUp ? "up" : "down");
        builder.withDetail("redis", redisUp ? "up" : "down");
        return builder.build();
    }

    private boolean checkPostgres() {
        try {
            jdbc.execute("SELECT 1");
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkRedis() {
        try {
            redisFactory.getConnection().ping();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
