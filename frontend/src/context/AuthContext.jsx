import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');

    return stored ? JSON.parse(stored) : null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const token = localStorage.getItem('token');

    if (token) {

      api.get('/auth/me')
        .then((res) => {

          setUser(res.data.user);

          localStorage.setItem(
            'user',
            JSON.stringify(res.data.user)
          );

        })
        .catch(() => {

          localStorage.removeItem('token');
          localStorage.removeItem('user');

          setUser(null);

        })
        .finally(() => {

          setLoading(false);

        });

    } else {

      setLoading(false);

    }

  }, []);

  const login = (token, userData) => {

    localStorage.setItem('token', token);

    localStorage.setItem(
      'user',
      JSON.stringify(userData)
    );

    setUser(userData);
  };

  const logout = () => {

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthProvider;