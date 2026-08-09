import { LoggedInUser } from './types';

// Obfuscated Admin Entrance Path
export const ADMIN_LOGIN_PATH = '/admin/gate-9021x';

export const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (url.includes('lab-buddies-backend.onrender.com')) {
      return 'https://lab-buddies-7r70.onrender.com';
    }
    return url;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://lab-buddies-7r70.onrender.com';
  }
  return 'https://lab-buddies-7r70.onrender.com';
};

export const getStoredUser = (): LoggedInUser | null => {
  if (typeof window === 'undefined') return null;
  const userJson =
    localStorage.getItem('lab_buddies_user') ||
    localStorage.getItem('logged_in_user') ||
    sessionStorage.getItem('lab_buddies_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
};

export const getAdminToken = (): string => {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('lab_buddies_admin_token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('lab_buddies_admin_token') ||
    ''
  );
};

export const setAdminAuth = (user: LoggedInUser, token?: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lab_buddies_user', JSON.stringify(user));
  localStorage.setItem('logged_in_user', JSON.stringify(user));
  if (token) {
    localStorage.setItem('lab_buddies_admin_token', token);
    localStorage.setItem('auth_token', token);
  }
};

export const clearAdminAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lab_buddies_user');
  localStorage.removeItem('logged_in_user');
  localStorage.removeItem('lab_buddies_admin_token');
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('lab_buddies_user');
  sessionStorage.removeItem('lab_buddies_admin_token');
};

export const getAdminHeaders = (): Record<string, string> => {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }
  return headers;
};
