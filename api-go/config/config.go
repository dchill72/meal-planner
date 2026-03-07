package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MongoDBURL     string
	GoogleClientID string
	SessionSecret  string
	CORSOrigin     string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}
	return &Config{
		Port:           getEnv("PORT", "8000"),
		MongoDBURL:     getEnv("MONGODB_URL", ""),
		GoogleClientID: getEnv("GOOGLE_CLIENT_ID", ""),
		SessionSecret:  getEnv("SESSION_SECRET", ""),
		CORSOrigin:     getEnv("CORS_ORIGIN", "http://localhost:3000"),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
