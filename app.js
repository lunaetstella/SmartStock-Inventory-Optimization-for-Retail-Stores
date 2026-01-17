document.addEventListener('DOMContentLoaded', () => {
    console.log('Smart Inventory System Loaded');
    checkAuth();

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Toggle Auth Forms
    const registerLink = document.getElementById('show-register-link');
    if (registerLink) {
        registerLink.addEventListener('click', () => {
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('show-register-link').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
            document.getElementById('show-login-link').classList.remove('hidden');
        });
    }

    const loginLink = document.getElementById('show-login-link');
    if (loginLink) {
        loginLink.addEventListener('click', () => {
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('show-login-link').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('show-register-link').classList.remove('hidden');
        });
    }
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        showLogin();
    } else {
        // Optional: specific token validation call here
        showDashboard();
    }
}

function showLogin() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app-interface').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-interface').classList.remove('hidden');

    const userRole = localStorage.getItem('user_role');
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('user-display').innerHTML = `
            <div style="text-align: right;">
                <div style="font-weight: bold; color: var(--primary-color);">${username}</div>
                <div style="font-size: 0.8rem; color: #7f8c8d; text-transform: uppercase;">${userRole}</div>
            </div>
         `;
    }

    // Update Sidebar for Admin
    if (userRole === 'admin') {
        // Check if Admin link already exists to avoid duplicates
        if (!document.getElementById('nav-admin-pending')) {
            const navUl = document.querySelector('#sidebar nav ul');
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" id="nav-admin-pending" onclick="navigateTo('admin-pending')"><i class="fas fa-users-cog"></i> Pending Users</a>`;
            navUl.appendChild(li);
        }
        if (!document.getElementById('nav-admin-logs')) {
            const navUl = document.querySelector('#sidebar nav ul');
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" id="nav-admin-logs" onclick="navigateTo('admin-logs')"><i class="fas fa-history"></i> Employee Logs</a>`;
            navUl.appendChild(li);
        }
    }

    loadDashboardStats();
}

async function logout() {
    try {
        await apiCall('/auth/logout', 'POST');
    } catch (e) {
        console.log('Logout API failed', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('username');
    // Reload to reset sidebar and state
    window.location.reload();
}

// Placeholder for API calls
const API_BASE = '/api';

async function apiCall(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = {
        method,
        headers,
    };
    if (body) config.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'API Error');
        return data;
    } catch (error) {
        console.error('API Call Failed:', error);
        // Only logout if 401 and we are not already on login screen (to avoid loops if login fails)
        if ((error.message.includes('Token') || error.message.includes('Invalid credentials') && endpoint !== '/auth/login')) {
            // Optional: handle session expiry
        }
        throw error;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const alertBox = document.getElementById('login-alert');

    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
        const data = await apiCall('/auth/login', 'POST', { username, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user_role', data.role);
        localStorage.setItem('username', data.username);
        alertBox.style.display = 'none';
        usernameInput.value = '';
        passwordInput.value = '';
        showDashboard();
    } catch (error) {
        alertBox.innerText = error.message;
        alertBox.style.display = 'block';
        alertBox.classList.add('alert-error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const alertBox = document.getElementById('login-alert'); // Recycle login alert box

    try {
        const data = await apiCall('/auth/register', 'POST', { name, email, username, password });
        alertBox.innerText = data.message;
        alertBox.style.display = 'block';
        alertBox.classList.remove('alert-error');
        alertBox.classList.add('alert-success');

        // Reset form and switch to login
        e.target.reset();
        document.getElementById('show-login-link').click();
    } catch (error) {
        alertBox.innerText = error.message;
        alertBox.style.display = 'block';
        alertBox.classList.remove('alert-success');
        alertBox.classList.add('alert-error');
    }
}

// Dashboard Logic
async function loadDashboardStats() {
    try {
        const stats = await apiCall('/reports/stats');
        console.log("Loading stats...", stats);
        if (stats.total_products !== undefined) document.getElementById('stats-total-products').innerText = stats.total_products;
        if (stats.low_stock_count !== undefined) document.getElementById('stats-low-stock').innerText = stats.low_stock_count;
        if (stats.recent_transactions !== undefined) document.getElementById('stats-recent-tx').innerText = stats.recent_transactions;

        // Initialize Chart
        const ctx = document.getElementById('inventoryChart');
        if (ctx) {
            // Fetch products and group by category for the chart.
            const pData = await apiCall('/products');
            const categories = {};
            pData.products.forEach(p => {
                const cat = p.category || 'Other';
                categories[cat] = (categories[cat] || 0) + p.stock_quantity;
            });

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(categories),
                    datasets: [{
                        label: 'Stock Quantity',
                        data: Object.values(categories),
                        backgroundColor: 'rgba(52, 152, 219, 0.7)',
                        borderColor: '#2980b9',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#ecf0f1' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

    } catch (e) {
        console.log("Failed to load stats yet (maybe endpoint not ready)", e);
    }
}

// Navigation
function navigateTo(page) {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');

    // Update Sidebar
    document.querySelectorAll('#sidebar a').forEach(a => a.classList.remove('active'));
    // Find the link that was clicked (approximate) or loop to find text
    const links = document.querySelectorAll('#sidebar a');
    links.forEach(l => {
        if (l.textContent.toLowerCase().includes(page === 'transactions' ? 'stock' : page) || l.getAttribute('onclick')?.includes(page)) {
            l.classList.add('active');
        } else {
            l.classList.remove('active');
        }
    });

    if (page === 'dashboard') {
        pageTitle.innerText = 'Dashboard Overview';
        contentArea.innerHTML = `
            <div class="dashboard-cards">
                <div class="card" style="border-left-color: #3498db;">
                    <div style="font-size: 0.8rem; text-transform: uppercase; color: #7f8c8d; font-weight: 600;">Total Products</div>
                    <div class="value" id="stats-total-products">0</div>
                    <div style="font-size: 0.8rem; color: #95a5a6; margin-top: 5px;">In Inventory</div>
                </div>
                <div class="card" style="border-left-color: #e74c3c;">
                    <div style="font-size: 0.8rem; text-transform: uppercase; color: #7f8c8d; font-weight: 600;">Low Stock Alerts</div>
                    <div class="value" style="color: var(--danger-color);" id="stats-low-stock">0</div>
                     <div style="font-size: 0.8rem; color: #95a5a6; margin-top: 5px;">Action Needed</div>
                </div>
                <div class="card" style="border-left-color: #2ecc71;">
                     <div style="font-size: 0.8rem; text-transform: uppercase; color: #7f8c8d; font-weight: 600;">Recent Transactions</div>
                    <div class="value" id="stats-recent-tx">0</div>
                     <div style="font-size: 0.8rem; color: #95a5a6; margin-top: 5px;">Last 24 Hours</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <div class="card" style="text-align: left; height: 400px; display: flex; flex-direction: column;">
                     <h3 style="margin-bottom: 15px; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 10px;">Inventory Distribution (By Category)</h3>
                     <div style="flex: 1; position: relative;">
                        <canvas id="inventoryChart"></canvas>
                     </div>
                </div>
                <div class="card" style="text-align: left;">
                     <h3 style="margin-bottom: 15px; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 10px;">Quick Actions</h3>
                     <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button class="btn btn-primary" onclick="navigateTo('products')"><i class="fas fa-box"></i> Manage Products</button>
                        <button class="btn btn-success" onclick="navigateTo('transactions')"><i class="fas fa-exchange-alt"></i> Record Stock In</button>
                        <button class="btn btn-danger" onclick="navigateTo('transactions')"><i class="fas fa-dolly"></i> Record Stock Out</button>
                     </div>
                </div>
            </div>
            `;
        loadDashboardStats();
    } else if (page === 'products') {
        pageTitle.innerText = 'Product Management';
        loadProductsView();
    } else if (page === 'transactions') {
        pageTitle.innerText = 'Stock Operations';
        loadTransactionsView();
    } else if (page === 'reports') {
        pageTitle.innerText = 'Reports';
        loadReportsView();
    } else if (page === 'admin-pending') {
        pageTitle.innerText = 'Pending Approvals';
        loadAdminPendingView();
    } else if (page === 'admin-logs') {
        pageTitle.innerText = 'Employee Logs';
        loadAdminLogsView();
    }
}

// Reports
function loadReportsView() {
    const contentArea = document.getElementById('content-area');
    const userRole = localStorage.getItem('user_role');

    let html = `
        <div class="actions" style="margin-bottom: 20px;">
            <h3>Information</h3>
            <p>Generate reports for inventory analysis.</p>
        </div>

        <div class="dashboard-cards">
             <div class="card">
                <h3>Product Inventory</h3>
                <p>Full list of products and current stock.</p>
                ${userRole === 'admin' ?
            `<button class="btn btn-success" onclick="downloadReport('csv')"><i class="fas fa-file-csv"></i> Export CSV</button>` :
            `<p style="color:gray; font-size:0.9rem;">Admin Access Required for Export</p>`}
            </div>
        </div>
    `;
    contentArea.innerHTML = html;
}

async function downloadReport(type) {
    if (type === 'csv') {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/reports/export/csv', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'inventory_report.csv';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert('Failed to download report');
            }
        } catch (e) {
            console.error(e);
            alert('Error downloading report');
        }
    }
}


// Product Management
async function loadProductsView() {
    const contentArea = document.getElementById('content-area');
    const userRole = localStorage.getItem('user_role');

    let html = `
        <div class="actions" style="margin-bottom: 20px;">
            ${userRole === 'admin' ? '<button class="btn btn-primary" onclick="showAddProductModal()">+ Add Product</button>' : ''}
            <input type="text" id="product-search" placeholder="Search products..." style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 200px;" onkeyup="filterProducts()">
        </div>
        
        <!-- Add Product Form (Hidden by default, or modal) -->
        <div id="add-product-form-container" style="display:none; background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3>Add New Product</h3>
            <form id="add-product-form">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" name="sku" placeholder="SKU" required style="padding: 8px; border: 1px solid #ddd;">
                    <input type="text" name="name" placeholder="Product Name" required style="padding: 8px; border: 1px solid #ddd;">
                    <input type="text" name="category" placeholder="Category" style="padding: 8px; border: 1px solid #ddd;">
                    <input type="text" name="supplier" placeholder="Supplier" style="padding: 8px; border: 1px solid #ddd;">
                    <input type="number" name="price" placeholder="Price" step="0.01" required style="padding: 8px; border: 1px solid #ddd;">
                    <input type="number" name="stock_quantity" placeholder="Initial Stock" required style="padding: 8px; border: 1px solid #ddd;">
                    <input type="number" name="min_stock_threshold" placeholder="Min Stock Threshold" value="10" style="padding: 8px; border: 1px solid #ddd;">
                </div>
                <div style="margin-top: 15px;">
                    <button type="submit" class="btn btn-success">Save Product</button>
                    <button type="button" class="btn btn-danger" onclick="document.getElementById('add-product-form-container').style.display='none'">Cancel</button>
                </div>
            </form>
        </div>

        <table id="products-table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    ${userRole === 'admin' ? '<th>Actions</th>' : ''}
                </tr>
            </thead>
            <tbody id="products-table-body">
                <tr><td colspan="7">Loading...</td></tr>
            </tbody>
        </table>
    `;

    contentArea.innerHTML = html;

    // Attach Event Listener for Form
    if (userRole === 'admin') {
        document.getElementById('add-product-form').addEventListener('submit', handleAddProduct);
    }

    try {
        const data = await apiCall('/products');
        renderProductsTable(data.products);
    } catch (e) {
        contentArea.innerHTML += `<p style="color:red">Error loading products: ${e.message}</p>`;
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-table-body');
    const userRole = localStorage.getItem('user_role');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No products found.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        const status = p.stock_quantity <= p.min_stock_threshold ?
            `<span style="color:red; font-weight:bold;">Low Stock</span>` :
            `<span style="color:green;">In Stock</span>`;

        return `
            <tr>
                <td>${p.sku}</td>
                <td>${p.name}</td>
                <td>${p.category || '-'}</td>
                <td>₹${p.price.toFixed(2)}</td>
                <td>${p.stock_quantity}</td>
                <td>${status}</td>
                ${userRole === 'admin' ? `
                <td>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;" onclick="deleteProduct(${p.id})">Delete</button>
                </td>` : ''}
            </tr>
        `;
    }).join('');
}

function showAddProductModal() {
    document.getElementById('add-product-form-container').style.display = 'block';
}

async function handleAddProduct(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productData = Object.fromEntries(formData.entries());

    try {
        await apiCall('/products', 'POST', productData);
        alert('Product added successfully!');
        e.target.reset();
        document.getElementById('add-product-form-container').style.display = 'none';
        loadProductsView(); // Refresh list
    } catch (e) {
        alert('Failed to add product: ' + e.message);
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await apiCall(`/products/${id}`, 'DELETE');
        loadProductsView();
    } catch (e) {
        alert('Failed to delete: ' + e.message);
    }
}

function filterProducts() {
    const query = document.getElementById('product-search').value.toLowerCase();
    const rows = document.querySelectorAll('#products-table-body tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// Transaction Management
async function loadTransactionsView() {
    const contentArea = document.getElementById('content-area');

    let html = `
        <div class="actions" style="margin-bottom: 20px;">
           <!-- Transaction Form -->
           <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <h3>Record Stock Operation</h3>
                <form id="transaction-form" style="display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;">
                    <div style="display: flex; flex-direction: column;">
                        <label>Product</label>
                        <select id="tx-product-select" name="product_id" required style="padding: 8px; border: 1px solid #ddd; min-width: 200px;">
                            <option value="">Loading products...</option>
                        </select>
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <label>Type</label>
                        <select name="transaction_type" required style="padding: 8px; border: 1px solid #ddd;">
                            <option value="in">Stock In (+)</option>
                            <option value="out">Stock Out (-)</option>
                        </select>
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <label>Quantity</label>
                        <input type="number" name="quantity" min="1" required style="padding: 8px; border: 1px solid #ddd; width: 100px;">
                    </div>
                    <button type="submit" class="btn btn-primary" style="height: 36px;">Submit</button>
                </form>
           </div>
        </div>

        <h3>Transaction History</h3>
        <table id="tx-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>User</th>
                </tr>
            </thead>
            <tbody id="tx-table-body">
                <tr><td colspan="5">Loading...</td></tr>
            </tbody>
        </table>
    `;

    contentArea.innerHTML = html;

    document.getElementById('transaction-form').addEventListener('submit', handleTransaction);

    // Load Products for Select
    try {
        const pData = await apiCall('/products');
        const select = document.getElementById('tx-product-select');
        select.innerHTML = '<option value="">-- Select Product --</option>' +
            pData.products.map(p => `<option value="${p.id}">${p.sku} - ${p.name} (Stock: ${p.stock_quantity})</option>`).join('');
    } catch (e) {
        console.error("Failed to load products for dropdown", e);
    }

    // Load History
    loadTransactionHistory();
}

async function loadTransactionHistory() {
    const tbody = document.getElementById('tx-table-body');
    try {
        const data = await apiCall('/transactions');
        if (data.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No transactions found.</td></tr>';
            return;
        }
        tbody.innerHTML = data.transactions.map(t => `
            <tr>
                <td>${new Date(t.timestamp).toLocaleString()}</td>
                <td>${t.product_sku} - ${t.product_name}</td>
                <td>
                    <span style="color: ${t.transaction_type === 'in' ? 'green' : 'red'}; font-weight: bold;">
                        ${t.transaction_type.toUpperCase()}
                    </span>
                </td>
                <td>${t.quantity}</td>
                <td>${t.user}</td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red">${e.message}</td></tr>`;
    }
}

async function handleTransaction(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        await apiCall('/transactions', 'POST', data);
        alert('Transaction recorded!');
        e.target.reset();
        loadTransactionHistory(); // Refresh table
        // Also refresh product list in dropdown to show new stock? 
        // Ideally yes, but for MVP maybe just letting them know is fine or re-fetch.
        // Let's re-fetch products to update stock in dropdown
        const pData = await apiCall('/products');
        const select = document.getElementById('tx-product-select');
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Select Product --</option>' +
            pData.products.map(p => `<option value="${p.id}">${p.sku} - ${p.name} (Stock: ${p.stock_quantity})</option>`).join('');
        select.value = ""; // Reset selection
    } catch (e) {
        alert('Transaction Failed: ' + e.message);
    }
}

// Admin Pending Users
async function loadAdminPendingView() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '<h3>Pending User Approvals</h3><div id="pending-users-list">Loading...</div>';

    try {
        const data = await apiCall('/auth/pending');
        const container = document.getElementById('pending-users-list');
        if (!data.users || data.users.length === 0) {
            container.innerHTML = '<p>No pending users found.</p>';
            return;
        }

        container.innerHTML = `
        <div class="table-container" style="overflow-x: auto;">
        <table id="pending-table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.users.map(u => `
                <tr>
                    <td>${u.username}</td>
                    <td>${u.name || '-'}</td>
                    <td>${u.email || '-'}</td>
                    <td>
                        <button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="approveUser(${u.id})">Approve</button>
                        <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="rejectUser(${u.id})">Reject</button>
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        </div>
       `;
    } catch (e) {
        contentArea.innerHTML = `<p style="color:red">Error loading pending users: ${e.message}</p>`;
    }
}

async function approveUser(id) {
    if (!confirm('Approve this user?')) return;
    try {
        await apiCall(`/auth/approve/${id}`, 'PUT');
        alert('User Approved');
        loadAdminPendingView();
    } catch (e) {
        alert(e.message);
    }
}

async function rejectUser(id) {
    if (!confirm('Reject/Delete this user?')) return;
    try {
        await apiCall(`/auth/reject/${id}`, 'DELETE');
        alert('User Rejected');
        loadAdminPendingView();
    } catch (e) {
        alert(e.message);
    }
}


async function loadAdminLogsView() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '<h3>Employee Login Logs</h3><div id="logs-list">Loading...</div>';

    try {
        const data = await apiCall('/auth/logs');
        const logs = data.logs;

        let html = `
        <div class="table-container">
        <table id="logs-table">
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Login Time</th>
                    <th>Logout Time</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
        `;

        if (logs.length === 0) {
            html += '<tr><td colspan="5">No logs found.</td></tr>';
        } else {
            logs.forEach(log => {
                const loginDate = new Date(log.login_time);
                const logoutDate = log.logout_time ? new Date(log.logout_time) : null;
                const duration = logoutDate ? Math.round((logoutDate - loginDate) / 60000) + ' mins' : 'Active';

                html += `
                <tr>
                    <td>${log.name || log.username}</td>
                    <td>${log.role}</td>
                    <td>${loginDate.toLocaleString()}</td>
                    <td>${logoutDate ? logoutDate.toLocaleString() : '-'}</td>
                    <td>${duration}</td>
                </tr>
                `;
            });
        }

        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;
    } catch (e) {
        contentArea.innerHTML = `<p style="color:red">Error loading logs: ${e.message}</p>`;
    }
}
