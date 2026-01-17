# Smart Inventory Management System

A Flask-based inventory management system designed for efficiently tracking products, stock transactions, and user activity with role-based access control.

## 🚀 Features

*   **User Authentication**: Secure login and registration with JWT.
*   **Role-Based Access Control**:
    *   **Admin**: Full access to manage users (approve/reject), view system logs, and manage inventory.
    *   **Employee**: Restricted access to inventory management.
*   **Inventory Management**: Track product details, stock levels, and suppliers.
*   **Transaction Tracking**: Record stock-in and stock-out movements.
*   **Reporting**: View login logs and transaction history.
*   **Responsive UI**: Clean, mobile-friendly interface.

## 🛠️ Tech Stack

*   **Backend**: Python, Flask
*   **Database**: SQLite (via Flask-SQLAlchemy)
*   **Authentication**: PyJWT, Werkzeug Security
*   **Frontend**: HTML5, CSS3, JavaScript
*   **Extensions**: Flask-Cors, Flask-Migrate

## 📦 Installation

1.  **Clone the repository** or download the source code.
2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Configure Environment**:
    *   Ensure you have a `.env` file if required (or rely on default `config.py` settings).

## 🏃 Usage

### 1. Initialize the Database
Before running the app for the first time, initialize the database and seed the default admin account:
```bash
python reset_db.py
```
*   *Warning: This wipes the existing `inventory.db` and resets it.*

### 2. Start the Application
```bash
python app.py
```
The server will start at `http://localhost:5000`.

### 3. Utility Scripts
*   **Check Users**: Run `python check_users.py` to list all registered users and their status.
*   **Reset DB**: Run `python reset_db.py` to factory reset the database.

---

## 👑 How to become an Admin

There are **two ways** to get Admin access in this system:

### Method 1: Default Admin (Recommended for first login)
Run the database reset script:
```bash
python reset_db.py
```
This automatically creates a default admin account:
*   **Username**: `admin`
*   **Password**: `adminpass`

### Method 2: First User Registration
If the database is empty (no users exist), the **first person to register** via the "Register" page will automatically be assigned the **Admin** role and status **Approved**.

### Granting Access to Others (Admin Only)
For any subsequent users who register:
1.  They will register as an **Employee** with **Pending** status.
2.  The Admin must log in.
3.  Go to the **Pending Users** section (usually on the Dashboard).
4.  Click **Approve** to grant them access or **Reject** to delete the request.
    *   *Note: Only 'Approved' users can validly log in.*

## 📋 API Endpoints

*   **Auth**: `/api/auth/login`, `/api/auth/register`
*   **Products**: `/api/products` (GET, POST, PUT, DELETE)
*   **Transactions**: `/api/transactions`
*   **Reports**: `/api/reports`
