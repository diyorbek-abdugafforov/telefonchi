import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest('/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Fetch me error:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (loginName, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: loginName, password }
    });
    if (res.success) {
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.error || "Login yoki parol noto'g'ri");
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } catch (e) {}
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const switchRole = async (role) => {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/switch-demo', {
        method: 'POST',
        body: { role }
      });
      if (res.success) {
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
    } catch (err) {
      console.error('Switch role error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Permission helpers according to Section 2 and 2.1 of TZ
  const canViewCostPrice = () => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager';
  };

  const canViewProfit = () => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager';
  };

  const canManageUsers = () => {
    return user?.role === 'admin';
  };

  const canManageSettings = () => {
    return user?.role === 'admin';
  };

  const canCancelSales = () => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'cashier' || user?.role === 'seller';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        switchRole,
        canViewCostPrice,
        canViewProfit,
        canManageUsers,
        canManageSettings,
        canCancelSales
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
