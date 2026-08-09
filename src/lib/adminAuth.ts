import { LoggedInUser } from './types';

export const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return 'http://127.0.0.1:5000';
};

export const getStoredUser = (): LoggedInUser | null => {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem('lab_buddies_user') || sessionStorage.getItem('lab_buddies_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
};

export const getAdminToken = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('lab_buddies_admin_token') || sessionStorage.getItem('lab_buddies_admin_token') || '';
};

export const setAdminAuth = (user: LoggedInUser, token?: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lab_buddies_user', JSON.stringify(user));
  if (token) {
    localStorage.setItem('lab_buddies_admin_token', token);
  }
};

export const clearAdminAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lab_buddies_user');
  localStorage.removeItem('lab_buddies_admin_token');
  sessionStorage.removeItem('lab_buddies_user');
  sessionStorage.removeItem('lab_buddies_admin_token');
};

export const getAdminHeaders = (): HeadersInit => {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};
