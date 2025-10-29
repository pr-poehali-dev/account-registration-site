const API_URLS = {
  accounts: 'https://functions.poehali.dev/91511d6b-8686-4373-bd8b-bf11c94fa905',
  proxies: 'https://functions.poehali.dev/d3f6e601-e2d0-4a71-970d-b1fb53625abf',
  registration: 'https://functions.poehali.dev/8a55c82d-1f31-44ed-80bb-d6e3e8044d20',
  export: 'https://functions.poehali.dev/0a663b4b-88d4-44d3-86e9-cc79bed9b2a9',
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
}

export const api = {
  accounts: {
    getAll: async (): Promise<GoogleAccount[]> => {
      const response = await fetch(API_URLS.accounts);
      const data = await response.json();
      return data.accounts || [];
    },
    add: async (accounts: { email: string; password: string }[]): Promise<void> => {
      await fetch(API_URLS.accounts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts }),
      });
    },
    delete: async (id: number): Promise<void> => {
      await fetch(`${API_URLS.accounts}?id=${id}`, {
        method: 'DELETE',
      });
    },
  },
  proxies: {
    getAll: async (): Promise<Proxy[]> => {
      const response = await fetch(API_URLS.proxies);
      const data = await response.json();
      return data.proxies || [];
    },
    add: async (proxies: { host: string; port: string; username?: string; password?: string }[]): Promise<void> => {
      await fetch(API_URLS.proxies, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies }),
      });
    },
    test: async (id: number): Promise<void> => {
      await fetch(API_URLS.proxies, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    },
    delete: async (id: number): Promise<void> => {
      await fetch(`${API_URLS.proxies}?id=${id}`, {
        method: 'DELETE',
      });
    },
  },
  registration: {
    getTasks: async (): Promise<RegistrationTask[]> => {
      const response = await fetch(API_URLS.registration);
      const data = await response.json();
      return data.tasks || [];
    },
    start: async (): Promise<{ success: boolean; tasksCreated: number }> => {
      const response = await fetch(API_URLS.registration, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      return response.json();
    },
    process: async (taskId: number): Promise<void> => {
      await fetch(API_URLS.registration, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process', taskId }),
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
      const response = await fetch(`${API_URLS.export}?${params}`);
      
      if (format === 'json') {
        return response.json();
      }
      return response.text();
    },
  },
};
