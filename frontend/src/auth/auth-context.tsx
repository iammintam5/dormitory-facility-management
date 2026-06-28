import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../lib/auth-storage';
import { getMe, login as loginRequest, logout as logoutRequest } from '../services/auth';
import { type AuthUser, type BackendAuthUser } from '../types/auth';

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
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    normalizeStoredUser(getStoredAuth()?.user ?? null),
  );
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
        const currentUser = await getMe();
        const mappedUser = mapBackendUser(currentUser);
        setUser(mappedUser);
        setAccessToken(storedAuth.accessToken);
        setStoredAuth({ accessToken: storedAuth.accessToken, user: mappedUser });
      } catch {
        clearStoredAuth();
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    void bootstrap();

    const handleSessionExpired = () => {
      setAccessToken(null);
      setUser(null);
      clearStoredAuth();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      isBootstrapping,
      user,
      login: async ({ userCode, password }) => {
        const response = await loginRequest({
          username: userCode.trim(),
          password: password.trim(),
        });
        const mappedUser = mapBackendUser(response.user);
        setAccessToken(response.accessToken);
        setUser(mappedUser);
        setStoredAuth({ accessToken: response.accessToken, user: mappedUser });
        return mappedUser;
      },
      refreshUser: async () => {
        const currentUser = await getMe();
        const mappedUser = mapBackendUser(currentUser);
        setUser(mappedUser);

        const storedToken = getStoredAuth()?.accessToken ?? accessToken;
        if (storedToken) {
          setStoredAuth({ accessToken: storedToken, user: mappedUser });
        }
      },
      logout: async () => {
        try {
          if (accessToken) {
            await logoutRequest();
          }
        } catch {
          // Let the UI clear local auth even if server logout is unavailable.
        } finally {
          clearStoredAuth();
          setAccessToken(null);
          setUser(null);
        }
      },
    }),
    [accessToken, isBootstrapping, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function normalizeStoredUser(user: AuthUser | null) {
  if (!user) return null;
  if ((user.role as string) !== 'QL_CSVC') return user;
  return { ...user, role: 'MANAGER' as const };
}

function mapBackendUser(user: BackendAuthUser): AuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    userCode: user.username,
    role: user.role.code,
    email: user.email,
    phone: user.phone,
    studentCode: user.studentCode,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: user.profile,
  };
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
