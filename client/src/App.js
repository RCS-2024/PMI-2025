import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import "./index.css";

// Importar context y servicios
import { useAuth } from "./contexts/AuthContext";
import { tasksAPI, usersAPI } from "./services/api";
import AssigneeEditor from "./components/AssigneeEditor";

// Usamos los servicios API ya definidos en services/api.js

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
  
  // Estados para edición de descripción de tarea
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskText, setEditTaskText] = useState("");
  // Filtro para incluir archivadas en el reporte
  const [includeArchived, setIncludeArchived] = useState(false);

  // Función para archivar tarea
  const archiveTask = async (taskId) => {
    setLoading(true);
    try {
      const updatedTask = await tasksAPI.archiveTask(taskId);
      setTasks(prevTasks => prevTasks.map(t => t._id === taskId ? updatedTask : t));
    } catch (err) {
      setError("Error archivando tarea: " + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }
  // Estado para mostrar la previsualización del reporte
  const [showingReport, setShowingReport] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Agregar tarea
  const addTask = async () => {
    if (desc.trim() === "") return;
    
    setLoading(true);
    setError("");
    
    try {
      // Llamar a la API para crear la tarea
      const taskData = { 
        desc, 
        assignedUserId, 
        status: "pending" 
      };
      
      console.log('Creando tarea:', taskData);
      const newTask = await tasksAPI.createTask(taskData);
      
      // Agregar la nueva tarea al estado local
      setTasks(prevTasks => [...prevTasks, newTask]);
      
      // Limpiar el formulario
      setDesc("");
      setAssignedUserId("");
      
      // Mostrar mensaje de éxito (opcional)
      console.log('Tarea creada correctamente:', newTask);
    } catch (err) {
      console.error('Error agregando tarea:', err);
      setError("Error agregando tarea: " + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

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
        // Filtrar duplicados por username (case-insensitive)
        const uniqueUsers = users.filter((user, index, self) =>
          index === self.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase())
        );
        setUsersList(uniqueUsers);
      } catch (err) {
        console.error('Error cargando usuarios:', err);
      }
    };
    
    fetchUsers();
  }, [token]);

  // Eliminar una tarea
  const deleteTask = async (taskId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.')) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Usar el servicio de API para eliminar la tarea
      await tasksAPI.deleteTask(taskId);
      
      // Actualizar el estado local eliminando la tarea
      setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
      
      console.log('Tarea eliminada correctamente');
    } catch (err) {
      console.error('Error eliminando tarea:', err);
      setError("Error eliminando tarea: " + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };
  
  // Iniciar edición de una tarea
  const startEditTask = (taskId, taskDesc) => {
    setEditTaskId(taskId);
    setEditTaskText(taskDesc);
  };
  
  // Guardar la edición de una tarea
  const saveEditTask = async () => {
    if (editTaskText.trim() === "") return;
    
    setLoading(true);
    setError("");
    
    try {
      // Usar el servicio de API en lugar de fetch directo
      const updatedTask = await tasksAPI.updateTask(editTaskId, {
        desc: editTaskText
      });
      
      // Actualizar el estado local
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task._id === editTaskId ? updatedTask : task
        )
      );
      
      // Resetear estado de edición
      setEditTaskId(null);
      setEditTaskText("");
      
      console.log('Tarea actualizada correctamente:', updatedTask);
    } catch (err) {
      console.error('Error actualizando tarea:', err);
      setError("Error actualizando tarea: " + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };
  
  // Exportar a Excel
  const exportToExcel = async () => {
    try {
      // Obtener datos actualizados para el reporte
      const data = await tasksAPI.getTasks();
      
      // Preparar los datos para el Excel
      const tableData = data.map(task => ({
        'ID': task._id,
        'Descripción': task.desc,
        'Estado': task.status === 'pending' ? 'Pendiente' : 
                 task.status === 'inprogress' ? 'En progreso' : 'Completada',
        'Responsable': task.assignedTo ? (task.assignedTo.displayName || task.assignedTo.username) : 'Sin asignar',
        'Fecha de creación': new Date(task.createdAt).toLocaleDateString(),
        'Última actualización': new Date(task.updatedAt).toLocaleDateString()
      }));
      
      if (tableData.length === 0) {
        alert('No hay datos para exportar');
        return;
      }
      
      // Crear un libro de Excel usando biblioteca externa (como SheetJS/xlsx)
      // Por ahora simularemos la exportación con un archivo CSV
      const headers = Object.keys(tableData[0]).join(',');
      const rows = tableData.map(row => Object.values(row).join(','));
      const csvContent = [headers, ...rows].join('\n');
      
      // Crear blob y link para descarga
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `tareas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Exportación a Excel (CSV) completada');
    } catch (err) {
      console.error('Error exportando a Excel:', err);
      alert('Error al exportar a Excel: ' + (err.message || 'Error desconocido'));
    }
  };
  
  // Mostrar reporte con formato estructurado
  const showReport = async () => {
    try {
      // Obtener datos actualizados para el reporte
      const data = await tasksAPI.getTasks({ includeArchived });
      
      if (data.length === 0) {
        alert('No hay tareas para mostrar en el reporte');
        return;
      }
      
      // Organizar las tareas por estado
      const reportStructure = {
        completed: data.filter(task => task.status === 'completed'),
        inprogress: data.filter(task => task.status === 'inprogress'),
        pending: data.filter(task => task.status === 'pending'),
        archived: data.filter(task => task.archived)
      };
      
      // Guardar en el estado
      setReportData(reportStructure);
      setShowingReport(true);
      
      console.log('Previsualización del reporte generada');
    } catch (err) {
      console.error('Error generando previsualización:', err);
      alert('Error al generar la previsualización: ' + (err.message || 'Error desconocido'));
    }
  };
  
  // Cerrar la previsualización del reporte
  const closeReport = () => {
    setShowingReport(false);
    setReportData(null);
  };
  
  // Exportar a PDF
  const exportToPDF = async () => {
    try {
      // Obtener datos actualizados para el reporte
      const data = await tasksAPI.getTasks();
      
      if (data.length === 0) {
        alert('No hay datos para exportar');
        return;
      }
      
      // Por ahora, solo mostrar un mensaje informativo
      alert('Esta funcionalidad requiere la biblioteca jsPDF u otra similar.');
      console.log('Se requiere implementar la exportación a PDF con datos:', data.length, 'tareas');
      
      // Código para generar PDF (requiere la biblioteca jsPDF)
      /* 
      const doc = new jsPDF();
      
      // Añadir título
      doc.setFontSize(18);
      doc.text('Reporte de Tareas', 20, 20);
      
      // Configurar tabla
      doc.setFontSize(11);
      const columns = ['Descripción', 'Estado', 'Responsable', 'Fecha'];
      const rows = tasks.map(task => [
        task.desc,
        task.status === 'pending' ? 'Pendiente' : 
          task.status === 'inprogress' ? 'En progreso' : 'Completada',
        task.assignedTo ? (task.assignedTo.displayName || task.assignedTo.username) : 'Sin asignar',
        new Date(task.createdAt).toLocaleDateString()
      ]);
      
      // Añadir tabla al documento
      doc.autoTable({
        head: [columns],
        body: rows,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      });
      
      // Descargar el PDF
      doc.save(`tareas_${new Date().toISOString().split('T')[0]}.pdf`);
      */
    } catch (err) {
      console.error('Error exportando a PDF:', err);
      alert('Error al exportar a PDF: ' + (err.message || 'Error desconocido'));
    }
  };
  
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-indigo-100">
      {/* Modal de edición de tarea */}
      {editTaskId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Editar tarea</h3>
              <button 
                onClick={() => {
                  setEditTaskId(null);
                  setEditTaskText("");
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={editTaskText}
                onChange={(e) => setEditTaskText(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows="4"
              ></textarea>
            </div>
            
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditTaskId(null);
                  setEditTaskText("");
                }}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditTask}
                disabled={loading || editTaskText.trim() === ''}
                className={`px-4 py-2 rounded-md text-white ${loading || editTaskText.trim() === '' ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de previsualización del reporte */}
      {showingReport && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/90 rounded-2xl shadow-2xl p-6 flex-1 min-w-[300px] backdrop-blur-md border border-purple-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-3xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Listado de Tareas de la semana</h2>
              <button 
                onClick={closeReport}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-left">
              {/* Actividades Completadas */}
              <div>
                <h3 className="text-lg font-semibold flex items-center text-green-700">
                  <span className="mr-2">✅</span> Actividades Completadas
                </h3>
                <ul className="ml-8 mt-2 space-y-1">
                  {reportData.completed.length > 0 ? (
                    reportData.completed.map(task => (
                      <li key={task._id} className="flex items-start">
                        <span className="mr-1 text-green-600">✔</span>
                        <span>
                          {task.assignedTo ? (
                            <span className="font-medium">{task.assignedTo.displayName || task.assignedTo.username}- </span>
                          ) : null}
                          {task.desc}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">No hay actividades completadas</li>
                  )}
                </ul>
              </div>
              
              {/* Actividades en Progreso */}
              <div>
                <h3 className="text-lg font-semibold flex items-center text-yellow-700">
                  <span className="mr-2">✅</span> Actividades en Progreso
                </h3>
                <ul className="ml-8 mt-2 space-y-1">
                  {reportData.inprogress.length > 0 ? (
                    reportData.inprogress.map(task => (
                      <li key={task._id} className="flex items-start">
                        <span className="mr-1 text-yellow-600">✔</span>
                        <span>
                          {task.assignedTo ? (
                            <span className="font-medium">{task.assignedTo.displayName || task.assignedTo.username}- </span>
                          ) : null}
                          {task.desc}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">No hay actividades en progreso</li>
                  )}
                </ul>
              </div>
              
              {/* Actividades Pendientes */}
              <div>
                <h3 className="text-lg font-semibold flex items-center text-blue-700">
                  <span className="mr-2">✅</span> Actividades Pendientes
                </h3>
                <ul className="ml-8 mt-2 space-y-1">
                  {reportData.pending.length > 0 ? (
                    reportData.pending.map(task => (
                      <li key={task._id} className="flex items-start">
                        <span className="mr-1 text-blue-600">✔</span>
                        <span>
                          {task.assignedTo ? (
                            <span className="font-medium">{task.assignedTo.displayName || task.assignedTo.username}- </span>
                          ) : null}
                          {task.desc}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">No hay actividades pendientes</li>
                  )}
                </ul>
              </div>
              
              {/* Actividades Archivadas */}
              <div>
                <h3 className="text-lg font-semibold flex items-center text-gray-700">
                  <span className="mr-2">✅</span> Actividades Archivadas
                </h3>
                <ul className="ml-8 mt-2 space-y-1">
                  {reportData.archived.length > 0 ? (
                    reportData.archived.map(task => (
                      <li key={task._id} className="flex items-start">
                        <span className="mr-1 text-gray-600">✔</span>
                        <span>
                          {task.assignedTo ? (
                            <span className="font-medium">{task.assignedTo.displayName || task.assignedTo.username}- </span>
                          ) : null}
                          {task.desc}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">No hay actividades archivadas</li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={closeReport}
                className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300"
              >
                Cerrar
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 rounded-md text-white hover:bg-green-700"
              >
                Exportar a Excel
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 rounded-md text-white hover:bg-red-700"
              >
                Exportar a PDF
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h1 className="ml-2 text-xl font-bold text-gray-900">MPI - Gestor de Tareas</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gray-100 px-3 py-1.5 rounded-full">
                <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {currentUser?.displayName || currentUser?.username}
                </span>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {currentUser?.role === 'admin' ? 'Admin' : 'Usuario'}
                </span>
              </div>
              <button 
                onClick={logout}
                className="inline-flex items-center bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium rounded-md text-sm px-3 py-1.5 transition-colors">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Formulario para agregar tarea */}
            <div className="w-full lg:w-1/4 p-3 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Agregar nueva tarea
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de la tarea</label>
                  <textarea 
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Describe la tarea a realizar"
                    rows="3"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a usuario</label>
                  <select
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar usuario</option>
                    {usersList.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.displayName || user.username}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={addTask}
                  disabled={loading || desc.trim() === ''}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${loading || desc.trim() === '' ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {loading ? 'Agregando...' : 'Agregar tarea'}
                </button>
                
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
            </div>
            
            {/* Tablero Kanban */}
            <div className="w-full lg:w-3/4 pl-0 lg:pl-6 mt-6 lg:mt-0">
              <h2 className="text-lg font-medium mb-4">Tablero de tareas</h2>
              
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {columns.map((column) => {
  // Color classes per column
  let colBg = "", colBorder = "", headerBg = "", headerText = "";
  if (column.key === "pending") {
    colBg = "bg-yellow-50 border-yellow-200";
    colBorder = "border-l-4 border-yellow-400";
    headerBg = "bg-yellow-100/80";
    headerText = "text-yellow-800";
  } else if (column.key === "inprogress") {
    colBg = "bg-blue-50 border-blue-200";
    colBorder = "border-l-4 border-blue-400";
    headerBg = "bg-blue-100/80";
    headerText = "text-blue-800";
  } else if (column.key === "completed") {
    colBg = "bg-green-50 border-green-200";
    colBorder = "border-l-4 border-green-400";
    headerBg = "bg-green-100/80";
    headerText = "text-green-800";
  }
  return (
    <div key={column.key} className={`rounded-2xl shadow-md p-3 ${colBg} border transition-all duration-200`}>
      <div className={`flex items-center mb-3 px-2 py-1 rounded-lg ${headerBg} ${headerText} font-semibold text-base`}> 
        <span className="mr-2">
          {column.key === "pending" && "⏳"}
          {column.key === "inprogress" && "🚧"}
          {column.key === "completed" && "✅"}
        </span>
        <span>{column.label}</span>
        <span className="ml-2 bg-white/60 text-xs py-0.5 px-2 rounded-full border border-gray-200">
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
      {(provided, snapshot) => {
        // Card color border per status
        let cardBorder = "", cardBg = "", cardText = "", cardIcon = null;
        if (column.key === "pending") {
          cardBorder = "border-l-4 border-yellow-400";
          cardBg = "bg-white";
          cardText = "text-gray-800";
          cardIcon = "⏳";
        } else if (column.key === "inprogress") {
          cardBorder = "border-l-4 border-blue-400";
          cardBg = "bg-white";
          cardText = "text-gray-800";
          cardIcon = "🚧";
        } else if (column.key === "completed") {
          cardBorder = "border-l-4 border-green-400";
          cardBg = "bg-green-50";
          cardText = "text-green-800";
          cardIcon = "✅";
        }
        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`rounded-lg shadow-md hover:shadow-lg transition-all duration-200 my-3 border ${cardBorder} ${cardBg} overflow-hidden`}
          >
            {/* Cabecera de la tarjeta con prioridad visual */}
            <div className={`px-4 py-2 border-b ${column.key === 'pending' ? 'bg-yellow-50 border-yellow-100' : column.key === 'inprogress' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'} flex justify-between items-center`}>
              <div className="flex items-center">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-2 ${column.key === 'pending' ? 'bg-yellow-100 text-yellow-700' : column.key === 'inprogress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {cardIcon}
                </span>
                <span className={`text-sm font-semibold ${column.key === 'pending' ? 'text-yellow-800' : column.key === 'inprogress' ? 'text-blue-800' : 'text-green-800'}`}>
                  {column.key === 'pending' ? 'Pendiente' : column.key === 'inprogress' ? 'En progreso' : 'Completada'}
                </span>
              </div>
              <div className="text-xs text-gray-500 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(task.createdAt).toLocaleDateString()}
              </div>
            </div>
            
            {/* Contenido principal */}
            <div className="p-4 bg-white">
              <p className="text-gray-800 font-medium mb-3 line-clamp-2">{task.desc}</p>
              
              {/* Responsable */}
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 mr-2">
                  {task.assignedTo && task.assignedTo.displayName ? task.assignedTo.displayName.charAt(0).toUpperCase() : 
                   task.assignedTo && task.assignedTo.username ? task.assignedTo.username.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="text-sm">
                  <p className="text-gray-900 font-medium">
                    {task.assignedTo && (task.assignedTo.displayName || task.assignedTo.username) ? 
                      (task.assignedTo.displayName || task.assignedTo.username) : 'Sin asignar'}
                  </p>
                  <AssigneeEditor 
                    task={task} 
                    onUpdate={(updatedTask) => {
                      setTasks(tasks.map(t => 
                        t._id === updatedTask._id ? updatedTask : t
                      ));
                    }} 
                  />
                </div>
              </div>
            </div>
            
            {/* Acciones de la tarea */}
            <div className="mt-3 flex justify-center gap-2">
              <button 
                onClick={() => startEditTask(task._id, task.desc)}
                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded border border-blue-200"
              >
                Editar
              </button>
              
              {column.key === 'completed' && !task.archived && (
                <button 
                  onClick={() => archiveTask(task._id)}
                  className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-medium rounded border border-green-200"
                >
                  Archivar
                </button>
              )}
              
              <button 
                onClick={() => deleteTask(task._id)}
                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded border border-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        );
      }}
    </Draggable>
  ))}
  {provided.placeholder}
</div>
)}
</Droppable>
</div>
  );
})}
</div>
              </DragDropContext>
            </div>
          </div>
          
          {/* Sección de Reportes */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Reportes y estadísticas
              </h2>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => showReport()}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Previsualizar
                </button>
                
                <button
                  onClick={() => exportToExcel()}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Excel
                </button>
                
                <button
                  onClick={() => exportToPDF()}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  PDF
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Tareas por estado</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full" 
                        style={{ width: `${Math.round(tasks.filter(t => t.status === 'pending').length / Math.max(tasks.length, 1) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1 text-gray-500">Pendientes: {tasks.filter(t => t.status === 'pending').length}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-yellow-500 rounded-full" 
                        style={{ width: `${Math.round(tasks.filter(t => t.status === 'inprogress').length / Math.max(tasks.length, 1) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1 text-gray-500">En progreso: {tasks.filter(t => t.status === 'inprogress').length}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-green-500 rounded-full" 
                        style={{ width: `${Math.round(tasks.filter(t => t.status === 'completed').length / Math.max(tasks.length, 1) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1 text-gray-500">Completadas: {tasks.filter(t => t.status === 'completed').length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-100">
                <h3 className="text-sm font-medium text-purple-800 mb-2">Asignaciones por usuario</h3>
                {usersList.length > 0 ? (
                  <div className="space-y-2">
                    {usersList.map(user => {
                      const userTasks = tasks.filter(t => t.assignedUserId === user._id);
                      const percentage = Math.round(userTasks.length / Math.max(tasks.length, 1) * 100);
                      return (
                        <div key={user._id} className="text-xs">
                          <div className="flex justify-between mb-1">
                            <span>{user.displayName || user.username}</span>
                            <span>{userTasks.length} tareas ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-purple-500 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No hay usuarios disponibles</p>
                )}
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100">
                <h3 className="text-sm font-medium text-green-800 mb-2">Rendimiento general</h3>
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{tasks.length}</div>
                    <div className="text-xs text-gray-500">Total tareas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(tasks.filter(t => t.status === 'completed').length / Math.max(tasks.length, 1) * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">Completadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{usersList.length}</div>
                    <div className="text-xs text-gray-500">Usuarios</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
