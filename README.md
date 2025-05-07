# PMI-2025

![React](https://img.shields.io/badge/React-18.x-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?logo=mongodb)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Gestor de tareas y actividades para equipos, con panel Kanban moderno, reportes, filtros avanzados y sistema de autenticación de usuarios.

---

## 🚀 Características principales

- **Gestión de tareas**: Crea, edita, elimina y archiva tareas fácilmente.
- **Panel Kanban**: Visualiza tareas por estado (Pendiente, En curso, Completada).
- **Filtros avanzados**: Filtra por usuario, fecha, estado y más.
- **Generación de reportes**: Exporta informes en PDF/CSV.
- **Interfaz profesional**: UI moderna, responsiva y clara (fuente Inter, gradientes, etc).
- **Autenticación JWT**: Registro y login seguro.
- **Roles y permisos**: Admin y usuarios normales.
- **Asignación de responsables**: Asigna tareas a usuarios específicos y realiza seguimiento.

---

## 📸 Capturas de pantalla

<!-- Si tienes imágenes, agrégalas aquí -->
<!--
![Login](docs/screenshots/login.png)
![Kanban](docs/screenshots/kanban.png)
-->

---

## 🛠️ Instalación y ejecución local

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
3. Configura variables de entorno (opcional, para MongoDB, JWT, etc):
    - Crea un archivo `.env` en `server/` con:
      ```
      MONGODB_URI=tu_uri_de_mongodb
      JWT_SECRET=un_secreto_super_seguro
      ```
    - Puedes copiar y renombrar `.env.example` si existe.
4. Inicia el servidor y el cliente:
    ```sh
    # En una terminal para el backend
    cd server
    npm start
    # En otra terminal para el frontend
    cd client
    npm start
    ```

---

## 🔐 Autenticación y usuarios

- **Usuarios predeterminados**:
  - Admin: `User` / `User01` (acceso completo)
  - Usuario normal: Puedes registrar nuevos usuarios desde la interfaz

- **Características de autenticación**:
  - JWT (JSON Web Tokens) para sesiones seguras
  - Encriptación de contraseñas con bcrypt
  - Middleware de autorización basado en roles
  - Tiempo de expiración de tokens configurable (7 días por defecto)

---

## 🌐 Despliegue

- **Frontend:** Puedes publicar fácilmente en [Vercel](https://vercel.com/) o [Netlify](https://netlify.com/).
- **Backend:** Puedes usar [Render](https://render.com/) o [Railway](https://railway.app/).
- **Variables de entorno:** Recuerda configurar las variables necesarias en los paneles de despliegue.

---

## 📦 Estructura del proyecto

```
PMI-2025/
├── client/    # Frontend React
├── server/    # Backend Node.js/Express
├── .gitignore
├── README.md
```

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor abre un issue o un pull request para sugerencias, mejoras o correcciones.

---

## 👤 Autor

- **RCS-Eder Flores Nuñez**  
  [GitHub](https://github.com/RCS-2024)

---

## 📄 Licencia

MIT
