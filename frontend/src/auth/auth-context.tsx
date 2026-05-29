import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiClient } from '../lib/axios';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../lib/auth-storage';
import { AuthUser, LoginResponse } from '../types/auth';

type LoginPayload = {
  userCode: string;
  password: string;
};

type AuthContextValue = {
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuth()?.user ?? null);
  const [accessToken, setAccessToken] = useState<string | null>(
    () => getStoredAuth()?.accessToken ?? null,
  );
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const storedAuth = getStoredAuth();

      if (!storedAuth?.accessToken) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const response = await apiClient.get<AuthUser>('/auth/me');
        setUser(response.data);
        setStoredAuth({
          accessToken: storedAuth.accessToken,
          user: response.data,
        });
      } catch {
        clearStoredAuth();
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      isBootstrapping,
      user,
      login: async (payload) => {
        const response = await apiClient.post<LoginResponse>('/auth/login', payload);
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        setStoredAuth(response.data);
        return response.data.user;
      },
      logout: () => {
        clearStoredAuth();
        setAccessToken(null);
        setUser(null);
      },
    }),
    [accessToken, isBootstrapping, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
