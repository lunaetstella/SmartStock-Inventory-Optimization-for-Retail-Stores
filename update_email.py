from app import app, db
from models import User

with app.app_context():
    admin = User.query.filter_by(role='admin').first()
    if admin:
        admin.email = 'vaishuthapi@gmail.com'
        db.session.commit()
        print(f"Updated Admin email to: {admin.email}")
    else:
        print("Admin user not found!")
