import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection (ajusta la URI con tus datos)
const mongoURI = "mongodb+srv://soportesqlrcs:iczb6vYfRA7Olbes@cluster0.p9eqmed.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Task schema
const taskSchema = new mongoose.Schema({
  desc: String,
  user: String, // Nuevo campo para asignar usuario
  status: { type: String, default: "pending" },
  archived: { type: Boolean, default: false }, // Campo para archivar tareas
  archivedAt: Date, // Fecha cuando se archivó
  createdAt: { type: Date, default: Date.now },
});
const Task = mongoose.model("Task", taskSchema);



// Endpoints
app.get("/api/tasks", async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});

app.post("/api/tasks", async (req, res) => {
  const { desc, user } = req.body;
  if (!desc) return res.status(400).json({ error: "Description required" });
  const task = new Task({ desc, user });
  await task.save();
  res.json(task);
});

// Endpoint para actualizar el status o descripción de una tarea
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { desc } = req.body;
    let { status } = req.body;
    
    // Verificar si la tarea existe
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({ error: "Tarea no encontrada" });
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
    
    // Si no hay cambios que realizar, devolver la tarea sin modificar
    if (Object.keys(updateData).length === 0) {
      return res.json(existingTask);
    }
    
    // Añadir log para debugging
    console.log('Tarea antes de actualizar:', JSON.stringify(existingTask));
    console.log('Datos a actualizar:', JSON.stringify(updateData));
    
    // Usar findByIdAndUpdate para evitar validaciones adicionales
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updateData,
      { new: true } // Devolver la tarea actualizada
    );
    
    console.log('Tarea actualizada:', JSON.stringify(updatedTask));
    
    // Enviar la respuesta con la tarea actualizada
    res.json(updatedTask);
    
  } catch (err) {
    console.error("Error al actualizar tarea:", err);
    res.status(500).json({ error: "Error al actualizar la tarea: " + err.message });
  }
});

// Endpoint para eliminar una tarea
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar y eliminar la tarea
    const task = await Task.findByIdAndDelete(id);
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    res.json({ message: "Task deleted successfully", taskId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para archivar una tarea
app.patch("/api/tasks/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que la tarea existe y tenga status 'completed'
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    if (task.status !== "completed") {
      return res.status(400).json({ error: "Only completed tasks can be archived" });
    }
    
    // Actualizar a archivado
    task.archived = true;
    task.archivedAt = new Date();
    await task.save();
    
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para generar informe
app.get("/api/report", async (req, res) => {
  try {
    const { 
      includeArchived,
      user,
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
    
    // Filtro por usuario
    if (user && user !== "all") {
      query.user = user;
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
    const tasks = await Task.find(query).sort(sortOptions);
    
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
      tasks: tasks,
      // Agregar metadatos sobre los filtros utilizados
      filters: {
        includeArchived: includeArchived === "true",
        user: user || "all",
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
      const userName = task.user || "Sin asignar";
      if (!report.byUser[userName]) {
        report.byUser[userName] = {
          total: 0,
          pending: 0,
          inprogress: 0,
          completed: 0,
          archived: 0
        };
      }
      report.byUser[userName].total++;
      if (task.archived) {
        report.byUser[userName].archived++;
      } else {
        report.byUser[userName][task.status]++;
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
