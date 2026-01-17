from app import app, db

# This script will create any new tables defined in models.py that don't exist yet
# It will NOT drop existing tables
with app.app_context():
    db.create_all()
    print("Database schema updated successfully.")
