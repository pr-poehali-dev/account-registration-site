const API_URLS = {
  accounts: 'https://functions.poehali.dev/91511d6b-8686-4373-bd8b-bf11c94fa905',
  proxies: 'https://functions.poehali.dev/d3f6e601-e2d0-4a71-970d-b1fb53625abf',
  registration: 'https://functions.poehali.dev/8a55c82d-1f31-44ed-80bb-d6e3e8044d20',
  export: 'https://functions.poehali.dev/0a663b4b-88d4-44d3-86e9-cc79bed9b2a9',
  settings: 'https://functions.poehali.dev/6e46c73e-86c4-4559-9283-3e4e1d4174fb',
};

export interface GoogleAccount {
  id: number;
  email: string;
  password?: string;
  status: string;
  createdAt: string;
}

export interface Proxy {
  id: number;
  host: string;
  port: string;
  username?: string;
  password?: string;
  status: string;
  lastChecked?: string;
  createdAt: string;
}

export interface RegistrationTask {
  id: number;
  status: string;
  marktplaatsLogin?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  email?: string;
  proxy?: string;
  logs?: string[];
}

async function fetchWithErrorHandling(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут

  try {
    console.log(`[API] Запрос: ${options?.method || 'GET'} ${url}`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    console.log(`[API] Ответ: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Ошибка: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[API] Таймаут запроса (30 сек)');
        throw new Error('Превышено время ожидания ответа от сервера');
      }
      console.error('[API] Ошибка:', error.message);
    }
    throw error;
  }
}

export const api = {
  accounts: {
    getAll: async (): Promise<GoogleAccount[]> => {
      const response = await fetchWithErrorHandling(API_URLS.accounts);
      const data = await response.json();
      return data.accounts || [];
    },
    add: async (accounts: { email: string; password: string }[]): Promise<void> => {
      await fetchWithErrorHandling(API_URLS.accounts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts }),
      });
    },
    test: async (id: number): Promise<{ success: boolean; message?: string }> => {
      const response = await fetchWithErrorHandling(API_URLS.accounts, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return response.json();
    },
    delete: async (id: number): Promise<void> => {
      await fetchWithErrorHandling(`${API_URLS.accounts}?id=${id}`, {
        method: 'DELETE',
      });
    },
  },
  proxies: {
    getAll: async (): Promise<Proxy[]> => {
      const response = await fetchWithErrorHandling(API_URLS.proxies);
      const data = await response.json();
      return data.proxies || [];
    },
    add: async (proxies: { host: string; port: string; username?: string; password?: string }[]): Promise<void> => {
      await fetchWithErrorHandling(API_URLS.proxies, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies }),
      });
    },
    test: async (id: number): Promise<void> => {
      await fetchWithErrorHandling(API_URLS.proxies, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    },
    delete: async (id: number): Promise<void> => {
      await fetchWithErrorHandling(`${API_URLS.proxies}?id=${id}`, {
        method: 'DELETE',
      });
    },
  },
  registration: {
    getTasks: async (): Promise<RegistrationTask[]> => {
      const response = await fetchWithErrorHandling(API_URLS.registration);
      const data = await response.json();
      return data.tasks || [];
    },
    start: async (): Promise<{ success: boolean; tasksCreated: number }> => {
      const response = await fetchWithErrorHandling(API_URLS.registration, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      return response.json();
    },
    process: async (taskId: number): Promise<void> => {
      await fetchWithErrorHandling(API_URLS.registration, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process', taskId }),
      });
    },
    delete: async (taskId: number): Promise<void> => {
      await fetchWithErrorHandling(API_URLS.registration, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', taskId }),
      });
    },
    deleteAll: async (): Promise<void> => {
      await fetchWithErrorHandling(API_URLS.registration, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_all' }),
      });
    },
  },
  export: {
    getAccounts: async (format: string, includeGoogle: boolean, includeProxy: boolean): Promise<any> => {
      const params = new URLSearchParams({
        format,
        includeGoogle: includeGoogle.toString(),
        includeProxy: includeProxy.toString(),
      });
      const response = await fetchWithErrorHandling(`${API_URLS.export}?${params}`);
      
      if (format === 'json' || format === 'cookies') {
        return response.json();
      }
      return response.text();
    },
  },
  settings: {
    getAll: async (): Promise<Record<string, string>> => {
      const response = await fetchWithErrorHandling(API_URLS.settings);
      const data = await response.json();
      return data.settings || {};
    },
    update: async (settings: Record<string, string>): Promise<void> => {
      await fetchWithErrorHandling(API_URLS.settings, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
    },
  },
};