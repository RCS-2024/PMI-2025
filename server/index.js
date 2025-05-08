import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Importar modelos
import User from "./models/User.js";
import Task from "./models/Task.js";

// Importar middleware de autenticación
import { authenticateToken, generateToken, isAdmin } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection (ajusta la URI con tus datos)
const mongoURI = "mongodb+srv://soportesqlrcs:iczb6vYfRA7Olbes@cluster0.p9eqmed.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// =================== RUTAS DE AUTENTICACIÓN =================== //

// Registro de usuarios
app.post("/api/register", async (req, res) => {
  try {
    let { username, password, displayName } = req.body;
    console.log('[Registro] Intentando registrar usuario:', username);

    // Validar datos
    if (!username || !password) {
      console.warn('[Registro] Faltan datos: usuario o contraseña');
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }

    username = username.trim().toLowerCase(); // Insensible a mayúsculas/minúsculas

    // Verificar si el usuario ya existe (case-insensitive, usando collation)
    const existingUser = await User.findOne({ username }).collation({ locale: 'en', strength: 2 });
    if (existingUser) {
      console.warn(`[Registro] Usuario ya existe: ${username}`);
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }

    // Eliminar duplicados existentes (deja solo el primero creado)
    if (username === 'user') {
      const duplicates = await User.find({ username: { $regex: '^user$', $options: 'i' } }).collation({ locale: 'en', strength: 2 });
      if (duplicates.length > 1) {
        const sorted = duplicates.sort((a, b) => a.createdAt - b.createdAt);
        const toDelete = sorted.slice(1).map(u => u._id);
        await User.deleteMany({ _id: { $in: toDelete } });
        console.warn(`[Registro] Duplicados eliminados para username: user`);
      }
    }

    // Crear nuevo usuario
    const user = new User({
      username,
      password, // Se encriptará automáticamente por el middleware pre-save
      displayName: displayName || username,
      role: 'user' // Por defecto todos son usuarios normales
    });

    await user.save();
    console.log(`[Registro] Usuario registrado correctamente: ${username}`);

    // Generar token
    const token = generateToken(user._id);

    // No devolver la contraseña
    const userResponse = {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };

    res.status(201).json({ user: userResponse, token });
  } catch (error) {
    console.error('[Registro] Error en registro:', error);
    res.status(500).json({ error: "Error en el registro: " + error.message });
  }
});

// Endpoint para crear usuario administrador (solo para inicialización, quitar en producción)
app.post("/api/admin-setup", async (req, res) => {
  try {
    const { username, password, displayName, setupKey } = req.body;
    
    // Verificar clave de configuración (simple por ahora, mejorar en producción)
    if (setupKey !== "pmi2025-setup") {
      return res.status(403).json({ error: "Clave de configuración inválida" });
    }
    
    // Validar datos
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }
    
    // Crear usuario administrador
    const adminUser = new User({
      username,
      password,
      displayName: displayName || username,
      role: 'admin'
    });
    
    await adminUser.save();
    
    res.status(201).json({ 
      message: "Usuario administrador creado con éxito",
      user: {
        _id: adminUser._id,
        username: adminUser.username,
        displayName: adminUser.displayName,
        role: adminUser.role
      }
    });
  } catch (error) {
    console.error('Error creando admin:', error);
    res.status(500).json({ error: "Error creando usuario administrador: " + error.message });
  }
});

// Login de usuarios
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validar datos
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }
    
    // Buscar usuario
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    
    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    
    // Generar token
    const token = generateToken(user._id);
    
    // No devolver la contraseña
    const userResponse = {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };
    
    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: "Error en el login: " + error.message });
  }
});

// Obtener perfil de usuario actual
app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los usuarios (solo para admins)
// Modificado: Cualquier usuario autenticado puede ver la lista de usuarios
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =================== RUTAS DE TAREAS =================== //

// Obtener todas las tareas (filtradas por permisos)
app.get("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    let tasks;
    
    // Los admins ven todas las tareas
    if (role === 'admin') {
      tasks = await Task.find().populate('owner assignedTo', 'username displayName');
    } else {
      // Los usuarios normales solo ven sus tareas (creadas o asignadas)
      tasks = await Task.find({
        $or: [{ owner: id }, { assignedTo: id }]
      }).populate('owner assignedTo', 'username displayName');
    }
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const { desc, assignedUserId } = req.body;
    if (!desc) return res.status(400).json({ error: "Description required" });
    
    // Crear la tarea con el usuario actual como propietario
    const task = new Task({
      desc,
      owner: req.user.id,
      // Si se especifica un usuario asignado, lo agregamos
      ...(assignedUserId && { assignedTo: assignedUserId }),
      // Para mantener compatibilidad con código existente
      user: req.user.username
    });
    
    await task.save();
    
    // Populate para enviar la información completa
    const populatedTask = await Task.findById(task._id)
      .populate('owner assignedTo', 'username displayName');
    
    res.json(populatedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para actualizar el status o descripción de una tarea
app.patch("/api/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { desc, assignedUserId } = req.body;
    let { status } = req.body;
    
    // Verificar si la tarea existe
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    
    // Verificar permisos - solo el propietario, usuario asignado o admin puede modificar
    const isOwner = existingTask.owner && existingTask.owner.toString() === req.user.id;
    const isAssigned = existingTask.assignedTo && existingTask.assignedTo.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAssigned && !isAdmin) {
      return res.status(403).json({ error: "No tienes permiso para modificar esta tarea" });
    }
    
    // Objeto para almacenar cambios a realizar
    const updateData = {};
    
    // Si se envió una descripción, validarla y añadirla
    if (desc !== undefined) {
      if (desc.trim() === '') {
        return res.status(400).json({ error: "La descripción no puede estar vacía" });
      }
      
      // Solo actualizar si es diferente a la actual
      if (desc !== existingTask.desc) {
        updateData.desc = desc;
      }
    }
    
    // Si se envió un status, validarlo y añadirlo
    if (status !== undefined) {
      const validStatuses = ['pending', 'inprogress', 'completed'];
      status = status.toLowerCase();
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Estado inválido" });
      }
      updateData.status = status;
    }
    
    // Si se está asignando a otro usuario
    if (assignedUserId !== undefined) {
      updateData.assignedTo = assignedUserId || null;
    }
    
    // Si no hay cambios que realizar, devolver la tarea sin modificar
    if (Object.keys(updateData).length === 0) {
      return res.json(existingTask);
    }
    
    // Usar findByIdAndUpdate para evitar validaciones adicionales
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updateData,
      { new: true } // Devolver la tarea actualizada
    ).populate('owner assignedTo', 'username displayName');
    
    // Enviar la respuesta con la tarea actualizada
    res.json(updatedTask);
    
  } catch (err) {
    console.error("Error al actualizar tarea:", err);
    res.status(500).json({ error: "Error al actualizar la tarea: " + err.message });
  }
});

// Endpoint para eliminar una tarea
app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar la tarea
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Verificar permisos - solo el propietario o admin puede eliminar
    const isOwner = task.owner && task.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "No tienes permiso para eliminar esta tarea" });
    }
    
    // Eliminar la tarea
    await Task.findByIdAndDelete(id);
    
    res.json({ message: "Task deleted successfully", taskId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para archivar una tarea
app.patch("/api/tasks/:id/archive", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que la tarea existe y tenga status 'completed'
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Verificar permisos - solo el propietario o admin puede archivar
    const isOwner = task.owner && task.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "No tienes permiso para archivar esta tarea" });
    }
    
    if (task.status !== "completed") {
      return res.status(400).json({ error: "Only completed tasks can be archived" });
    }
    
    // Actualizar a archivado
    task.archived = true;
    task.archivedAt = new Date();
    await task.save();
    
    const updatedTask = await Task.findById(id).populate('owner assignedTo', 'username displayName');
    
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para generar informe
app.get("/api/report", authenticateToken, async (req, res) => {
  try {
    const { 
      includeArchived,
      userId,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc" 
    } = req.query;
    
    // Construir objeto de consulta
    let query = {};
    
    // Filtro de archivados
    if (includeArchived !== "true") {
      query.archived = { $ne: true };
    }
    
    // Filtro por usuario asignado
    if (userId && userId !== "all") {
      query.assignedTo = userId;
    } else if (req.user.role !== 'admin') {
      // Si no es admin, solo puede ver sus tareas
      query.$or = [
        { owner: req.user.id },
        { assignedTo: req.user.id }
      ];
    }
    
    // Filtro por rango de fechas
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      
      if (endDate) {
        // Ajustar la fecha final para incluir todo el día
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateTime;
      }
    }
    
    // Definir opciones de ordenamiento
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sortOptions = {};
    
    // Validar campo de ordenamiento
    const validSortFields = ["createdAt", "desc", "status", "user"];
    const fieldToSort = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    
    sortOptions[fieldToSort] = sortDirection;
    
    // Obtener todas las tareas según los filtros y ordenamiento
    const tasks = await Task.find(query)
      .sort(sortOptions)
      .populate('owner assignedTo', 'username displayName');
    
    // Obtener lista de usuarios para el informe
    const users = await User.find().select('_id username displayName');
    const usersMap = {};
    users.forEach(user => {
      usersMap[user._id] = {
        username: user.username,
        displayName: user.displayName
      };
    });
    
    // Generar estadísticas
    const report = {
      totalTasks: tasks.length,
      byStatus: {
        pending: tasks.filter(t => t.status === "pending").length,
        inprogress: tasks.filter(t => t.status === "inprogress").length,
        completed: tasks.filter(t => t.status === "completed" && !t.archived).length,
        archived: tasks.filter(t => t.archived).length
      },
      byUser: {},
      users: usersMap, // Agregar lista de usuarios disponibles
      tasks: tasks,
      // Agregar metadatos sobre los filtros utilizados
      filters: {
        includeArchived: includeArchived === "true",
        userId: userId || "all",
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        sortBy: fieldToSort,
        sortOrder
      }
    };
    
    // Agrupar por usuario
    tasks.forEach(task => {
      // Usar los nuevos campos de usuarios
      const assignedUser = task.assignedTo ? 
        (task.assignedTo.displayName || task.assignedTo.username) : 
        (task.user || "Sin asignar");
        
      if (!report.byUser[assignedUser]) {
        report.byUser[assignedUser] = {
          total: 0,
          pending: 0,
          inprogress: 0,
          completed: 0,
          archived: 0
        };
      }
      report.byUser[assignedUser].total++;
      if (task.archived) {
        report.byUser[assignedUser].archived++;
      } else {
        report.byUser[assignedUser][task.status]++;
      }
    });
    
    res.json(report);
  } catch (err) {
    console.error("Error al generar informe:", err);
    res.status(500).json({ error: "Error al generar informe: " + err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
