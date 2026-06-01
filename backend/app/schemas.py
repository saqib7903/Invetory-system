from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

# --- PRODUCT SCHEMAS ---
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, description="Product Name")
    sku: str = Field(..., min_length=1, description="Unique product SKU/Code")
    price: float = Field(..., ge=0.0, description="Product Price")
    quantity_in_stock: int = Field(..., ge=0, description="Quantity in stock")
    currency: str = Field("USD", min_length=3, max_length=3, description="Currency ISO Code (e.g. USD, EUR, INR)")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    sku: Optional[str] = Field(None, min_length=1)
    price: Optional[float] = Field(None, ge=0.0)
    quantity_in_stock: Optional[int] = Field(None, ge=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)

class ProductOut(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- CUSTOMER SCHEMAS ---
class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=1, description="Customer Full Name")
    email: EmailStr = Field(..., description="Customer unique email address")
    phone: Optional[str] = Field(None, description="Customer contact phone number")

class CustomerCreate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- ORDER SCHEMAS ---
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity of product ordered")

class OrderItemOut(BaseModel):
    id: int
    product_id: Optional[int]
    product_name: Optional[str] = None # Handled via dynamic property or router mapping
    quantity: int
    unit_price: float
    currency: str = "USD"

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Items included in this order")

class OrderOut(BaseModel):
    id: int
    customer_id: int
    customer: CustomerOut
    total_amount: float
    created_at: datetime
    items: List[OrderItemOut]

    class Config:
        from_attributes = True


# --- DASHBOARD / STATS SCHEMAS ---
class DashboardStats(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_products: List[ProductOut]
    top_products: List[ProductOut] = []
