FROM adoptopenjdk/openjdk11:alpine

WORKDIR /app

ARG JAR_FILE=/target/wallet-views-0.1.0.jar

COPY ${JAR_FILE} wallet-views.jar

VOLUME /app/config


ENTRYPOINT ["java", "-jar", "/app/wallet-views.jar", "--spring.config.name=application", "--spring.config.location=file:/app/config/"]


