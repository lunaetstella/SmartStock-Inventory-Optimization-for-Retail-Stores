from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import datetime as dt

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True) # Optional for now to avoid breaking seed if any
    name = db.Column(db.String(100), nullable=True)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False) # 'admin' or 'employee'
    status = db.Column(db.String(20), default='pending') # 'pending', 'approved', 'rejected'


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))
    supplier = db.Column(db.String(100))
    price = db.Column(db.Float, nullable=False)
    stock_quantity = db.Column(db.Integer, default=0)
    min_stock_threshold = db.Column(db.Integer, default=10)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    transaction_type = db.Column(db.String(10), nullable=False) # 'in' or 'out'
    timestamp = db.Column(db.DateTime, default=dt.datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    product = db.relationship('Product', backref=db.backref('transactions', lazy=True))
    user = db.relationship('User', backref=db.backref('transactions', lazy=True))

class LoginLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    login_time = db.Column(db.DateTime, default=dt.datetime.utcnow)
    logout_time = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref=db.backref('login_logs', lazy=True))
