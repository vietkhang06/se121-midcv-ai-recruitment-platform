# Build the Spring Boot application with the project's supported JDK.
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

# Small runtime image; uploads are mounted on a separate persistent volume.
FROM eclipse-temurin:21-jre-jammy AS runtime
ENV PORT_BACKEND=8080 \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError" \
    TZ=Asia/Ho_Chi_Minh
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 midcv \
    && useradd --system --uid 10001 --gid midcv --home-dir /app --shell /usr/sbin/nologin midcv \
    && mkdir -p /app/uploads \
    && chown -R midcv:midcv /app
WORKDIR /app
COPY --from=build --chown=midcv:midcv /workspace/target/recruitment-backend-1.0.0-SNAPSHOT.jar /app/app.jar
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=5s --start-period=60s --retries=5 \
  CMD curl --fail --silent http://127.0.0.1:8080/actuator/health/readiness >/dev/null || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
