from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

@router.post("", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(order_data: schemas.OrderCreate, db: Session = Depends(get_db)):
    # 1. Verify Customer exists
    customer = db.query(models.Customer).filter(models.Customer.id == order_data.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {order_data.customer_id} does not exist."
        )
    
    # Start a transaction block
    try:
        total_amount = 0.0
        order_items = []
        
        # We consolidate items to check for duplicate products in the same request payload
        product_quantities = {}
        for item in order_data.items:
            product_quantities[item.product_id] = product_quantities.get(item.product_id, 0) + item.quantity

        # 2. Iterate and validate stock for each consolidated product
        for product_id, quantity in product_quantities.items():
            # Query product with "with_for_update" (pessimistic lock) to prevent race conditions in concurrent orders
            product = db.query(models.Product).filter(models.Product.id == product_id).with_for_update().first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {product_id} does not exist."
                )
            
            # Check if stock is sufficient
            if product.quantity_in_stock < quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient inventory for product '{product.name}'. Requested: {quantity}, Available: {product.quantity_in_stock}"
                )
            
            # Deduct stock
            product.quantity_in_stock -= quantity
            
            # Calculate pricing snapshot
            item_total = product.price * quantity
            total_amount += item_total
            
            # Prepare OrderItem
            order_items.append(
                models.OrderItem(
                    product_id=product_id,
                    quantity=quantity,
                    unit_price=product.price,
                    currency=product.currency
                )
            )

        # 3. Create the parent Order record
        db_order = models.Order(
            customer_id=order_data.customer_id,
            total_amount=round(total_amount, 2)
        )
        db.add(db_order)
        db.flush() # Flush to get db_order.id
        
        # 4. Associate and insert items
        for item in order_items:
            item.order_id = db_order.id
            db.add(item)
            
        db.commit()
        db.refresh(db_order)
        return db_order

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected database error occurred while creating the order: {str(e)}"
        )

@router.get("", response_model=List[schemas.OrderOut])
def get_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).all()

@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found."
        )
    return db_order

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found."
        )
    
    try:
        # Restore stock of deleted items back to inventory
        for item in db_order.items:
            if item.product_id:
                product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
                if product:
                    product.quantity_in_stock += item.quantity
        
        db.delete(db_order)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}"
        )
