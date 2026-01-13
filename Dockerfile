# Etapa de build
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copia apenas arquivos necessários para build
COPY pom.xml .
COPY src ./src

# Build do Maven sem testes
RUN mvn -B -DskipTests package

# Etapa de runtime
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copia apenas o JAR gerado
COPY --from=build /app/target/*.jar app.jar

# Define memória mínima e máxima para o Java
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# Comando de start com variáveis de memória
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
