package db

import (
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
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
		client, initErr = mongo.Connect(options.Client().ApplyURI(mongoURL).SetTimeout(10 * time.Second))
		if initErr == nil {
			log.Printf("MongoDB connected in %dms", time.Since(start).Milliseconds())
		}
	})
	if initErr != nil {
		return nil, initErr
	}
	return client.Database("mealplanner"), nil
}
