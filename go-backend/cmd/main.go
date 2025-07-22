package main

import (
	"log"
	"os"

	"scalebox-backend/internal/api"
	"scalebox-backend/internal/config"
	"scalebox-backend/internal/database"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database
	db, err := database.Init(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize and start server
	server := api.NewServer(cfg, db)
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("Starting ScaleBox backend server on port %s", port)
	if err := server.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
} 