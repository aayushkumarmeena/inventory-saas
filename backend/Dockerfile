# ---------- Build stage ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Copy only the POM first so dependency resolution is cached in its own
# Docker layer and isn't re-run on every source change.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Now copy sources and build the jar (tests are skipped here; run them
# separately in CI with `mvn test`).
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---------- Runtime stage ----------
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# wget (for the container healthcheck) and curl are already present via
# busybox on alpine; add a non-root user to run the app.
RUN addgroup -S spring && adduser -S spring -G spring
USER spring

COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=45s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
