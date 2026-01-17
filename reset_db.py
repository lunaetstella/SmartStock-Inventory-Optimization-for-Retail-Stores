from app import app, db
from models import User, Product, Transaction
import os

# Delete the database file if it exists to ensure a completely fresh start
db_file = 'inventory.db'
if os.path.exists(db_file):
    try:
        os.remove(db_file)
        print(f"Deleted existing {db_file}")
    except PermissionError:
        print(f"Could not delete {db_file} (locked). Attempting to drop tables instead...")

with app.app_context():
    try:
        db.drop_all()
        print("Dropped all tables.")
    except Exception as e:
        print(f"Error dropping tables: {e}")
        
    db.create_all()
    print("Created new tables with updated schema.")

    # Create Admin User
    if not User.query.filter_by(role='admin').first():
        from werkzeug.security import generate_password_hash
        admin = User(
            username='admin',
            password_hash=generate_password_hash('adminpass', method='scrypt'),
            role='admin',
            email='admin@example.com',
            name='Administrator',
            status='approved'
        )
        db.session.add(admin)
        db.session.commit()
        print("Created default admin user: admin / adminpass")
