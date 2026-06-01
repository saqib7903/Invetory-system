from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "Inventory & Order Management API"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/inventory_db"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:80,http://localhost"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

# Instantiate settings
settings = Settings()
