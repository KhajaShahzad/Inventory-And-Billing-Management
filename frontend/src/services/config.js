const trimTrailingSlash = (value) => value.replace(/\/$/, '');
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

const getWindowOrigin = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
};

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  return '/api';
};

const isLocalOrigin = (value) => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return LOCAL_HOSTNAMES.has(parsed.hostname);
  } catch {
    return false;
  }
};

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;

  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
};

export const appOrigin = getWindowOrigin();
export const apiBaseUrl = getApiBaseUrl();
export const socketUrl = getSocketUrl();
export const publicAppUrl = trimTrailingSlash(
  import.meta.env.VITE_PUBLIC_APP_URL
  || (isLocalOrigin(appOrigin) ? '' : appOrigin)
  || ''
);
export const isLocalAppOrigin = isLocalOrigin(appOrigin);
