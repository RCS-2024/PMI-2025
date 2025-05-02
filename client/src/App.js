import React, { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import html2pdf from "html2pdf.js";
import { useNavigate } from "react-router-dom";
import "./index.css";

// Importar context y servicios
import { useAuth } from "./contexts/AuthContext";
import { tasksAPI, usersAPI } from "./services/api";
import UserSelector from "./components/UserSelector";

// Definición de columnas (droppableId SIEMPRE en inglés)
const columns = [
  { key: "pending", label: "Tareas pendientes" },
  { key: "inprogress", label: "Tareas en curso" },
  { key: "completed", label: "Tareas completadas" },
];

// API URL base
const API_BASE_URL = "http://localhost:5000/api";

function App() {
  const { currentUser, token, logout } = useAuth();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [desc, setDesc] = useState("");
  const [assignedUserId, setAssignedUserId] = useState(""); // ID del usuario asignado
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false); // Estado para botón eliminar
  const [archiveLoading, setArchiveLoading] = useState(false); // Estado para botón archivar
  const [editTaskId, setEditTaskId] = useState(null); // ID de la tarea en edición
  const [editTaskText, setEditTaskText] = useState(""); // Texto de la tarea en edición
  const [editAssignedUserId, setEditAssignedUserId] = useState(""); // Usuario asignado en edición
  const [editLoading, setEditLoading] = useState(false); // Estado para la edición
  const [includeArchived, setIncludeArchived] = useState(false); // Incluir archivados en el informe
  const [filterUserId, setFilterUserId] = useState("all"); // Filtrar por usuario en el informe
  const [startDate, setStartDate] = useState(""); // Fecha de inicio para filtrado
  const [endDate, setEndDate] = useState(""); // Fecha de fin para filtrado
  const [sortBy, setSortBy] = useState("createdAt"); // Campo por el que ordenar
  const [sortOrder, setSortOrder] = useState("desc"); // Orden (asc/desc)
  const [report, setReport] = useState(null); // Datos del informe
  const [showReport, setShowReport] = useState(false); // Mostrar/ocultar modal de informe
  const [exporting, setExporting] = useState(false); // Estado para indicar exportación en progreso
  const [usersList, setUsersList] = useState([]); // Lista de usuarios disponibles
  const reportRef = useRef(null); // Referencia al contenido del informe para exportar

  // Cargar tareas del backend
  useEffect(() => {
    const fetchTasks = async () => {
      if (!token) return; // No cargar tareas si no hay token
      
      setLoading(true);
      try {
        // Usar el servicio API con autenticación
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
  
  // Cargar usuarios disponibles
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      
      try {
        const users = await usersAPI.getAllUsers();
        setUsersList(users);
      } catch (err) {
        console.error('Error cargando usuarios:', err);
      }
    };
    
    fetchUsers();
  }, [token]);

  // Agregar tarea al backend
  const addTask = async () => {
    if (desc.trim() === "") return;
    setLoading(true);
    setError("");
    try {
      // Usar el servicio API con token de autenticación
      const newTask = await tasksAPI.createTask({ 
        desc, 
        assignedUserId, 
        status: "pending" 
      });
      
      setTasks([...tasks, newTask]);
      setDesc("");
      setAssignedUserId("");
    } catch (err) {
      console.error('Error agregando tarea:', err);
      setError("Error agregando tarea: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Eliminar tarea
  const deleteTask = async (taskId) => {
    if (window.confirm("¿Seguro que desea eliminar esta tarea?")) {
      setDeleteLoading(true);
      try {
        // Usar el servicio API con token de autenticación
        await tasksAPI.deleteTask(taskId);
        setTasks(tasks.filter(task => task._id !== taskId));
      } catch (err) {
        console.error("Error eliminando tarea:", err);
        setError("Error eliminando tarea: " + err.message);
      } finally {
        setDeleteLoading(false);
      }
    }
  };
  
  // Archivar tarea completada
  const archiveTask = async (taskId) => {
    if (window.confirm("¿Archivar esta tarea? (Solo las tareas completadas pueden ser archivadas)")) {
      setArchiveLoading(true);
      try {
        // Usar el servicio API con token de autenticación
        const archivedTask = await tasksAPI.archiveTask(taskId);
        
        setTasks(tasks.map(task => 
          task._id === taskId ? archivedTask : task
        ));
      } catch (err) {
        console.error("Error archivando tarea:", err);
        setError("Error archivando tarea: " + err.message);
      } finally {
        setArchiveLoading(false);
      }
    }
  };
  
  // Iniciar edición de una tarea
  const startEditTask = (taskId, taskDesc) => {
    setEditTaskId(taskId);
    setEditTaskText(taskDesc);
  };

  // Cancelar edición
  const cancelEditTask = () => {
    setEditTaskId(null);
    setEditTaskText("");
  };

  // Función para guardar la tarea editada
  const saveEditTask = async () => {
    // Verificar que la descripción no esté vacía
    if (editTaskText.trim() === "") {
      setError("La descripción no puede estar vacía");
      return;
    }
    
    try {
      // Encontrar la tarea actual para comparar
      const currentTask = tasks.find(task => task._id === editTaskId);
      
      // Si la tarea no existe en el estado local, mostrar error
      if (!currentTask) {
        setError("No se encontró la tarea a editar");
        setEditTaskId(null);
        setEditTaskText("");
        return;
      }
      
      // Si la descripción no ha cambiado, simplemente cerrar el modo edición
      if (currentTask.desc === editTaskText) {
        setEditTaskId(null);
        setEditTaskText("");
        return;
      }
      
      setEditLoading(true);
      setError("");
      
      // Enviar solo la descripción actualizada, sin mencionar el status
      // Esto evita problemas con la validación del status en el backend
      const response = await fetch(`${API_BASE_URL}/${editTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desc: editTaskText })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error;
        
        // Mejorar mensajes de error
        if (errorMessage.includes('validación')) {
          errorMessage = errorMessage.replace('Error de validación: ', '');
        }
        throw new Error(errorMessage || "Error al editar tarea");
      }
      
      const updatedTask = await response.json();
      
      // Actualizar el estado local
      setTasks(prevTasks => prevTasks.map(task => 
        task._id === editTaskId ? updatedTask : task
      ));
      
      // Resetear estados de edición
      setEditTaskId(null);
      setEditTaskText("");
      
    } catch (err) {
      console.error("Error al editar tarea:", err);
      setError(err.message || "Error al editar tarea");
    } finally {
      setEditLoading(false);
    }
  };

  // Generar informe
  const generateReport = async () => {
    setLoading(true);
    try {
      // Usar el servicio API con token de autenticación
      const reportData = await tasksAPI.generateReport({
        includeArchived,
        userId: filterUserId !== "all" ? filterUserId : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder
      });
      
      setReport(reportData);
      setShowReport(true);
    } catch (err) {
      console.error("Error generando informe:", err);
      setError("Error generando informe: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Exportar informe a PDF
  const exportToPDF = () => {
    if (!report || !reportRef.current) return;
    
    try {
      setExporting(true);
      
      const element = reportRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `informe-tareas-${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Usar timeout para que el indicador de carga se muestre
      setTimeout(() => {
        html2pdf()
          .set(opt)
          .from(element)
          .save()
          .then(() => {
            setExporting(false);
            console.log('PDF generado y guardado con éxito');
          })
          .catch(err => {
            console.error('Error al generar PDF:', err);
            setExporting(false);
          });
      }, 100);
      
    } catch (err) {
      console.error("Error al exportar a PDF:", err);
      setExporting(false);
    }
  };
  
  // Exportar datos a CSV
  const exportToCSV = () => {
    if (!report) return;
    
    try {
      setExporting(true);
      
      // Preparar encabezados
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Tarea,Usuario,Estado,Fecha de creación" + (includeArchived ? ",Fecha de archivado\n" : "\n");
      
      // Agregar datos de tareas
      report.tasks.forEach(task => {
        // Escapar comillas en la descripción
        const desc = task.desc.replace(/"/g, '""');
        const status = task.archived ? "Archivada" : 
                     task.status === "pending" ? "Pendiente" :
                     task.status === "inprogress" ? "En Curso" : "Completada";
        
        const row = [
          `"${desc}"`,
          `"${task.user || 'Sin asignar'}"`,
          `"${status}"`,
          `"${new Date(task.createdAt).toLocaleDateString()}"`
        ];
        
        if (includeArchived && task.archived) {
          row.push(`"${new Date(task.archivedAt).toLocaleDateString()}"`); 
        } else if (includeArchived) {
          row.push(""); // Columna vacía si no está archivada
        }
        
        csvContent += row.join(",") + "\n";
      });
      
      // Crear enlace de descarga
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `tareas-${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      
      // Simular clic
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      setExporting(false);
      console.log('CSV generado y guardado con éxito');
      
    } catch (err) {
      console.error("Error al exportar a CSV:", err);
      setExporting(false);
    }
  };

  // Drag & Drop handler - versión robusta con persistencia en backend
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    console.log("Drag result:", result);
    
    // Si no hay destino o es el mismo origen, no hacemos nada
    if (!destination || destination.droppableId === source.droppableId) return;
    
    try {
      // Encuentra la tarea movida
      const taskToMove = tasks.find(t => t._id === draggableId);
      
      // Si no encontramos la tarea, salimos sin error
      if (!taskToMove) {
        console.log("Tarea no encontrada:", draggableId);
        return;
      }
      
      console.log("Moviendo tarea:", taskToMove.desc, "de", source.droppableId, "a", destination.droppableId);
      
      // 1. Actualiza el estado local inmediatamente (para UI responsiva)
      const updatedTask = {
        ...taskToMove,
        status: destination.droppableId
      };
      
      // Actualiza las tareas localmente
      setTasks(tasks.map(t => 
        t._id === draggableId ? updatedTask : t
      ));
      
      // 2. Persiste el cambio en el backend
      const response = await fetch(`${API_BASE_URL}/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: destination.droppableId })
      });
      
      if (!response.ok) {
        // Si hay un error, mostramos mensaje pero NO revertimos UI
        // para evitar saltos visuales
        console.error('Error al persistir cambio:', await response.text());
      } else {
        console.log('✅ Cambio guardado en el backend');
      }
    } catch (err) {
      console.error("Error en drag & drop:", err);
      // No cambiamos loading para evitar problemas con react-beautiful-dnd
    }
  };

  return (
    <div className="App">
      {/* Encabezado con información de usuario y botón de cerrar sesión */}
      <div className="bg-white shadow-md py-3 px-4 mb-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-gray-800">MPI - Gestor de Tareas</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Conectado como: <strong>{currentUser?.displayName || currentUser?.username}</strong>
              {currentUser?.role === 'admin' && <span className="ml-1 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Admin</span>}
            </span>
            <button 
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal de Informe */}
      {showReport && report && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Informe de Tareas</h2>
              
              {/* Botones de exportación */}
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToPDF}
                  disabled={exporting}
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${exporting ? 'bg-gray-200 text-gray-500' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                  title="Exportar a PDF"
                >
                  <span className="text-xs">📄</span> 
                  {exporting ? 'Exportando...' : 'PDF'}
                </button>
                
                <button
                  onClick={exportToCSV}
                  disabled={exporting}
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${exporting ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  title="Exportar a CSV (Excel)"
                >
                  <span className="text-xs">📂</span> 
                  {exporting ? 'Exportando...' : 'CSV'}
                </button>
                
                <button 
                  onClick={() => setShowReport(false)}
                  className="text-gray-500 hover:text-gray-700 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Contenido del informe - con referencia para exportar */}
            <div ref={reportRef}>
            
            {/* Estadísticas */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Resumen</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-gray-100 p-3 rounded">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-xl font-bold">{report.totalTasks}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Pendientes</div>
                  <div className="text-xl font-bold">{report.byStatus.pending}</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <div className="text-sm text-gray-500">En Curso</div>
                  <div className="text-xl font-bold">{report.byStatus.inprogress}</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Completadas</div>
                  <div className="text-xl font-bold">{report.byStatus.completed}</div>
                </div>
                {includeArchived && (
                  <div className="bg-gray-200 p-3 rounded">
                    <div className="text-sm text-gray-500">Archivadas</div>
                    <div className="text-xl font-bold">{report.byStatus.archived}</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Por usuario */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Por Usuario</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Usuario</th>
                      <th className="border p-2 text-center">Total</th>
                      <th className="border p-2 text-center">Pendientes</th>
                      <th className="border p-2 text-center">En Curso</th>
                      <th className="border p-2 text-center">Completadas</th>
                      {includeArchived && (
                        <th className="border p-2 text-center">Archivadas</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.byUser).map(([userName, stats]) => (
                      <tr key={userName} className="hover:bg-gray-50">
                        <td className="border p-2">{userName}</td>
                        <td className="border p-2 text-center">{stats.total}</td>
                        <td className="border p-2 text-center">{stats.pending}</td>
                        <td className="border p-2 text-center">{stats.inprogress}</td>
                        <td className="border p-2 text-center">{stats.completed}</td>
                        {includeArchived && (
                          <td className="border p-2 text-center">{stats.archived}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Lista de tareas agrupadas por estado */}
            <div>
              <h3 className="font-semibold mb-2">Listado de Tareas</h3>

              {/* Completadas */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1 text-green-700 font-bold text-base">
                  <span>✅</span> Actividades Completadas
                </div>
                <ul className="list-none pl-0">
                  {report.tasks.filter(t => t.status === 'completed' && !t.archived).length === 0 && (
                    <li className="text-gray-500 italic">No hay actividades completadas</li>
                  )}
                  {report.tasks.filter(t => t.status === 'completed' && !t.archived).map(task => (
                    <li key={task._id} className="flex items-center gap-2 mb-1 text-green-900">
                      <span className="text-lg">✔</span> {task.desc}
                    </li>
                  ))}
                </ul>
              </div>
              {/* En Progreso */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1 text-yellow-700 font-bold text-base">
                  <span>✅</span> Actividades en Progreso
                </div>
                <ul className="list-none pl-0">
                  {report.tasks.filter(t => t.status === 'inprogress').length === 0 && (
                    <li className="text-gray-500 italic">No hay actividades en progreso</li>
                  )}
                  {report.tasks.filter(t => t.status === 'inprogress').map(task => (
                    <li key={task._id} className="flex items-center gap-2 mb-1 text-yellow-900">
                      <span className="text-lg">✔</span> {task.desc}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Pendientes */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1 text-blue-700 font-bold text-base">
                  <span>✅</span> Actividades Pendientes
                </div>
                <ul className="list-none pl-0">
                  {report.tasks.filter(t => t.status === 'pending').length === 0 && (
                    <li className="text-gray-500 italic">No hay actividades pendientes</li>
                  )}
                  {report.tasks.filter(t => t.status === 'pending').map(task => (
                    <li key={task._id} className="flex items-center gap-2 mb-1 text-blue-900">
                      <span className="text-lg">✔</span> {task.desc}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Tareas Archivadas - Solo si está activada la opción */}
              {includeArchived && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2 bg-gray-100 p-2 rounded-md flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                    Archivadas ({report.tasks.filter(t => t.archived).length})
                  </h4>
                  <div className="space-y-2 pl-4">
                    {report.tasks
                      .filter(task => task.archived)
                      .map(task => (
                        <div key={task._id} className="border p-3 rounded hover:bg-gray-50">
                          <div className="flex justify-between">
                            <div className="font-medium">{task.desc}</div>
                            <div className="px-2 py-1 rounded text-xs bg-gray-200">Archivada</div>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {task.user && <span className="mr-3">Usuario: {task.user}</span>}
                            <span>Creada: {new Date(task.createdAt).toLocaleDateString()}</span>
                            <span className="ml-3">Archivada: {new Date(task.archivedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    {report.tasks.filter(t => t.archived).length === 0 && 
                      <div className="text-gray-500 italic">No hay tareas archivadas</div>
                    }
                  </div>
                </div>
              )}
            </div> {/* Cierre del div con referencia */}
          </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-full md:max-w-[1200px] border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        <div className="w-full md:w-56 flex flex-col gap-4">
          <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200 shadow-sm">
            <h2 className="font-bold text-lg mb-3 flex items-center text-gray-800">
              <span className="mr-2 text-[#5d2323]">➕</span> 
              Agregar nueva tarea
            </h2>
            <div className="mb-4">
              <input
                className="border border-gray-300 rounded-lg px-3 py-2.5 w-full mb-1 focus:outline-none focus:ring-2 focus:ring-[#5d2323] focus:border-transparent transition-all shadow-sm"
                placeholder="Introduzca la descripción de la tarea"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                disabled={loading}
              />
              <div className="text-xs text-gray-500 ml-1">Descripción de la tarea a realizar</div>
            </div>
            
            <div className="mb-4">
              <UserSelector
                value={assignedUserId}
                onChange={setAssignedUserId}
                placeholder="Asignar a usuario"
                className="border p-2 rounded w-full"
              />
              <div className="text-xs text-gray-500 ml-1">Responsable asignado</div>
            </div>
            
            <button
              onClick={addTask}
              className="bg-[#5d2323] text-white rounded-xl px-4 py-2.5 w-full hover:bg-[#7a2e2e] transition-colors mt-2 font-semibold shadow flex items-center justify-center"
              disabled={loading}
            >
              {loading ? 
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Agregando...
                </span> : 
                "Agregar tarea"
              }
            </button>
            {error && <div className="text-red-500 text-sm mt-2">Error al agregar una tarea</div>}
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="font-bold text-lg mb-3 flex items-center text-gray-800">
              <span className="mr-2">📊</span> 
              Generar informe
            </h2>
            
            {/* Opciones de filtrado */}
            <div className="space-y-4 mb-4">
              <h3 className="font-bold text-base border-b pb-2 mb-2 text-gray-700">Filtros</h3>
              
              {/* Filtro de archivadas */}
              <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="archived"
                    checked={includeArchived}
                    onChange={e => setIncludeArchived(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out mr-2"
                  />
                </div>
                <label htmlFor="archived" className="text-base text-gray-800 cursor-pointer select-none flex items-center font-medium">
                  <span className="mr-1">📂</span> Incluir tareas archivadas
                </label>
              </div>
              
              {/* Filtro de usuario */}
              <div className="mb-4">
                <label htmlFor="filterUser" className="block text-sm text-gray-700 mb-2 flex items-center font-medium">
                  <span className="mr-1">👤</span> Filtrar por usuario:
                </label>
                <UserSelector
                  value={filterUserId}
                  onChange={setFilterUserId}
                  placeholder="Todos los usuarios"
                  className="border p-2 rounded w-full"
                />
              </div>
              
              {/* Filtro de fechas */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm text-gray-700 mb-2 flex items-center font-medium">
                    <span className="mr-1">📅</span> Desde:
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => {
                       setStartDate(e.target.value);
                     }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm text-gray-700 mb-2 flex items-center font-medium">
                    <span className="mr-1">📅</span> Hasta:
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => {
                       setEndDate(e.target.value);
                     }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Opciones de ordenamiento */}
            <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-bold text-base border-b pb-2 mb-3 text-gray-700">Ordenamiento</h3>
              <div className="flex flex-col gap-2">
                <div className="flex flex-row items-end gap-3">
                  <div className="flex flex-col flex-1">
                    <label htmlFor="sortBy" className="text-sm text-gray-700 mb-1 flex items-center font-medium">
                      <span className="mr-1">🔍</span> Ordenar por:
                    </label>
                    <select
                      id="sortBy"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="createdAt">Fecha de creación</option>
                      <option value="desc">Descripción</option>
                      <option value="status">Estado</option>
                      <option value="user">Usuario</option>
                    </select>
                  </div>
                  <div className="flex flex-col flex-1">
                    <label htmlFor="sortOrder" className="text-sm text-gray-700 mb-1 flex items-center font-medium">
                      <span className="mr-1">🔊</span> Orden:
                    </label>
                    <select
                      id="sortOrder"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="desc">Descendente (Z-A)</option>
                      <option value="asc">Ascendente (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={generateReport}
              className={`rounded-lg px-4 py-2.5 w-full transition-colors mt-2 font-medium shadow-sm flex items-center justify-center ${loading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`} 
              disabled={loading}
            >
              {loading ? 
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </span> : 
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generar informe
                </span>
              }
            </button>
            {error && <div className="text-red-500 text-sm mt-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>}
          </div>
          
          <style jsx>{`
            .toggle-checkbox:checked + .toggle-label {
              background-color: #e2e2e2;
            }
          `}</style>
        </div>
        {/* Kanban Columns con Drag & Drop */}
        <DragDropContext onDragEnd={onDragEnd}>

          <div className="w-full pb-2">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Tablero de tareas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{minHeight: "55vh"}}>
              {/* Renderización robusta de columnas - cada droppable SIEMPRE se renderiza */}
              {columns.map((col) => {
                // Estilos diferentes para cada tipo de columna
                const columnStyles = {
                  pending: {
                    header: 'bg-blue-50 border-blue-200',
                    indicator: 'bg-blue-500',
                    dragOver: 'bg-blue-50 border-blue-300'
                  },
                  inprogress: {
                    header: 'bg-yellow-50 border-yellow-200',
                    indicator: 'bg-yellow-500',
                    dragOver: 'bg-yellow-50 border-yellow-300'
                  },
                  completed: {
                    header: 'bg-green-50 border-green-200',
                    indicator: 'bg-green-500',
                    dragOver: 'bg-green-50 border-green-300'
                  }
                };
                
                const style = columnStyles[col.key];
                
                return (
                  <Droppable droppableId={col.key} key={col.key}>
                    {(provided, snapshot) => {
                      // Extraer las tareas de esta columna - seguro contra errores
                      // Excluir tareas archivadas del Kanban
                      const columnTasks = Array.isArray(tasks) 
                        ? tasks.filter(t => t && t.status === col.key && !t.archived)
                        : [];
                        
                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`bg-white rounded-lg border ${snapshot.isDraggingOver ? style.dragOver : 'border-gray-200'} shadow-sm flex flex-col transition-colors duration-200 h-full`}
                          style={{minHeight: "50vh"}}
                        >
                          {/* Cabecera de la columna */}
                          <div className={`${style.header} rounded-t-lg border-b p-3 flex items-center justify-between sticky top-0 z-10`}>
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${style.indicator} mr-2`}></div>
                              <div className="font-bold">{col.label}</div>
                            </div>
                            <div className="bg-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                              {columnTasks.length}
                            </div>
                          </div>
                          
                          {/* Cuerpo de la columna con scroll */}
                          <div className="p-3 flex-1 overflow-y-auto">
                            {/* Mensaje de carga */}
                            {loading && (
                              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center justify-center mb-2">
                                <svg className="animate-spin h-5 w-5 text-gray-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-gray-500 text-sm">Cargando...</span>
                              </div>
                            )}
                            
                            {/* Contenedor de tareas */}
                            <div className="space-y-3">
                              {!loading && columnTasks.length === 0 ? (
                                <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-5 flex flex-col items-center justify-center text-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  <div className="text-gray-500 text-sm">No hay tareas en esta columna.</div>
                                </div>
                              ) : (
                                // Lista de tareas
                                !loading && columnTasks.map((task, index) => (
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
                                        className={`bg-white rounded-lg border shadow-sm hover:shadow transition-all ${snapshot.isDragging ? 'border-blue-300 shadow-md scale-[1.02] z-50' : 'border-gray-200'}`}
                                      >
                                        {/* Parte superior de la tarea con barra de color según columna */}
                                        <div className={`h-1 rounded-t-lg ${style.indicator}`}></div>
                                        
                                        {/* Contenido de la tarea */}
                                        <div className="p-2">
                                          <div className="flex justify-between items-start">
                                            {/* Modo edición para tareas pendientes */}
                                            {editTaskId === task._id ? (
                                              <div className="flex flex-col space-y-2">
                                                <input
                                                  type="text"
                                                  className="border p-1 w-full rounded"
                                                  value={editTaskText}
                                                  onChange={(e) => setEditTaskText(e.target.value)}
                                                />
                                                <div className="w-full">
                                                  <UserSelector
                                                    value={editAssignedUserId}
                                                    onChange={setEditAssignedUserId}
                                                    placeholder="Asignar a usuario"
                                                    className="border p-1 w-full rounded text-sm"
                                                  />
                                                </div>
                                                {editLoading ? (
                                                  <span className="p-1 text-sm">Guardando...</span>
                                                ) : (
                                                  <div className="flex space-x-2">
                                                    <button
                                                      onClick={saveEditTask}
                                                      className="bg-green-500 text-white rounded p-1 text-sm"
                                                    >
                                                      Guardar
                                                    </button>
                                                    <button
                                                      onClick={() => setEditTaskId(null)}
                                                      className="bg-gray-500 text-white rounded p-1 text-sm"
                                                    >
                                                      Cancelar
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="font-semibold text-gray-800 text-sm">{task.desc}</div>
                                            )}
                                            <div className="flex ml-2">
                                              {/* Botones de edición (solo para tareas pendientes) */}
                                              {task.status === "pending" && !editTaskId && (
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditTask(task._id, task.desc);
                                                  }}
                                                  className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                                  title="Editar tarea"
                                                >
                                                  ✎
                                                </button>
                                              )}
                                              
                                              {/* Botones para guardar/cancelar (cuando está en modo edición) */}
                                              {editTaskId === task._id && (
                                                <>
                                                  <button
                                                    onClick={saveEditTask}
                                                    className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-50 transition-colors"
                                                    disabled={editLoading}
                                                    title="Guardar cambios"
                                                  >
                                                    ✓
                                                  </button>
                                                  <button
                                                    onClick={() => setEditTaskId(null)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                    title="Cancelar edición"
                                                  >
                                                    ✕
                                                  </button>
                                                </>
                                              )}
                                              
                                              {/* Botón Archivar (solo para tareas completadas) */}
                                              {task.status === "completed" && !task.archived && (
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    archiveTask(task._id);
                                                  }}
                                                  className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                                  disabled={archiveLoading}
                                                  title="Archivar tarea"
                                                >
                                                  📂
                                                </button>
                                              )}
                                              {/* Botón Eliminar */}
                                              <button 
                                                onClick={(e) => {
                                                  // Detener propagación para evitar problemas con drag & drop
                                                  e.stopPropagation();
                                                  deleteTask(task._id);
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                disabled={deleteLoading}
                                                title="Eliminar tarea"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          </div>
                                          
                                          {/* Usuario asignado */}
                                          <div className="mt-2 flex items-center justify-between">
                                            {task.assignedTo ? (
                                              <div className="flex items-center bg-gray-100 text-gray-700 text-xs py-1 px-2 rounded-full">
                                                <span className="mr-1">👤</span> {task.assignedTo.displayName || task.assignedTo.username}
                                              </div>
                                            ) : (
                                              <div className="flex items-center bg-gray-100 text-gray-500 text-xs py-1 px-2 rounded-full">
                                                <span className="mr-1">👤</span> Sin asignar
                                              </div>
                                            )}
                                            
                                            {/* Fecha de creación */}
                                            <div className="text-gray-400 text-xs">
                                              {new Date(task.createdAt).toLocaleDateString()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              )}
                            </div>
                          </div>
                          
                          {/* El placeholder SIEMPRE se renderiza */}
                          {provided.placeholder}
                        </div>
                      );
                    }}
                  </Droppable>
                )
              })}
            </div>
          </div>
        </DragDropContext>
        </div>
      </div>
    </div>
  );
}

export default App;
