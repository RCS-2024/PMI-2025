# PMI-2025

Gestor de tareas y actividades para equipos, con panel Kanban, reportes, filtros avanzados y sistema de autenticación de usuarios.

## 🚀 Características principales

- **Gestión de tareas**: Crea, edita, elimina y archiva tareas fácilmente.
- **Panel Kanban**: Visualiza tareas por estado (Pendiente, En curso, Completada, Archivada).
- **Filtros avanzados**: Filtra por usuario, fecha, estado y más.
- **Generación de reportes**: Exporta informes en PDF/CSV con un solo clic.
- **Interfaz profesional**: UI moderna, responsiva y clara.
- **Autenticación de usuarios**: Sistema completo de registro y login con JWT.
- **Roles y permisos**: Funcionalidades específicas para administradores y usuarios.
- **Asignación de responsables**: Asigna tareas a usuarios específicos y realiza seguimiento.

## 🛠️ Instalación

1. Clona el repositorio:
   ```sh
   git clone https://github.com/RCS-2024/PMI-2025.git
   cd PMI-2025
   ```
2. Instala las dependencias:
   ```sh
   cd client
   npm install
   cd ../server
   npm install
   ```
3. Configura variables de entorno si es necesario (`.env`).
4. Inicia el servidor y el cliente:
   ```sh
   # En una terminal para el backend
   cd server
   npm start
   # En otra terminal para el frontend
   cd client
   npm start
   ```

## 🔐 Autenticación y usuarios

- **Usuarios predeterminados**:
  - Admin: `admin` / `admin123` (acceso completo a funcionalidades administrativas)
  - Usuario normal: Puedes registrar nuevos usuarios desde la interfaz

- **Características de autenticación**:
  - JWT (JSON Web Tokens) para sesiones seguras
  - Encriptación de contraseñas con bcrypt
  - Middleware de autorización basado en roles
  - Tiempo de expiración de tokens configurable (7 días por defecto)

## 🌐 Publicación online

- Puedes publicar el frontend fácilmente en [Vercel](https://vercel.com/) o [Netlify](https://netlify.com/).
- Para el backend, puedes usar [Render](https://render.com/) o [Railway](https://railway.app/).

## 📦 Estructura del proyecto

```
PMI-2025/
├── client/    # Frontend React
├── server/    # Backend Node.js/Express
├── .gitignore
├── README.md
```

## 👤 Autor
- [RCS-Eder Flores Nuñez  GitHub]

## 📄 Licencia
MIT
