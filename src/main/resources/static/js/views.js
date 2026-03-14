const Views = {
    init() {
        this.container = document.getElementById('view-container');
        this._chartInstances = {};
    },

    async render(viewName) {
        this.container.innerHTML = `<div class="p-5 text-center"><i class="ri-loader-4-line ri-spin" style="font-size: 2rem;"></i> Loading...</div>`;
        this.destroyCharts();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const isManager = user && (user.role === 'MANAGER' || user.role === 'ADMIN');
            switch(viewName) {
                case 'dashboard':
                    await this.renderManagerDashboard();
                    break;
                case 'products': await this.renderProducts(); break;
                case 'low-stock': await this.renderLowStock(); break;
                case 'orders': case 'orders-receipts':
                    if (isManager) await this.renderManagerOrders('receipts');
                    else await this.renderStaffOrders('receipts');
                    break;
                case 'orders-deliveries':
                    if (isManager) await this.renderManagerOrders('deliveries');
                    else await this.renderStaffOrders('deliveries');
                    break;
                case 'transfers': await this.renderTransfers(); break;
                case 'adjustments': await this.renderOperationForm('adjustments'); break;
                case 'history': await this.renderHistory(); break;
                case 'profile': await this.renderProfile(); break;
                case 'pendingReceipts':
                    if (isManager) await this.renderManagerOrders('receipts');
                    else await this.renderPendingOrders('receipts');
                    break;
                case 'pendingDeliveries':
                    if (isManager) await this.renderManagerOrders('deliveries');
                    else await this.renderPendingOrders('deliveries');
                    break;
            }
        } catch(e) {
            this.container.innerHTML = `<div class="p-5 text-center text-danger">Failed to load view: ${e.message}</div>`;
            console.error(e);
        }
    },

    destroyCharts() {
        Object.values(this._chartInstances).forEach(c => c.destroy());
        this._chartInstances = {};
    },

    // ===== MANAGER DASHBOARD =====
    async renderManagerDashboard() {
        const data = await ApiService.get('/dashboard/manager-overview');
        const sections = [
            { key: 'totalProducts', label: 'Total Products', count: data.totalProducts, icon: 'ri-box-3-fill', bgClass: 'bg-primary-light', view: 'products', previewHtml: this.buildProductsPreview(data.products) },
            { key: 'lowStock', label: 'Low Stock', count: data.lowStockCount, icon: 'ri-alarm-warning-fill', bgClass: 'bg-danger-light', view: 'low-stock', previewHtml: this.buildLowStockPreview(data.lowStockProducts) },
            { key: 'pendingReceipts', label: 'Pending Receipts', count: data.pendingReceiptsCount, icon: 'ri-download-cloud-fill', bgClass: 'bg-success-light', view: 'orders-receipts', previewHtml: this.buildTransactionPreview(data.pendingReceiptsList, 'Receipt') },
            { key: 'pendingDeliveries', label: 'Pending Delivery', count: data.pendingDeliveriesCount, icon: 'ri-truck-fill', bgClass: 'bg-warning-light', view: 'orders-deliveries', previewHtml: this.buildTransactionPreview(data.pendingDeliveriesList, 'Delivery') },
            { key: 'transfers', label: 'Internal Transfers', count: data.transfersCount, icon: 'ri-arrow-left-right-fill', bgClass: 'bg-info-light', view: 'transfers', previewHtml: this.buildTransactionPreview(data.transfersList, 'Transfer') }
        ];

        // Default overview = recent activity table
        const defaultPreview = this.buildRecentActivityPreview(data.recentActivity);

        const cardsHtml = sections.map((s, i) => `
            <div class="section-card" data-section-index="${i}" data-view="${s.view}">
                <div class="card-icon ${s.bgClass}"><i class="${s.icon}"></i></div>
                <div class="card-count">${s.count}</div>
                <div class="card-label">${s.label}</div>
            </div>
        `).join('');

        const previewsHtml = sections.map((s, i) => `
            <div class="preview-panel" id="preview-${i}">
                <h4><i class="${s.icon}" style="color: var(--primary);"></i> ${s.label} — Overview</h4>
                ${s.previewHtml}
            </div>
        `).join('');

        this.container.innerHTML = `
            <div class="manager-dashboard">
                <div class="section-cards-row">${cardsHtml}</div>

                <div id="preview-container">
                    <div class="preview-panel active" id="preview-default">
                        <h4><i class="ri-dashboard-fill" style="color: var(--primary);"></i> Recent Activity — Overview</h4>
                        ${defaultPreview}
                    </div>
                    ${previewsHtml}
                </div>

                <div class="dashboard-charts-row">
                    <div class="chart-card">
                        <h4><i class="ri-bar-chart-fill" style="color: var(--primary);"></i> Inventory Activity</h4>
                        <canvas id="activityChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h4><i class="ri-pie-chart-fill" style="color: var(--primary);"></i> Products by Category</h4>
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            // Section card hover & click
            document.querySelectorAll('.section-card').forEach(card => {
                card.addEventListener('mouseenter', () => {
                    const idx = card.dataset.sectionIndex;
                    document.querySelectorAll('.preview-panel').forEach(p => p.classList.remove('active'));
                    const panel = document.getElementById(`preview-${idx}`);
                    if (panel) panel.classList.add('active');
                });
                card.addEventListener('mouseleave', () => {
                    document.querySelectorAll('.preview-panel').forEach(p => p.classList.remove('active'));
                    document.getElementById('preview-default').classList.add('active');
                });
                card.addEventListener('click', () => {
                    const view = card.dataset.view;
                    if (view) {
                        document.querySelectorAll('.top-nav-links li').forEach(l => {
                            l.classList.remove('active');
                            if (view.startsWith('orders') && l.dataset.view === 'orders') l.classList.add('active');
                            else if (l.dataset.view === view) l.classList.add('active');
                        });
                        App.navigate(view);
                    }
                });
            });

            // Charts
            this.renderActivityChart(data.activityLabels, data.activityCounts);
            this.renderCategoryChart(data.categoryLabels, data.categoryCounts);
        }, 50);
    },

    buildRecentActivityPreview(txList) {
        if (!txList || txList.length === 0) return '<p class="empty-msg">No recent activity to show.</p>';
        const badgeMap = { 'RECEIPT': 'badge-success', 'DELIVERY': 'badge-primary', 'TRANSFER': 'badge-info', 'ADJUSTMENT': 'badge-warning' };
        const statusMap = { 'DONE': 'badge-success', 'WAITING': 'badge-warning', 'READY': 'badge-primary', 'CANCELED': 'badge-danger' };
        return `<table><thead><tr><th>Date</th><th>Type</th><th>Product</th><th>Qty</th><th>Status</th></tr></thead><tbody>
            ${txList.slice(0, 7).map(t => `<tr><td>${t.timestamp ? new Date(t.timestamp).toLocaleDateString() : '—'}</td><td><span class="badge ${badgeMap[t.type] || ''}">${t.type}</span></td><td>${t.product ? t.product.name : '—'}</td><td><strong>${t.quantity}</strong></td><td><span class="badge ${statusMap[t.status] || ''}">${t.status}</span></td></tr>`).join('')}
        </tbody></table>`;
    },

    buildProductsPreview(products) {
        if (!products || products.length === 0) return '<p class="empty-msg">No products yet.</p>';
        return `<table><thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Stock</th><th>Location</th></tr></thead><tbody>
            ${products.slice(0, 7).map(p => `<tr><td><strong>${p.name}</strong></td><td><span class="badge badge-primary">${p.sku}</span></td><td>${p.category}</td><td><span class="badge ${p.currentStock > 10 ? 'badge-success' : 'badge-danger'}">${p.currentStock}</span></td><td>${p.location || '—'}</td></tr>`).join('')}
        </tbody></table>`;
    },
    buildLowStockPreview(products) {
        if (!products || products.length === 0) return '<p class="empty-msg">All items are well-stocked! 🎉</p>';
        return `<table><thead><tr><th>Name</th><th>SKU</th><th>Stock</th></tr></thead><tbody>
            ${products.slice(0, 7).map(p => `<tr><td><strong>${p.name}</strong></td><td><span class="badge badge-primary">${p.sku}</span></td><td><span class="badge badge-danger">${p.currentStock}</span></td></tr>`).join('')}
        </tbody></table>`;
    },
    buildTransactionPreview(transactions, type) {
        if (!transactions || transactions.length === 0) return `<p class="empty-msg">No pending ${type.toLowerCase()}s.</p>`;
        return `<table><thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Status</th></tr></thead><tbody>
            ${transactions.slice(0, 7).map(t => `<tr><td>${t.timestamp ? new Date(t.timestamp).toLocaleDateString() : '—'}</td><td>${t.product ? t.product.name : 'Unknown'}</td><td><strong>${t.quantity}</strong></td><td><span class="badge badge-warning">${t.status}</span></td></tr>`).join('')}
        </tbody></table>`;
    },

    // ===== CHARTS =====
    renderActivityChart(labels, counts) {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;
        const labelsArr = Array.from(labels);
        const countsArr = Array.from(counts);
        this._chartInstances.activity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labelsArr,
                datasets: [{
                    label: 'Transactions',
                    data: countsArr,
                    backgroundColor: ['rgba(99, 102, 241, 0.75)', 'rgba(16, 185, 129, 0.75)', 'rgba(59, 130, 246, 0.75)', 'rgba(245, 158, 11, 0.75)'],
                    borderColor: ['#6366f1', '#10b981', '#3b82f6', '#f59e0b'],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Inter' } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { ticks: { font: { family: 'Inter', weight: 500 } }, grid: { display: false } }
                }
            }
        });
    },

    renderCategoryChart(labels, counts) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;
        const labelsArr = Array.from(labels);
        const countsArr = Array.from(counts);
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];
        this._chartInstances.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labelsArr,
                datasets: [{
                    data: countsArr,
                    backgroundColor: colors.slice(0, labelsArr.length),
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15, font: { family: 'Inter', size: 12 }, usePointStyle: true } }
                }
            }
        });
    },

    // ===== STAFF DASHBOARD =====
    async renderDashboard() {
        const kpis = await ApiService.get('/dashboard/kpis');
        this.container.innerHTML = `
            <div class="kpi-grid">
                <div class="glass-card"><div class="kpi-card"><div class="kpi-icon bg-primary-light"><i class="ri-box-3-fill"></i></div><div class="kpi-info"><h3>${kpis.totalProducts}</h3><p>Total Products</p></div></div></div>
                <div class="glass-card"><div class="kpi-card"><div class="kpi-icon bg-danger-light" style="background: rgba(239,68,68,0.2); color:#f87171;"><i class="ri-alarm-warning-fill"></i></div><div class="kpi-info"><h3>${kpis.lowStockItems}</h3><p>Low Stock Alerts</p></div></div></div>
                <div class="glass-card"><div class="kpi-card"><div class="kpi-icon bg-success-light"><i class="ri-download-cloud-fill"></i></div><div class="kpi-info"><h3>${kpis.pendingReceipts}</h3><p>Pending Receipts</p></div></div></div>
                <div class="glass-card"><div class="kpi-card"><div class="kpi-icon bg-warning-light"><i class="ri-truck-fill"></i></div><div class="kpi-info"><h3>${kpis.pendingDeliveries}</h3><p>Pending Deliveries</p></div></div></div>
            </div>
        `;
    },

    // ===== PRODUCTS PAGE =====
    _productSortField: null,
    _productSortAsc: true,
    _productSearchQuery: '',

    async renderProducts() {
        let products = await ApiService.get('/products');
        const user = JSON.parse(localStorage.getItem('user'));
        const isManager = user && (user.role === 'MANAGER' || user.role === 'ADMIN');

        if (this._productSearchQuery) {
            const q = this._productSearchQuery.toLowerCase();
            products = products.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)));
        }

        if (this._productSortField) {
            const field = this._productSortField;
            const dir = this._productSortAsc ? 1 : -1;
            products.sort((a, b) => {
                const va = (a[field] || '').toString().toLowerCase();
                const vb = (b[field] || '').toString().toLowerCase();
                return va < vb ? -dir : va > vb ? dir : 0;
            });
        }
        const renderTable = (prodList) => {
            let html = prodList.map(p => `
                <tr class="product-row" data-product-id="${p.id}">
                    <td>#${p.id}</td><td><strong>${p.name}</strong></td>
                    <td><span class="badge badge-primary">${p.sku}</span></td>
                    <td>${p.category || '—'}</td>
                    <td><span class="badge ${p.currentStock > 10 ? 'badge-success' : 'badge-danger'}">${p.currentStock}</span></td>
                    <td>${p.uom || '—'}</td><td>${p.location || '—'}</td>
                    ${isManager ? `<td><button class="btn-delete-product" data-id="${p.id}" title="Delete" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:1.1rem;"><i class="ri-delete-bin-6-line"></i></button></td>` : ''}
                </tr>
            `).join('');
            if(prodList.length === 0) {
                html = `<tr><td colspan="${isManager ? 8 : 7}" class="text-center text-muted">No products found.</td></tr>`;
            }
            return html;
        };

        const sortIcon = (field) => {
            if (this._productSortField !== field) return '<i class="ri-arrow-up-down-line"></i>';
            return this._productSortAsc ? '<i class="ri-arrow-up-s-line"></i>' : '<i class="ri-arrow-down-s-line"></i>';
        };

        // Only render the full layout if the search box isn't already there
        if (!document.getElementById('product-search')) {
            this.container.innerHTML = `
                <div class="products-page">
                    <div class="products-toolbar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                        <div class="search-box" style="position:relative; width: 300px;">
                            <i class="ri-search-line" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
                            <input type="text" id="product-search" placeholder="Search by Name or SKU..." value="${this._productSearchQuery}" style="width:100%; padding:0.6rem 1rem 0.6rem 2.2rem; border-radius:var(--radius-md); border:1px solid var(--border); outline:none; font-family:'Inter'; background:var(--bg-surface); color:var(--text-main);">
                        </div>
                        ${isManager ? '<button class="btn btn-primary" id="btn-add-product"><i class="ri-add-line"></i> Add Product</button>' : ''}
                    </div>
                    <div class="products-table-wrap">
                        <table>
                            <thead><tr>
                                <th>ID</th><th>Name</th><th>SKU</th>
                                <th class="sortable-th" data-sort="category" style="cursor:pointer">Category ${sortIcon('category')}</th>
                                <th>Stock</th><th>UOM</th>
                                <th class="sortable-th" data-sort="location" style="cursor:pointer">Location ${sortIcon('location')}</th>
                                ${isManager ? '<th>Actions</th>' : ''}
                            </tr></thead>
                            <tbody id="products-tbody">
                                ${renderTable(products)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            // Un-spin existing sort icons and re-render them
            document.querySelectorAll('.sortable-th').forEach(th => {
                const field = th.dataset.sort;
                th.innerHTML = (field === 'category' ? 'Category ' : 'Location ') + sortIcon(field);
            });
            document.getElementById('products-tbody').innerHTML = renderTable(products);
        }

        setTimeout(() => {
            const searchInput = document.getElementById('product-search');
            // Remove old listener to avoid dupes if re-rendering completely
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
            
            newSearchInput.addEventListener('input', (e) => {
                this._productSearchQuery = e.target.value;
                this.renderProducts();
            });
            newSearchInput.focus();

            const addBtn = document.getElementById('btn-add-product');
            if (addBtn) {
                const newAddBtn = addBtn.cloneNode(true);
                addBtn.parentNode.replaceChild(newAddBtn, addBtn);
                newAddBtn.addEventListener('click', () => this.showProductModal(null));
            }

            document.querySelectorAll('.sortable-th').forEach(th => {
                const newTh = th.cloneNode(true);
                th.parentNode.replaceChild(newTh, th);
                newTh.addEventListener('click', () => {
                    const field = newTh.dataset.sort;
                    if (this._productSortField === field) this._productSortAsc = !this._productSortAsc;
                    else { this._productSortField = field; this._productSortAsc = true; }
                    this.renderProducts();
                });
            });
            
            document.querySelectorAll('.product-row').forEach(row => {
                row.addEventListener('click', async (e) => {
                    if (!isManager) return;
                    if (e.target.closest('.btn-delete-product')) return;
                    try {
                        const product = await ApiService.get(`/products/${row.dataset.productId}`);
                        this.showProductModal(product);
                    } catch (e) { App.showToast('Failed to load product', 'error'); }
                });
            });
            // Delete buttons
            document.querySelectorAll('.btn-delete-product').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const productId = btn.dataset.id;
                    if (confirm('Are you sure you want to delete this product?')) {
                        try {
                            await ApiService.delete(`/products/${productId}`);
                            App.showToast('Product deleted!', 'success');
                            this.renderProducts();
                        } catch (err) { App.showToast(err.message || 'Delete failed', 'error'); }
                    }
                });
            });
        }, 50);
    },

    // ===== LOW STOCK PAGE =====
    async renderLowStock() {
        let products = await ApiService.get('/products');
        products = products.filter(p => p.currentStock <= 10);
        
        this.container.innerHTML = `
            <div class="products-page">
                <div class="products-toolbar" style="margin-bottom: 1.5rem;">
                    <h2 style="font-size:1.4rem; color:var(--text-main); margin:0; display:flex; align-items:center; gap:0.5rem;"><i class="ri-alarm-warning-fill" style="color:var(--danger)"></i> Low Stock Alerts</h2>
                </div>
                <div class="products-table-wrap">
                    <table>
                        <thead><tr>
                            <th>ID</th><th>Name</th><th>SKU</th>
                            <th>Category</th><th>Stock</th><th>Location</th>
                        </tr></thead>
                        <tbody>
                            ${products.map(p => `
                                <tr>
                                    <td>#${p.id}</td><td><strong>${p.name}</strong></td>
                                    <td><span class="badge badge-primary">${p.sku}</span></td>
                                    <td>${p.category || '—'}</td>
                                    <td><span class="badge badge-danger">${p.currentStock}</span></td>
                                    <td>${p.location || '—'}</td>
                                </tr>
                            `).join('')}
                            ${products.length === 0 ? `<tr><td colspan="6" class="text-center text-muted">No low stock items. All good! 🎉</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    showProductModal(product) {
        const isEdit = !!product;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-card">
                <h3><i class="${isEdit ? 'ri-edit-line' : 'ri-add-line'}"></i> ${isEdit ? 'Edit Product' : 'Add New Product'}</h3>
                <form id="product-modal-form">
                    <div class="form-group"><label>Product Name</label><input type="text" id="pm-name" value="${isEdit ? product.name : ''}" required></div>
                    <div class="form-group"><label>SKU (Unique)</label><input type="text" id="pm-sku" value="${isEdit ? product.sku : ''}" required ${isEdit ? 'readonly style="background:#f0f0f0;"' : ''}></div>
                    <div class="form-group"><label>Category</label><input type="text" id="pm-category" value="${isEdit ? (product.category || '') : ''}" required></div>
                    <div class="form-group"><label>Unit of Measure</label><input type="text" id="pm-uom" value="${isEdit ? (product.uom || '') : ''}" placeholder="e.g. Kg, Pcs" required></div>
                    <div class="form-group"><label>Location (Warehouse)</label><input type="text" id="pm-location" value="${isEdit ? (product.location || '') : ''}" placeholder="e.g. Warehouse A"></div>
                    ${isEdit ? `<div class="form-group"><label>Current Stock</label><input type="number" id="pm-stock" value="${product.currentStock}" readonly style="background:#f0f0f0;"></div>` : ''}
                    <div class="modal-actions">
                        <button type="button" class="btn btn-outline" id="pm-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Product'}</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('pm-cancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.getElementById('product-modal-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = { name: document.getElementById('pm-name').value, sku: document.getElementById('pm-sku').value, category: document.getElementById('pm-category').value, uom: document.getElementById('pm-uom').value, location: document.getElementById('pm-location').value, currentStock: isEdit ? product.currentStock : 0 };
            try {
                if (isEdit) { await ApiService.put(`/products/${product.id}`, payload); App.showToast('Product updated!', 'success'); }
                else { await ApiService.post('/products', payload); App.showToast('Product added!', 'success'); }
                overlay.remove(); this.renderProducts();
            } catch (err) { App.showToast(err.message || 'Operation failed', 'error'); }
        });
    },

    // ===== MANAGER ORDERS PAGE =====
    async renderManagerOrders(activeTab = 'receipts') {
        const isReceipt = activeTab === 'receipts';
        const endpoint = isReceipt ? '/operations/pending/receipts' : '/operations/pending/deliveries';
        const orders = await ApiService.get(endpoint);
        const label = isReceipt ? 'Incoming Receipts' : 'Outgoing Deliveries';
        const icon = isReceipt ? 'ri-download-cloud-fill' : 'ri-truck-fill';
        const statusOptions = ['WAITING', 'READY', 'DONE', 'CANCELED'];

        this.container.innerHTML = `
            <div class="orders-page">
                <div class="toggle-tabs">
                    <button class="toggle-tab ${isReceipt ? 'active' : ''}" id="tab-receipts"><i class="ri-download-cloud-line"></i> Incoming Receipts</button>
                    <button class="toggle-tab ${!isReceipt ? 'active' : ''}" id="tab-deliveries"><i class="ri-truck-line"></i> Outgoing Deliveries</button>
                </div>
                <h3 style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
                    <i class="${icon}" style="color: var(--primary);"></i> ${label}
                    <span class="badge badge-warning" style="font-size:0.8rem;">${orders.length} pending</span>
                </h3>
                <div class="products-table-wrap">
                    <table>
                        <thead><tr><th>Order ID</th><th>Product</th><th>SKU</th><th>Qty</th><th>From</th><th>To</th><th>Date & Time</th><th>Status</th></tr></thead>
                        <tbody>
                            ${orders.map(o => `<tr>
                                <td><strong>#${o.id}</strong></td><td>${o.product ? o.product.name : '—'}</td>
                                <td><span class="badge badge-primary">${o.product ? o.product.sku : '—'}</span></td>
                                <td><strong>${o.quantity}</strong></td><td>${o.sourceText || '—'}</td><td>${o.destinationText || '—'}</td>
                                <td>${o.timestamp ? new Date(o.timestamp).toLocaleString() : '—'}</td>
                                <td><select class="status-select" data-order-id="${o.id}" style="padding:0.35rem 0.5rem;border-radius:6px;border:1px solid #ccc;font-size:0.8rem;font-weight:600;cursor:pointer;">
                                    ${statusOptions.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select></td>
                            </tr>`).join('')}
                            ${orders.length === 0 ? `<tr><td colspan="8" class="text-center text-muted" style="padding:2rem;">No pending ${activeTab}. All caught up! 🎉</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        setTimeout(() => {
            document.getElementById('tab-receipts').addEventListener('click', () => this.renderManagerOrders('receipts'));
            document.getElementById('tab-deliveries').addEventListener('click', () => this.renderManagerOrders('deliveries'));
            document.querySelectorAll('.status-select').forEach(sel => {
                sel.addEventListener('change', async (e) => {
                    const id = e.target.dataset.orderId;
                    try {
                        await ApiService.patch(`/operations/${id}/status`, { status: e.target.value });
                        App.showToast(`Order #${id} → ${e.target.value}`, 'success');
                        this.renderManagerOrders(activeTab);
                    } catch (err) { App.showToast(err.message || 'Failed', 'error'); this.renderManagerOrders(activeTab); }
                });
            });
        }, 50);
    },

    // ===== STAFF ORDERS PAGE =====
    async renderStaffOrders(activeTab = 'receipts') {
        const products = await ApiService.get('/products');
        const isReceipt = activeTab === 'receipts';
        const typeLabel = isReceipt ? 'Incoming Receipt' : 'Outgoing Delivery';
        const typeIcon = isReceipt ? 'ri-download-cloud-line' : 'ri-truck-line';

        this.container.innerHTML = `
            <div class="orders-page">
                <div class="toggle-tabs">
                    <button class="toggle-tab ${isReceipt ? 'active' : ''}" id="tab-receipts"><i class="ri-download-cloud-line"></i> Incoming Receipts</button>
                    <button class="toggle-tab ${!isReceipt ? 'active' : ''}" id="tab-deliveries"><i class="ri-truck-line"></i> Outgoing Deliveries</button>
                </div>
                <div class="order-form-card">
                    <h3><i class="${typeIcon}"></i> New ${typeLabel}</h3>
                    <form id="order-form">
                        <div class="order-form-grid">
                            <div class="form-group full-width">
                                <label>Select Product (ID — SKU — Name)</label>
                                <select id="order-product" required style="width:100%;padding:0.6rem 0.8rem;border:1px solid #c0c0c0;border-radius:6px;font-size:0.9rem;">
                                    <option value="">— Choose Product —</option>
                                    ${products.map(p => `<option value="${p.id}">#${p.id} — ${p.sku} — ${p.name} (Stock: ${p.currentStock})</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group"><label>Quantity</label><input type="number" id="order-qty" min="1" required style="width:100%;padding:0.6rem 0.8rem;border:1px solid #c0c0c0;border-radius:6px;"></div>
                            <div class="form-group"><label>${isReceipt ? 'Source (From Where)' : 'Source (From Warehouse)'}</label><input type="text" id="order-source" placeholder="${isReceipt ? 'e.g. Supplier ABC' : 'e.g. Warehouse A'}" required style="width:100%;padding:0.6rem 0.8rem;border:1px solid #c0c0c0;border-radius:6px;"></div>
                            <div class="form-group"><label>${isReceipt ? 'Destination (To Warehouse)' : 'Destination (To Where)'}</label><input type="text" id="order-dest" placeholder="${isReceipt ? 'e.g. Warehouse A' : 'e.g. Customer XYZ'}" required style="width:100%;padding:0.6rem 0.8rem;border:1px solid #c0c0c0;border-radius:6px;"></div>
                            <div class="form-group"><label>Date</label><input type="date" id="order-date" required value="${new Date().toISOString().split('T')[0]}" style="width:100%;padding:0.6rem 0.8rem;border:1px solid #c0c0c0;border-radius:6px;"></div>
                            <div class="form-group"><label>Time</label><input type="time" id="order-time" required value="${new Date().toTimeString().slice(0,5)}" style="width:100%;padding:0.6rem 0.8rem;border:1px solid #c0c0c0;border-radius:6px;"></div>
                        </div>
                        <div class="modal-actions" style="margin-top:1.5rem;"><button type="submit" class="btn btn-primary"><i class="ri-check-line"></i> Place ${typeLabel}</button></div>
                    </form>
                </div>
            </div>
        `;
        setTimeout(() => {
            document.getElementById('tab-receipts').addEventListener('click', () => this.renderStaffOrders('receipts'));
            document.getElementById('tab-deliveries').addEventListener('click', () => this.renderStaffOrders('deliveries'));
            document.getElementById('order-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const ep = isReceipt ? '/operations/receipts' : '/operations/deliveries';
                try {
                    await ApiService.post(ep, { productId: document.getElementById('order-product').value, quantity: parseInt(document.getElementById('order-qty').value), source: document.getElementById('order-source').value, destination: document.getElementById('order-dest').value });
                    App.showToast(`${typeLabel} placed!`, 'success');
                    document.getElementById('order-form').reset();
                    document.getElementById('order-date').value = new Date().toISOString().split('T')[0];
                    document.getElementById('order-time').value = new Date().toTimeString().slice(0,5);
                } catch (err) { App.showToast(err.message || 'Failed', 'error'); }
            });
        }, 50);
    },

    // ===== INTERNAL TRANSFERS PAGE =====
    async renderTransfers() {
        const history = await ApiService.get('/operations/history');
        // Only show transactions that have both source and destination (actual transfers between locations)
        const transfers = history.filter(h => h.type === 'TRANSFER' || (h.sourceText && h.destinationText));
        const statusMap = { 'DONE': 'badge-success', 'WAITING': 'badge-warning', 'READY': 'badge-primary', 'CANCELED': 'badge-danger' };
        const typeMap = { 'RECEIPT': 'badge-success', 'DELIVERY': 'badge-primary', 'TRANSFER': 'badge-info', 'ADJUSTMENT': 'badge-warning' };

        this.container.innerHTML = `
            <div class="products-page">
                <h3 style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
                    <i class="ri-arrow-left-right-fill" style="color: var(--primary);"></i> Internal Transfers
                    <span class="badge badge-info" style="font-size:0.8rem;">${transfers.length}</span>
                </h3>
                <p class="text-muted" style="margin-bottom:1rem;">Orders with both source and destination locations.</p>
                <div class="products-table-wrap">
                    <table>
                        <thead><tr><th>ID</th><th>Type</th><th>Product</th><th>SKU</th><th>Qty</th><th>From</th><th>To</th><th>Date</th><th>Status</th></tr></thead>
                        <tbody>
                            ${transfers.map(t => `<tr>
                                <td>#${t.id}</td>
                                <td><span class="badge ${typeMap[t.type] || ''}">${t.type}</span></td>
                                <td><strong>${t.product ? t.product.name : '—'}</strong></td>
                                <td><span class="badge badge-primary">${t.product ? t.product.sku : '—'}</span></td>
                                <td><strong>${t.quantity}</strong></td>
                                <td>${t.sourceText || '—'}</td><td>${t.destinationText || '—'}</td>
                                <td>${t.timestamp ? new Date(t.timestamp).toLocaleString() : '—'}</td>
                                <td><span class="badge ${statusMap[t.status] || ''}">${t.status}</span></td>
                            </tr>`).join('')}
                            ${transfers.length === 0 ? '<tr><td colspan="9" class="text-center text-muted" style="padding:2rem;">No internal transfers recorded yet.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // ===== PENDING ORDERS (Staff from dashboard) =====
    async renderPendingOrders(type) {
        const isReceipt = type === 'receipts';
        const endpoint = isReceipt ? '/operations/pending/receipts' : '/operations/pending/deliveries';
        const orders = await ApiService.get(endpoint);
        this.container.innerHTML = `
            <div class="pending-page">
                <div class="back-btn" id="back-to-dashboard"><i class="ri-arrow-left-line"></i> Back to Dashboard</div>
                <h3 style="margin-bottom:1.5rem;display:flex;align-items:center;gap:0.5rem;">
                    <i class="${isReceipt ? 'ri-download-cloud-fill' : 'ri-truck-fill'}" style="color:var(--primary);"></i> ${isReceipt ? 'Pending Receipts' : 'Pending Deliveries'}
                    <span class="badge badge-warning" style="font-size:0.8rem;">${orders.length}</span>
                </h3>
                <div class="products-table-wrap">
                    <table><thead><tr><th>ID</th><th>Product</th><th>SKU</th><th>Qty</th><th>From</th><th>To</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody>${orders.map(o => `<tr><td>#${o.id}</td><td><strong>${o.product ? o.product.name : '—'}</strong></td><td><span class="badge badge-primary">${o.product ? o.product.sku : '—'}</span></td><td><strong>${o.quantity}</strong></td><td>${o.sourceText || '—'}</td><td>${o.destinationText || '—'}</td><td>${o.timestamp ? new Date(o.timestamp).toLocaleString() : '—'}</td><td><span class="badge badge-warning">${o.status}</span></td></tr>`).join('')}
                    ${orders.length === 0 ? `<tr><td colspan="8" class="text-center text-muted">No pending ${type}. 🎉</td></tr>` : ''}</tbody></table>
                </div>
            </div>
        `;
        setTimeout(() => { document.getElementById('back-to-dashboard').addEventListener('click', () => App.navigate('dashboard')); }, 50);
    },

    // ===== PROFILE =====
    async renderProfile() {
        try {
            const profile = await ApiService.get('/auth/profile');
            const initials = (profile.fullName || profile.username || '?').charAt(0).toUpperCase();
            this.container.innerHTML = `
                <div class="profile-page"><div class="profile-card">
                    <div class="profile-avatar">${initials}</div>
                    <div class="profile-name">${profile.fullName || profile.username}</div>
                    <span class="badge badge-primary profile-role">${profile.role}</span>
                    <div class="profile-details">
                        <div class="profile-row"><i class="ri-user-line"></i><span class="label">Username</span><span class="value">${profile.username}</span></div>
                        <div class="profile-row"><i class="ri-mail-line"></i><span class="label">Email</span><span class="value">${profile.email || '—'}</span></div>
                        <div class="profile-row"><i class="ri-phone-line"></i><span class="label">Phone</span><span class="value">${profile.phone || '—'}</span></div>
                        <div class="profile-row"><i class="ri-shield-user-line"></i><span class="label">Role</span><span class="value">${profile.role}</span></div>
                    </div>
                </div></div>
            `;
        } catch(e) {
            this.container.innerHTML = `<div class="profile-page"><div class="profile-card"><p class="text-muted">Could not load profile.</p></div></div>`;
        }
    },

    // ===== LEGACY OPERATION FORM =====
    async renderOperationForm(type) {
        const products = await ApiService.get('/products');
        this.container.innerHTML = `
            <div class="glass-card" style="max-width:600px;margin:2rem auto;">
                <h3 class="mb-4">New ${type.charAt(0).toUpperCase() + type.slice(1)} Operation</h3>
                <form id="operation-form">
                    <div class="form-group"><label>Select Product</label><div class="input-icon"><i class="ri-box-3-line"></i><select id="op-product" required><option value="">-- Choose Product --</option>${products.map(p => `<option value="${p.id}">${p.name} (SKU: ${p.sku} | Stock: ${p.currentStock})</option>`).join('')}</select></div></div>
                    <div class="form-group"><label>Quantity</label><div class="input-icon"><i class="ri-add-line"></i><input type="number" id="op-qty" required min="1"></div></div>
                    <button type="submit" class="btn btn-primary mt-3"><i class="ri-check-line"></i> Validate Operation</button>
                </form>
            </div>
        `;
        document.getElementById('operation-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await ApiService.post(`/operations/${type}`, { productId: document.getElementById('op-product').value, quantity: document.getElementById('op-qty').value });
                App.showToast('Operation Successful!', 'success');
                document.getElementById('operation-form').reset();
            } catch (error) { App.showToast(error.message, 'error'); }
        });
    },

    // ===== HISTORY (shows everything) =====
    async renderHistory() {
        const history = await ApiService.get('/operations/history');
        const badgeColors = { 'RECEIPT': 'badge-success', 'DELIVERY': 'badge-primary', 'ADJUSTMENT': 'badge-warning', 'TRANSFER': 'badge-info' };
        const statusMap = { 'DONE': 'badge-success', 'WAITING': 'badge-warning', 'READY': 'badge-primary', 'CANCELED': 'badge-danger' };
        this.container.innerHTML = `
            <div class="products-page">
                <h3 style="margin-bottom:1rem;"><i class="ri-history-line" style="color:var(--primary);"></i> Complete Movement History</h3>
                <div class="products-table-wrap">
                    <table>
                        <thead><tr><th>Date</th><th>Type</th><th>Product</th><th>SKU</th><th>Qty</th><th>From</th><th>To</th><th>Status</th></tr></thead>
                        <tbody>
                            ${history.map(h => `<tr>
                                <td>${new Date(h.timestamp).toLocaleString()}</td>
                                <td><span class="badge ${badgeColors[h.type]}">${h.type}</span></td>
                                <td>${h.product ? h.product.name : 'Unknown'}</td>
                                <td><span class="badge badge-primary">${h.product ? h.product.sku : '—'}</span></td>
                                <td><strong>${h.quantity}</strong></td>
                                <td>${h.sourceText || '—'}</td><td>${h.destinationText || '—'}</td>
                                <td><span class="badge ${statusMap[h.status] || ''}">${h.status}</span></td>
                            </tr>`).join('')}
                            ${history.length === 0 ? '<tr><td colspan="8" class="text-center text-muted">No movement history yet.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
};
