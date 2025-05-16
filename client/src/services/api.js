// Servicio para manejar todas las peticiones a la API
const API_URL = 'http://localhost:5000/api';

// Función auxiliar para obtener el token de autenticación
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  const header = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  // Log para depuración
  if (token) {
    console.log('Token encontrado:', token.substring(0, 15) + '...');
    
    // Intentar decodificar el payload del JWT (solo para depuración)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Payload del token:', payload);
    } catch (e) {
      console.log('No se pudo decodificar el token');
    }
  } else {
    console.log('No se encontró token en localStorage');
  }
  
  return header;
};

// Función para verificar si el token está próximo a expirar (menos de 30 minutos)
const isTokenExpiringSoon = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Decodificar el token sin verificar la firma
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Calcular tiempo restante en segundos
    const timeRemaining = payload.exp - (Date.now() / 1000);
    // Devolver true si quedan menos de 30 minutos
    return timeRemaining < 1800;
  } catch (e) {
    console.error('Error al verificar expiración del token:', e);
    return false;
  }
};

// Función para intentar renovar el token
const refreshToken = async () => {
  try {
    console.log('Intentando renovar token...');
    // Usar el token actual para solicitar uno nuevo
    const response = await fetch(`${API_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('No se pudo renovar el token');
    
    const data = await response.json();
    localStorage.setItem('token', data.token);
    console.log('Token renovado con éxito');
    return true;
  } catch (e) {
    console.error('Error al renovar token:', e);
    return false;
  }
};

// Función para hacer peticiones fetch con autenticación
const fetchWithAuth = async (endpoint, options = {}) => {
  // Verificar si el token está por expirar y renovarlo si es necesario
  if (isTokenExpiringSoon()) {
    await refreshToken();
  }
  
  // Obtener headers de autenticación (posiblemente con el token renovado)
  const authHeaders = getAuthHeader();
  
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers
  };
  
  console.log(`Realizando petición a ${endpoint} con headers:`, headers);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    // Manejar diferentes tipos de errores de autenticación
    if (response.status === 401 || response.status === 403) {
      // Intentar renovar el token una vez
      const renewed = await refreshToken();
      
      if (renewed) {
        // Reintentar la petición con el nuevo token
        return fetchWithAuth(endpoint, options);
      } else {
        // Si no se pudo renovar, cerrar sesión
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?expired=true';
        throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ha ocurrido un error');
    }

    return data;
  } catch (error) {
    // Si es un error de red o el servidor no responde
    if (error.message === 'Failed to fetch') {
      console.error('Error de conexión al servidor');
      throw new Error('No se pudo conectar al servidor. Verifica tu conexión a internet.');
    }
    throw error;
  }
};

// Rutas de autenticación
export const authAPI = {
  login: (credentials) => {
    return fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(res => res.json());
  },
  
  register: (userData) => {
    return fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }).then(res => res.json());
  },
  
  getProfile: () => {
    return fetchWithAuth('/me');
  }
};

// Rutas de tareas
export const tasksAPI = {
  // Obtener todas las tareas
  getTasks: () => {
    return fetchWithAuth('/tasks');
  },
  
  // Crear una nueva tarea
  createTask: (taskData) => {
    return fetchWithAuth('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },
  
  // Actualizar una tarea
  updateTask: (taskId, taskData) => {
    return fetchWithAuth(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(taskData)
    });
  },
  
  // Eliminar una tarea
  deleteTask: (taskId) => {
    return fetchWithAuth(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  },
  
  // Archivar una tarea
  archiveTask: (taskId) => {
    return fetchWithAuth(`/tasks/${taskId}/archive`, {
      method: 'PATCH'
    });
  },
  
  // Generar informe
  generateReport: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.includeArchived) queryParams.append('includeArchived', params.includeArchived);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    return fetchWithAuth(`/report${queryString ? `?${queryString}` : ''}`);
  }
};

// Rutas de usuarios
export const usersAPI = {
  // Obtener todos los usuarios (solo admin)
  getAllUsers: () => {
    console.log('Solicitando lista de usuarios (requiere rol admin)');
    return fetchWithAuth('/users');
  }
};

export default {
  auth: authAPI,
  tasks: tasksAPI,
  users: usersAPI
};
