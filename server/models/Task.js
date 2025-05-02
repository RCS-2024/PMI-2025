import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  desc: {
    type: String,
    required: true,
    trim: true
  },
  // Referencia al usuario creador de la tarea
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Usuario asignado a la tarea (puede ser diferente del creador)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Para mantener compatibilidad con el código existente
  user: String,
  status: { 
    type: String, 
    enum: ['pending', 'inprogress', 'completed'],
    default: "pending" 
  },
  archived: { 
    type: Boolean, 
    default: false 
  },
  archivedAt: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

const Task = mongoose.model("Task", taskSchema);

export default Task;
