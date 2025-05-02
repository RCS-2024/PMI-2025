import React, { createContext, useState, useEffect, useContext } from 'react';

// Crear el contexto
export const AuthContext = createContext();

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  return useContext(AuthContext);
};

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Efecto para cargar el usuario del localStorage al iniciar
  // En el primer montaje, verificamos si hay un token válido
  useEffect(() => {
    const checkSession = () => {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      
      // Si hay token y usuario guardados, usarlos
      if (storedUser && storedToken) {
        try {
          const userData = JSON.parse(storedUser);
          setCurrentUser(userData);
          setToken(storedToken);
        } catch (e) {
          // Si hay un error al parsear el usuario, limpiar
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } else {
        // Si no hay token ni usuario, asegurarse de que el estado refleje eso
        setCurrentUser(null);
        setToken(null);
      }
      
      setLoading(false);
    };
    
    checkSession();
  }, []);

  // Función para iniciar sesión
  const login = (userData, authToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    setCurrentUser(userData);
    setToken(authToken);
  };

  // Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setToken(null);
  };

  // Función para actualizar información del usuario
  const updateUserInfo = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentUser(userData);
  };

  // Contenido a proveer
  const value = {
    currentUser,
    token,
    login,
    logout,
    updateUserInfo,
    isAdmin: currentUser?.role === 'admin',
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
