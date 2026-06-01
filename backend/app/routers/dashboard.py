from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_products = db.query(models.Product).count()
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()
    
    # Low stock threshold is defined as < 10 units in inventory
    low_stock_products = db.query(models.Product).filter(models.Product.quantity_in_stock < 10).all()
    
    # Retrieve top 5 stocked products for graphical visualization
    top_products = db.query(models.Product).order_by(models.Product.quantity_in_stock.desc()).limit(5).all()
    
    return schemas.DashboardStats(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_products=low_stock_products,
        top_products=top_products
    )
