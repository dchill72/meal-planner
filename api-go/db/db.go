package db

import (
	"context"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	client   *mongo.Client
	initErr  error
	once     sync.Once
	mongoURL string
)

func Init(url string) {
	mongoURL = url
}

func GetDB() (*mongo.Database, error) {
	once.Do(func() {
		log.Println("Connecting to MongoDB...")
		start := time.Now()
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		client, initErr = mongo.Connect(ctx, options.Client().ApplyURI(mongoURL))
		if initErr == nil {
			log.Printf("MongoDB connected in %dms", time.Since(start).Milliseconds())
		}
	})
	if initErr != nil {
		return nil, initErr
	}
	return client.Database("mealplanner"), nil
}
