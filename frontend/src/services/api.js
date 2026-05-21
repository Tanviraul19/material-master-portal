import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const sqLiteDateRegex = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

function fixDates(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = fixDates(obj[i]);
    }
  } else {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string' && sqLiteDateRegex.test(val)) {
        obj[key] = val.replace(' ', 'T') + 'Z';
      } else if (val && typeof val === 'object') {
        obj[key] = fixDates(val);
      }
    }
  }
  return obj;
}

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        if (user?.accessToken) {
          config.headers['Authorization'] = 'Bearer ' + user.accessToken;
        }
      }
    } catch (_) {
      // ignore malformed localStorage
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors — only redirect if NOT already on /login
api.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      response.data = fixDates(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
