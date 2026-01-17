from flask import Flask, render_template
from flask_cors import CORS
from config import Config
from models import db
from flask_migrate import Migrate

app = Flask(__name__)
app.config.from_object(Config)

# Initialize Extensions
CORS(app)
db.init_app(app)
migrate = Migrate(app, db)

# Register Blueprints (Importing here to avoid circular dependencies)
from routes.auth_routes import auth_bp
from routes.product_routes import product_bp
from routes.transaction_routes import transaction_bp
from routes.report_routes import report_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(product_bp, url_prefix='/api/products')
app.register_blueprint(transaction_bp, url_prefix='/api/transactions')
app.register_blueprint(report_bp, url_prefix='/api/reports')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
