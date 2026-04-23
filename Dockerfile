# Etapa de compilación
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o main .

# Etapa final
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
COPY static/ ./static/


EXPOSE 8000
CMD ["./main"]
