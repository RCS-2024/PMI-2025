import React, { useState } from 'react';
import UserSelector from './UserSelector';
import { tasksAPI } from '../services/api';

/**
 * Componente para editar el responsable de una tarea
 */
const AssigneeEditor = ({ task, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para actualizar el responsable
  const updateAssignee = async (userId) => {
    if (!userId && !window.confirm('¿Está seguro de quitar el responsable asignado?')) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Llamar a la API para actualizar solo el responsable
      const updatedTask = await tasksAPI.updateTask(task._id, {
        assignedUserId: userId
      });
      
      // Notificar al componente padre sobre la actualización
      if (onUpdate) {
        onUpdate(updatedTask);
      }
      
      setIsEditing(false);
    } catch (err) {
      setError('Error al actualizar el responsable');
      console.error('Error al actualizar responsable:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center bg-blue-50 text-blue-700 text-xs py-1 px-2 rounded-full">
      <span className="mr-1">⏳</span> Actualizando...
    </div>;
  }

  if (error) {
    return <div className="flex items-center bg-red-50 text-red-700 text-xs py-1 px-2 rounded-full">
      <span className="mr-1">❌</span> {error}
    </div>;
  }

  if (isEditing) {
    return (
      <div className="w-48">
        <UserSelector
          value={task.assignedTo ? task.assignedTo._id : ""}
          onChange={(userId) => updateAssignee(userId)}
          placeholder="Seleccionar responsable"
          className="text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button 
          onClick={() => setIsEditing(false)}
          className="text-gray-500 text-xs ml-1"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {task.assignedTo ? (
        <div className="flex items-center bg-gray-100 text-gray-700 text-xs py-1 px-2 rounded-full">
          <span className="mr-1">👤</span> {task.assignedTo.displayName || task.assignedTo.username}
          <button 
            onClick={() => setIsEditing(true)}
            className="ml-1 text-gray-500 hover:text-blue-600"
            title="Cambiar responsable"
          >
            ✎
          </button>
        </div>
      ) : (
        <div className="flex items-center bg-gray-100 text-gray-500 text-xs py-1 px-2 rounded-full">
          <span className="mr-1">👤</span> Sin asignar
          <button 
            onClick={() => setIsEditing(true)}
            className="ml-1 text-gray-500 hover:text-blue-600"
            title="Asignar responsable"
          >
            ✎
          </button>
        </div>
      )}
    </div>
  );
};

export default AssigneeEditor;
