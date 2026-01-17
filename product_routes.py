from flask import Blueprint, request, jsonify
from models import db, Product
from routes.auth_routes import token_required

product_bp = Blueprint('products', __name__)

@product_bp.route('', methods=['GET'])
@token_required
def get_products(current_user):
    products = Product.query.all()
    output = []
    for product in products:
        product_data = {}
        product_data['id'] = product.id
        product_data['sku'] = product.sku
        product_data['name'] = product.name
        product_data['category'] = product.category
        product_data['supplier'] = product.supplier
        product_data['price'] = product.price
        product_data['stock_quantity'] = product.stock_quantity
        product_data['min_stock_threshold'] = product.min_stock_threshold
        output.append(product_data)
    return jsonify({'products': output})

@product_bp.route('', methods=['POST'])
@token_required
def add_product(current_user):
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    
    # Basic validation
    if not data or not data.get('sku') or not data.get('name'):
        return jsonify({'message': 'Missing required fields'}), 400
        
    if Product.query.filter_by(sku=data['sku']).first():
         return jsonify({'message': 'Product with this SKU already exists'}), 409

    new_product = Product(
        sku=data['sku'],
        name=data['name'],
        category=data.get('category'),
        supplier=data.get('supplier'),
        price=data.get('price', 0.0),
        stock_quantity=data.get('stock_quantity', 0),
        min_stock_threshold=data.get('min_stock_threshold', 10)
    )

    db.session.add(new_product)
    db.session.commit()

    return jsonify({'message': 'Product added successfully!'}), 201

@product_bp.route('/<int:id>', methods=['PUT'])
@token_required
def update_product(current_user, id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    product = Product.query.get_or_404(id)
    data = request.get_json()

    product.name = data.get('name', product.name)
    product.category = data.get('category', product.category)
    product.supplier = data.get('supplier', product.supplier)
    product.price = data.get('price', product.price)
    product.min_stock_threshold = data.get('min_stock_threshold', product.min_stock_threshold)
    # Stock quantity is usually updated via transactions, but Admin might correct it manually
    if 'stock_quantity' in data:
         product.stock_quantity = data['stock_quantity']

    db.session.commit()
    return jsonify({'message': 'Product updated'})

@product_bp.route('/<int:id>', methods=['DELETE'])
@token_required
def delete_product(current_user, id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
        
    product = Product.query.get_or_404(id)
    db.session.delete(product)
    db.session.commit()
    
    return jsonify({'message': 'Product deleted'})

