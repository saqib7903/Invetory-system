from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from .config import settings
from .database import engine, Base
from .routers import products, customers, orders, dashboard

# Automatically create database tables if they do not exist
try:
    Base.metadata.create_all(bind=engine)
    
    # Run dynamic schema migrations for legacy tables
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    
    # 1. Migrate products table (add currency if missing)
    if "products" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("products")]
        if "currency" not in columns:
            print("[Migration] Adding currency column to products table...")
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE products ADD COLUMN currency VARCHAR DEFAULT 'USD' NOT NULL"))
                
    # 2. Migrate order_items table (add currency if missing)
    if "order_items" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("order_items")]
        if "currency" not in columns:
            print("[Migration] Adding currency column to order_items table...")
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE order_items ADD COLUMN currency VARCHAR DEFAULT 'USD' NOT NULL"))
                
except Exception as e:
    print(f"Database connection failed or table creation/migration skipped: {str(e)}")

# Initialize FastAPI Application
app = FastAPI(
    title=settings.APP_NAME,
    description="A production-ready Containerized Inventory & Order Management API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Cross-Origin Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(products.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

# Welcome page redirects directly to Swagger documentation for interactive testing
@app.get("/", include_in_schema=False)
def index_redirect():
    return RedirectResponse(url="/docs")

# Healthcheck API Endpoint
@app.get("/health", tags=["Health"], status_code=200)
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "database_connected": True
    }
