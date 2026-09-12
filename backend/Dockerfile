# Multi-stage build for Spring Boot (TECHNICAL_DOC §3).
# compose runs the api image with `command: java -jar /app/api.jar` or worker jar.

FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /src

# Copy Maven wrapper and pom.xml first for dependency caching
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline -B

# Copy source and build
COPY src src
RUN ./mvnw package -DskipTests -B

# Runtime stage — non-root user
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && apk add --no-cache ca-certificates tzdata
USER appuser
WORKDIR /home/appuser
COPY --from=build --chown=appuser:appgroup /src/target/*.jar /home/appuser/app.jar
EXPOSE 8080
CMD ["java", "-jar", "/home/appuser/app.jar"]
