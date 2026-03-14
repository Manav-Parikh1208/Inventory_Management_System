const App = {
    init() {
        this.checkAuth();
        Views.init();
    },

    checkAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        if (token && user) {
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');

            const isManager = user.role === 'MANAGER' || user.role === 'ADMIN';

            if (isManager) {
                document.getElementById('app-container').classList.add('manager-layout');
                document.getElementById('top-navbar').classList.remove('hidden');
                document.getElementById('sidebar-nav').classList.add('hidden');

                document.getElementById('top-nav-username').textContent = user.username;
                document.getElementById('top-nav-role').textContent = user.role;

                this.setupTopNavigation();

                // Logo click → dashboard
                document.querySelector('.top-nav-logo').addEventListener('click', () => {
                    document.querySelectorAll('.top-nav-links li').forEach(l => {
                        l.classList.remove('active');
                        if (l.dataset.view === 'dashboard') l.classList.add('active');
                    });
                    this.navigate('dashboard');
                });
                document.querySelector('.top-nav-logo').style.cursor = 'pointer';

                // Logout
                document.getElementById('top-logout-btn').addEventListener('click', () => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                });

                // Profile click
                const profileArea = document.querySelector('.top-nav-profile .avatar');
                const profileName = document.getElementById('top-nav-username');
                [profileArea, profileName].forEach(el => {
                    if (el) {
                        el.style.cursor = 'pointer';
                        el.addEventListener('click', () => {
                            document.querySelectorAll('.top-nav-links li').forEach(l => l.classList.remove('active'));
                            this.navigate('profile');
                        });
                    }
                });
            } else {
                document.getElementById('app-container').classList.remove('manager-layout');
                document.getElementById('top-navbar').classList.add('hidden');
                document.getElementById('sidebar-nav').classList.remove('hidden');
                document.getElementById('nav-username').textContent = user.username;
                document.getElementById('nav-role').textContent = user.role;
                this.setupSidebarNavigation();
            }

            this.navigate('dashboard');
        } else {
            document.getElementById('app-container').classList.add('hidden');
            document.getElementById('auth-container').classList.remove('hidden');
        }
    },

    setupTopNavigation() {
        const links = document.querySelectorAll('.top-nav-links li[data-view]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                links.forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.navigate(e.currentTarget.dataset.view);
            });
        });
    },

    setupSidebarNavigation() {
        const links = document.querySelectorAll('.nav-links li[data-view]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                links.forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.navigate(e.currentTarget.dataset.view);
            });
        });
    },

    navigate(view) {
        const titles = {
            'dashboard': 'Dashboard Insights', 'products': 'Product Catalog', 'low-stock': 'Low Stock Alerts',
            'orders': 'Place Orders', 'orders-receipts': 'Incoming Receipts', 'orders-deliveries': 'Outgoing Deliveries',
            'transfers': 'Internal Transfers', 'adjustments': 'Physical Adjustments',
            'history': 'Movement Ledger', 'profile': 'My Profile',
            'pendingReceipts': 'Pending Receipts', 'pendingDeliveries': 'Pending Deliveries'
        };
        const titleEl = document.getElementById('view-title');
        if (titleEl) titleEl.textContent = titles[view] || view;
        Views.render(view);
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill';
        toast.innerHTML = `<i class="${icon}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();

    // Theme Toggle Logic
    const themeBtn = document.getElementById('theme-toggle');
    const icon = themeBtn.querySelector('i');
    
    // Check local storage for theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        icon.className = 'ri-sun-line';
    }

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
            icon.className = 'ri-sun-line';
        } else {
            localStorage.setItem('theme', 'light');
            icon.className = 'ri-moon-line';
        }
    });
});
