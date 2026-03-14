const API_BASE = '/api';

class ApiService {
    static getToken() {
        return localStorage.getItem('token');
    }

    static async request(endpoint, options = {}) {
        const token = this.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            const data = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                if (response.status === 401 && !endpoint.includes('/auth/login')) {
                    // Auto logout on 401
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                } else if (response.status === 401 && endpoint.includes('/auth/login')) {
                    throw new Error('Incorrect username or password');
                }
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static get(endpoint) { return this.request(endpoint, { method: 'GET' }); }
    static post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); }
    static put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); }
    static patch(endpoint, data) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }); }
    static delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}
