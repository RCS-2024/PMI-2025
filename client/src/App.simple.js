import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import "./index.css";

// Importar context y servicios
import { useAuth } from "./contexts/AuthContext";
import { tasksAPI, usersAPI } from "./services/api";

// Definición de columnas para el tablero Kanban
const columns = [
  { key: "pending", label: "Tareas pendientes" },
  { key: "inprogress", label: "Tareas en curso" },
  { key: "completed", label: "Tareas completadas" },
];

function App() {
  const { currentUser, token, logout } = useAuth();
  const navigate = useNavigate();
  
  // Estados
  const [tasks, setTasks] = useState([]);
  const [desc, setDesc] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersList, setUsersList] = useState([]);

  // Cargar tareas al iniciar
  useEffect(() => {
    if (!token) return;
    
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const data = await tasksAPI.getTasks();
        setTasks(data);
      } catch (err) {
        console.error('Error cargando tareas:', err);
        setError("Error cargando tareas: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, [token]);
  
  // Cargar usuarios
  useEffect(() => {
    if (!token) return;
    
    const fetchUsers = async () => {
      try {
        const users = await usersAPI.getAllUsers();
        setUsersList(users);
      } catch (err) {
        console.error('Error cargando usuarios:', err);
      }
    };
    
    fetchUsers();
  }, [token]);

  // Manejar drag and drop
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    
    // Si no hay destino o es el mismo, no hacer nada
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      return;
    }
    
    // Mapeo de columnas a estados
    const statusMap = {
      pending: "pending",
      inprogress: "inprogress",
      completed: "completed"
    };
    
    // Nuevo estado para la tarea
    const newStatus = statusMap[destination.droppableId];
    
    // Actualizar estado local primero (optimistic update)
    const updatedTasks = tasks.map(task => {
      if (task._id === draggableId) {
        return { ...task, status: newStatus };
      }
      return task;
    });
    
    setTasks(updatedTasks);
    
    // Enviar actualización al backend
    try {
      await tasksAPI.updateTask(draggableId, { status: newStatus });
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
      // Revertir cambios en caso de error
      const originalTask = tasks.find(t => t._id === draggableId);
      if (originalTask) {
        setTasks(tasks.map(t => 
          t._id === draggableId ? originalTask : t
        ));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">MPI - Gestor de Tareas</h1>
          <div className="flex items-center">
            <span className="mr-3 text-sm text-gray-600">
              Conectado como: <span className="font-medium">{currentUser?.displayName || currentUser?.username}</span>
            </span>
            <button 
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap mb-6">
            {/* Tablero Kanban */}
            <div className="w-full">
              <h2 className="text-lg font-medium mb-4">Tablero de tareas</h2>
              
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {columns.map((column) => (
                    <div key={column.key} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center mb-3">
                        <h3 className="text-sm font-medium">{column.label}</h3>
                        <span className="ml-2 bg-gray-200 text-gray-700 text-xs py-1 px-2 rounded-full">
                          {tasks.filter(t => t.status === column.key && !t.archived).length}
                        </span>
                      </div>
                      
                      <Droppable droppableId={column.key}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="min-h-[150px] transition-colors"
                          >
                            {tasks
                              .filter(task => task.status === column.key && !task.archived)
                              .map((task, index) => (
                                <Draggable
                                  key={task._id}
                                  draggableId={task._id}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="bg-white rounded-lg border shadow-sm hover:shadow my-2"
                                    >
                                      <div className="p-3">
                                        <div className="font-medium text-gray-800">{task.desc}</div>
                                        <div className="mt-2 flex items-center justify-between">
                                          <div className="flex items-center bg-gray-100 text-gray-700 text-xs py-1 px-2 rounded-full assignee-container">
                                            <span className="mr-1">👤</span> 
                                            {task.assignedTo ? 
                                              (task.assignedTo.displayName || task.assignedTo.username) : 
                                              'Sin asignar'}
                                          </div>
                                          <div className="text-gray-400 text-xs">
                                            {new Date(task.createdAt).toLocaleDateString()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
