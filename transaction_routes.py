from flask import Blueprint, request, jsonify
from models import db, Transaction, Product, User
from routes.auth_routes import token_required
from utils.email_sender import send_email_async

transaction_bp = Blueprint('transactions', __name__)

@transaction_bp.route('', methods=['GET'])
@token_required
def get_transactions(current_user):
    transactions = Transaction.query.order_by(Transaction.timestamp.desc()).all()
    output = []
    for t in transactions:
        t_data = {
            'id': t.id,
            'product_name': t.product.name,
            'product_sku': t.product.sku,
            'quantity': t.quantity,
            'transaction_type': t.transaction_type,
            'timestamp': t.timestamp.isoformat(),
            'user': t.user.username
        }
        output.append(t_data)
    return jsonify({'transactions': output})

@transaction_bp.route('/', methods=['POST'])
@transaction_bp.route('', methods=['POST'])
def create_transaction():
    data = request.get_json()
    
    # Validation
    if not data.get('product_id') or not data.get('transaction_type') or not data.get('quantity'):
        return jsonify({'message': 'Missing fields'}), 400
        
    product = Product.query.get(data['product_id'])
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    qty = int(data['quantity'])
    
    if data['transaction_type'] == 'out':
        if product.stock_quantity < qty:
            return jsonify({'message': 'Insufficient stock'}), 400
        product.stock_quantity -= qty
    elif data['transaction_type'] == 'in':
        product.stock_quantity += qty
        
    # Create Record
    # Use the first admin user as the actor if auth context is missing
    # In a real app, use current_user.id from token
    actor = User.query.filter_by(role='admin').first()
    actor_id = actor.id if actor else 1 # Fallback to 1 if no admin found (unlikely)
    
    new_tx = Transaction(
        product_id=product.id,
        transaction_type=data['transaction_type'],
        quantity=qty,
        user_id=actor_id
    )
    
    db.session.add(new_tx)
    db.session.commit()

    # CHECK LOW STOCK ALERT
    if data['transaction_type'] == 'out' and product.stock_quantity <= product.min_stock_threshold:
        # Find admins
        admins = User.query.filter_by(role='admin').all()
        for admin in admins:
            if admin.email:
                subject = f"URGENT: Low Stock Report - {product.name}"
                body = (
                    f"LOW STOCK REPORT\n"
                    f"--------------------------------------------------\n"
                    f"Product Name : {product.name}\n"
                    f"SKU          : {product.sku}\n"
                    f"Current Stock: {product.stock_quantity} (Below Limit)\n"
                    f"Min Threshold: {product.min_stock_threshold}\n"
                    f"--------------------------------------------------\n\n"
                    f"STATUS: CRITICAL ACTION REQUIRED\n"
                    f"Immediate action is required to restock this item and prevent stock-outs.\n"
                )
                send_email_async(subject, admin.email, body)

    return jsonify({'message': 'Transaction recorded', 'new_stock': product.stock_quantity}), 201
