import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Sanitize postgres:// to postgresql:// for compatibility with Render/Railway connections
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Enable pool_pre_ping for active connection recovery and validation
engine = None
try:
    if "sqlite" in db_url or os.environ.get("USE_SQLITE", "false").lower() == "true":
        raise ValueError("SQLite explicitly requested or fallback triggered.")
        
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )
    # Test connection immediately
    with engine.connect() as conn:
        pass
    print("[Database] Successfully connected to PostgreSQL database.")
except Exception as e:
    print(f"[Database] PostgreSQL connection failed: {e}. Falling back to SQLite local database.")
    db_url = "sqlite:///./local_inventory.db"
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# FastAPI DB session dependency injection helper
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
