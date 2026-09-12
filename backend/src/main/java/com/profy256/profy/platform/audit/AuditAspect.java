package com.profy256.profy.platform.audit;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);

    @Around("@annotation(com.profy256.profy.platform.audit.Audited)")
    public Object audit(ProceedingJoinPoint joinPoint) throws Throwable {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth != null ? auth.getName() : "anonymous";
        String method = joinPoint.getSignature().toShortString();

        log.info("AUDIT user={} action={}", userId, method);

        Object result = joinPoint.proceed();

        log.info("AUDIT user={} action={} completed", userId, method);
        return result;
    }
}
