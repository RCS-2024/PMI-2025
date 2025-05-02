/**
 * Script para crear un usuario administrador
 * 
 * Ejecutar con: node setup-admin.js
 */

const fetch = require('node-fetch');

async function createAdmin() {
  try {
    // Detalles del administrador a crear
    const adminData = {
      username: 'admin',
      password: 'admin123', // Cambiar a una contraseña más segura
      displayName: 'Administrador',
      setupKey: 'pmi2025-setup' // Clave de configuración definida en el servidor
    };

    console.log('Creando usuario administrador...');
    
    // Realizar la petición al endpoint
    const response = await fetch('http://localhost:5000/api/admin-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adminData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error desconocido');
    }
    
    console.log('Usuario administrador creado exitosamente:');
    console.log('-----------------------------------------');
    console.log(`Username: ${data.user.username}`);
    console.log(`Role: ${data.user.role}`);
    console.log(`ID: ${data.user._id}`);
    console.log('-----------------------------------------');
    console.log('Puedes iniciar sesión con:');
    console.log(`Username: ${adminData.username}`);
    console.log(`Password: ${adminData.password}`);
    console.log('-----------------------------------------');
    console.log('IMPORTANTE: Cambia esta contraseña después del primer inicio de sesión.');
    
  } catch (error) {
    console.error('Error al crear usuario administrador:', error.message);
  }
}

createAdmin();
