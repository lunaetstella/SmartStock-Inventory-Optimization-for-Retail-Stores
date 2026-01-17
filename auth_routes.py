from flask import Blueprint, request, jsonify
from models import db, User, LoginLog
import jwt
import datetime
from config import Config
from functools import wraps

auth_bp = Blueprint('auth', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['id']).first()
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import jwt

@auth_bp.route('/register', methods=['POST'])
def register():
    # Force parse JSON even if Content-Type is missing/wrong
    data = request.get_json(force=True, silent=True)
    
    if not data:
        return jsonify({'message': 'No JSON data received'}), 400
    if not data.get('username'):
        return jsonify({'message': 'Missing username'}), 400
    if not data.get('password'):
        return jsonify({'message': 'Missing password'}), 400


    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'User already exists'}), 409

    # Default role is employee, status is pending. Admin can handle role changes later if needed
    role = 'employee' 
    status = 'pending'
    
    # Auto-approve first user as Admin for setup (Optional utility)
    if User.query.count() == 0:
        role = 'admin'
        status = 'approved'

    hashed_password = generate_password_hash(data['password'], method='scrypt')
    new_user = User(
        username=data['username'], 
        password_hash=hashed_password, 
        role=role,
        email=data.get('email'),
        name=data.get('name'),
        status=status
    )
    
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Registration successful. Please wait for Admin approval."}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing data'}), 400

    user = User.query.filter_by(username=data['username']).first()

    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401
        
    if user.status != 'approved':
        return jsonify({'message': 'Account is pending approval.'}), 403

    token = jwt.encode({
        'id': user.id,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, Config.SECRET_KEY, algorithm="HS256")

    # Record Login Time
    login_log = LoginLog(user_id=user.id)
    db.session.add(login_log)
    db.session.commit()

    return jsonify({"token": token, "role": user.role, "username": user.username})

@auth_bp.route('/pending', methods=['GET'])
@token_required
def get_pending_users(current_user):
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    users = User.query.filter_by(status='pending').all()
    output = []
    for u in users:
        output.append({
            'id': u.id,
            'username': u.username,
            'name': u.name,
            'email': u.email,
            'role': u.role
        })
    return jsonify({'users': output})

@auth_bp.route('/approve/<int:id>', methods=['PUT'])
@token_required
def approve_user(current_user, id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
        
    user = User.query.get_or_404(id)
    user.status = 'approved'
    db.session.commit()
    return jsonify({'message': 'User approved'})

@auth_bp.route('/reject/<int:id>', methods=['DELETE'])
@token_required
def reject_user(current_user, id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
        
    user = User.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User rejected'})

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    # Find the most recent login log for this user
    last_log = LoginLog.query.filter_by(user_id=current_user.id).order_by(LoginLog.login_time.desc()).first()
    
    if last_log and not last_log.logout_time:
        last_log.logout_time = datetime.datetime.utcnow()
        db.session.commit()
        
    return jsonify({'message': 'Logged out successfully'})

@auth_bp.route('/logs', methods=['GET'])
@token_required
def get_login_logs(current_user):
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
        
    # Join with User to get details efficiently if needed, but relationship works too
    logs = LoginLog.query.order_by(LoginLog.login_time.desc()).all()
    output = []
    for log in logs:
        output.append({
            'username': log.user.username,
            'name': log.user.name,
            'role': log.user.role,
            'login_time': log.login_time.isoformat(),
            'logout_time': log.logout_time.isoformat() if log.logout_time else None
        })
    return jsonify({'logs': output})


