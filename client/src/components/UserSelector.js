import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const UserSelector = ({ value, onChange, placeholder, className }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser, isAdmin } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (isAdmin) {
          // Administradores pueden ver todos los usuarios
          const usersData = await usersAPI.getAllUsers();
          setUsers(usersData);
        } else {
          // Usuarios normales solo pueden asignar a sí mismos
          setUsers([{ _id: currentUser._id, displayName: currentUser.displayName || currentUser.username }]);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('No se pudieron cargar los usuarios');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, isAdmin]);

  if (loading) {
    return (
      <select 
        className={className || "border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"}
        disabled
      >
        <option>Cargando usuarios...</option>
      </select>
    );
  }

  if (error) {
    return (
      <select 
        className={className || "border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"}
        disabled
      >
        <option>{error}</option>
      </select>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={className || "border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"}
    >
      <option value="">{placeholder || "Selecciona un usuario"}</option>
      {users.map((user) => (
        <option key={user._id} value={user._id}>
          {user.displayName || user.username}
        </option>
      ))}
    </select>
  );
};

export default UserSelector;
