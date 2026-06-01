from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)

@router.post("", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    # SKU must be unique
    existing_product = db.query(models.Product).filter(models.Product.sku == product.sku).first()
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with SKU '{product.sku}' already exists."
        )
    
    db_product = models.Product(
        name=product.name.strip(),
        sku=product.sku.strip(),
        price=product.price,
        quantity_in_stock=product.quantity_in_stock,
        currency=product.currency.strip().upper() if product.currency else "USD"
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("", response_model=List[schemas.ProductOut])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.created_at.desc()).all()

@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    return db_product

@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    
    # If SKU is updated, ensure uniqueness
    if product.sku is not None and product.sku != db_product.sku:
        sku_check = db.query(models.Product).filter(models.Product.sku == product.sku).first()
        if sku_check:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{product.sku}' already exists."
            )
            
    # Update fields if provided
    if product.name is not None:
        db_product.name = product.name.strip()
    if product.sku is not None:
        db_product.sku = product.sku.strip()
    if product.price is not None:
        db_product.price = product.price
    if product.quantity_in_stock is not None:
        db_product.quantity_in_stock = product.quantity_in_stock
    if product.currency is not None:
        db_product.currency = product.currency.strip().upper()

    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    db.delete(db_product)
    db.commit()
    return None
