from app import app, db
from models import User

with app.app_context():
    users = User.query.all()
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"ID: {u.id} | User: {u.username} | Role: {u.role} | Status: {u.status}")
