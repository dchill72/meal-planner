.PHONY: all build run test lint tidy \
        api-build api-run api-test api-lint api-tidy \
        client-install client-build client-start client-test \
        docker-build docker-api-build docker-client-build \
        docker-up docker-down docker-mongo-up docker-mongo-down \
        help

COMPOSE = docker-compose

# ─── Top-level aliases ────────────────────────────────────────────────────────

all: build

build: api-build

run: api-run

test: api-test client-test

lint: api-lint

tidy: api-tidy

# ─── Go API (api-go/) ─────────────────────────────────────────────────────────

api-build:
	cd api-go && go build -o server .

api-run:
	cd api-go && go run .

api-test:
	cd api-go && go test ./...

api-lint:
	cd api-go && go vet ./...

api-tidy:
	cd api-go && go mod tidy

# ─── Client ───────────────────────────────────────────────────────────────────

client-install:
	cd client && npm install

client-build:
	cd client && npm run build

client-start:
	cd client && npm run start

client-test:
	cd client && npm test

# ─── Docker ───────────────────────────────────────────────────────────────────

docker-build: docker-api-build docker-client-build

docker-api-build:
	docker buildx build -t api ./api-go

docker-client-build:
	docker buildx build -t client ./client

docker-up:
	$(COMPOSE) up --detach

docker-down:
	$(COMPOSE) down

docker-mongo-up:
	$(COMPOSE) up --detach mongo

docker-mongo-down:
	$(COMPOSE) stop mongo

# ─── Help ─────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Top-level"
	@echo "  build              Build the Go API binary"
	@echo "  run                Run the Go API locally"
	@echo "  test               Run all tests (API + client)"
	@echo "  lint               Vet the Go API"
	@echo "  tidy               go mod tidy"
	@echo ""
	@echo "Go API (api-go/)"
	@echo "  api-build          go build -o server"
	@echo "  api-run            go run ."
	@echo "  api-test           go test ./..."
	@echo "  api-lint           go vet ./..."
	@echo "  api-tidy           go mod tidy"
	@echo ""
	@echo "Client"
	@echo "  client-install     npm install"
	@echo "  client-build       npm run build"
	@echo "  client-start       npm run start"
	@echo "  client-test        npm test (non-interactive)"
	@echo ""
	@echo "Docker"
	@echo "  docker-build       Build both images"
	@echo "  docker-api-build   Build API image"
	@echo "  docker-client-build  Build client image"
	@echo "  docker-up          Start all containers (detached)"
	@echo "  docker-down        Stop all containers"
	@echo "  docker-mongo-up    Start MongoDB only"
	@echo "  docker-mongo-down  Stop MongoDB"
	@echo ""
