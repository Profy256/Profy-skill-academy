package com.profy256.profy.modules.lessons.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily sweep that auto-fills published lessons which still have no video rows
 * (e.g. freshly imported course batches that no learner has opened yet).
 * Runtime auto-curation covers lessons on read; this job makes coverage proactive.
 *
 * No-ops when YOUTUBE_API_KEY is unset.
 */
@Component
public class AutoCurationSweepJob {

    private static final Logger log = LoggerFactory.getLogger(AutoCurationSweepJob.class);

    /** Cap per run — YouTube search costs 100 quota units per call on the free tier. */
    static final int MAX_LESSONS_PER_RUN = 50;

    private final AutoCurationService autoCurationService;

    public AutoCurationSweepJob(AutoCurationService autoCurationService) {
        this.autoCurationService = autoCurationService;
    }

    @Scheduled(cron = "${profy.auto-curation-sweep-cron:0 0 3 * * *}", zone = "UTC")
    public void sweep() {
        if (!autoCurationService.isEnabled()) {
            return;
        }
        try {
            int filled = autoCurationService.sweepUncoveredLessons(MAX_LESSONS_PER_RUN);
            if (filled > 0) {
                log.info("Auto-curation sweep: {} lessons auto-filled", filled);
            }
        } catch (Exception e) {
            log.error("Auto-curation sweep failed: {}", e.getMessage(), e);
        }
    }
}
