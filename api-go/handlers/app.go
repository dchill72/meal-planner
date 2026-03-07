package handlers

import (
	"github.com/gorilla/sessions"
	"meal-planner-api/config"
)

const sessionName = "session"

type contextKey string

const userContextKey contextKey = "user"

type App struct {
	Config *config.Config
	Store  *sessions.CookieStore
}

func NewApp(cfg *config.Config) *App {
	return &App{
		Config: cfg,
		Store:  sessions.NewCookieStore([]byte(cfg.SessionSecret)),
	}
}
