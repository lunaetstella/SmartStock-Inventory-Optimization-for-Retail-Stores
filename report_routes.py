from flask import Blueprint, jsonify
from routes.auth_routes import token_required

report_bp = Blueprint('reports', __name__)

from models import db, Product, Transaction
from flask import send_file
import csv
import io

@report_bp.route('/stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    total_products = Product.query.count()
    low_stock_count = Product.query.filter(Product.stock_quantity <= Product.min_stock_threshold).count()
    recent_transactions = Transaction.query.count() # Just a count for the card, or detailed list handled elsewhere
    
    return jsonify({
        'total_products': total_products,
        'low_stock_count': low_stock_count,
        'recent_tx_count': recent_transactions
    })

@report_bp.route('/export/csv', methods=['GET'])
@token_required
def export_csv(current_user):
    # Only Admin? Or everyone? Let's say Admin
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    products = Product.query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['ID', 'SKU', 'Name', 'Category', 'Supplier', 'Price', 'Stock', 'Min Threshold'])
    
    for p in products:
        writer.writerow([p.id, p.sku, p.name, p.category, p.supplier, p.price, p.stock_quantity, p.min_stock_threshold])
        
    output.seek(0)
    
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='inventory_report.csv'
    )

