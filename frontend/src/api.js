import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000/api/';

const api = axios.create({
  baseURL: baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('login') || url.includes('users/me');
      if (!isAuthRoute) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;