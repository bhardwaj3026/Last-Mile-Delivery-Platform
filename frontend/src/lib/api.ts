/// <reference types="vite/client" />

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // On Vercel deployments, if VITE_API_BASE_URL is relative (/api) or missing, force full Render backend URL
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    if (envUrl && envUrl.trim().startsWith('http')) {
      const cleanUrl = envUrl.trim().replace(/\/+$/, '');
      return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
    }
    return 'https://last-mile-delivery-platform-2.onrender.com/api';
  }

  if (envUrl && envUrl.trim() !== '') {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }

  return '/api';
};

const API_BASE = getApiBase();

let accessToken: string | null = localStorage.getItem('access_token');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiBase = getApiBase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status} error`);
  }

  return data as T;
}
