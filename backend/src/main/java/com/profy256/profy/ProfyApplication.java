package com.profy256.profy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ProfyApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProfyApplication.class, args);
    }
}
