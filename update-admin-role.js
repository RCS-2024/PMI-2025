import mongoose from 'mongoose';
import User from './server/models/User.js';

// Conectar a MongoDB
const mongoURI = "mongodb+srv://soportesqlrcs:iczb6vYfRA7Olbes@cluster0.p9eqmed.mongodb.net/?retryWrites=true&w=majority";

async function updateAdminRole() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Conectado a MongoDB");
    
    // Encontrar el usuario admin
    const user = await User.findOne({ username: "admin" });
    
    if (!user) {
      console.log("Usuario 'admin' no encontrado");
      return;
    }
    
    console.log("Usuario encontrado:", user.username);
    console.log("Rol actual:", user.role);
    
    // Actualizar a rol de administrador
    user.role = "admin";
    await user.save();
    
    console.log("¡Rol actualizado con éxito!");
    console.log("Nuevo rol:", user.role);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Desconectado de MongoDB");
  }
}

updateAdminRole();
