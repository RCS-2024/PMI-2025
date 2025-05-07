/**
 * Script para habilitar la edición de responsables en la aplicación de tareas
 * Versión totalmente autónoma que detecta y modifica automáticamente la UI
 */
 
(function() {
  // Configuración
  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
  const RETRY_DELAY = 2000; // 2 segundos
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWithDelay);
  } else {
    initWithDelay();
  }
  
  // Inicializar con un pequeño retraso para asegurar que React haya renderizado
  function initWithDelay() {
    console.log('🔧 Inicializando el editor de responsables...');
    setTimeout(detectTaskCards, RETRY_DELAY);
  }
  
  // Detectar las tarjetas de tareas en la interfaz
  function detectTaskCards() {
    // Buscar elementos que parezcan tarjetas de tareas
    const taskCards = document.querySelectorAll('.rounded-lg.border.shadow-sm, .bg-white.rounded-lg');
    
    if (taskCards.length === 0) {
      console.log('⚠️ No se encontraron tarjetas de tareas. Reintentando en 2s...');
      setTimeout(detectTaskCards, RETRY_DELAY);
      return;
    }
    
    console.log(`✅ Encontradas ${taskCards.length} posibles tarjetas de tareas`);
    
    // Procesar cada tarjeta
    let successCount = 0;
    taskCards.forEach(card => {
      const success = processTaskCard(card);
      if (success) successCount++;
    });
    
    console.log(`✅ Procesadas ${successCount} de ${taskCards.length} tarjetas correctamente`);
    
    // Configurar observer para detectar nuevas tarjetas añadidas dinámicamente
    setupMutationObserver();
  }
  
  // Procesar una tarjeta de tarea individual
  function processTaskCard(card) {
    // Extraer ID de la tarea
    const taskId = extractTaskId(card);
    if (!taskId) return false;
    
    // Buscar el contenedor del responsable
    const assigneeContainer = findAssigneeContainer(card);
    if (!assigneeContainer) return false;
    
    // Añadir botón de edición si no existe ya
    if (!assigneeContainer.querySelector('.edit-assignee-btn')) {
      addEditButton(assigneeContainer, taskId);
    }
    
    return true;
  }
  
  // Extraer el ID de una tarjeta de tarea
  function extractTaskId(card) {
    // Intentar varios métodos para encontrar el ID
    
    // 1. Buscar atributos data-* comunes
    for (const attr of ['data-task-id', 'data-id', 'id']) {
      const value = card.getAttribute(attr);
      if (value) {
        // Si es un formato ObjectId de MongoDB (24 caracteres hex)
        if (value.match(/[a-f0-9]{24}/)) {
          return value.match(/[a-f0-9]{24}/)[0];
        }
        return value;
      }
    }
    
    // 2. Buscar en el HTML si hay un _id en algún lugar
    const cardHTML = card.outerHTML;
    const idMatch = cardHTML.match(/['"]_id['"]:\s*['"]([a-f0-9]{24})['"]/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }
    
    // No se encontró ID
    return null;
  }
  
  // Encontrar el contenedor del responsable dentro de una tarjeta
  function findAssigneeContainer(card) {
    // 1. Buscar elementos que suelen contener información del responsable
    const selectors = [
      '.flex.items-center.bg-gray-100', 
      '.bg-gray-100.rounded-full',
      '.mt-2 .flex div:first-child'
    ];
    
    for (const selector of selectors) {
      const elements = card.querySelectorAll(selector);
      for (const el of elements) {
        if (containsUserReference(el)) {
          return el;
        }
      }
    }
    
    // 2. Buscar cualquier elemento que contenga referencias a usuarios
    const allElements = card.querySelectorAll('*');
    for (const el of allElements) {
      if (containsUserReference(el)) {
        return el;
      }
    }
    
    return null;
  }
  
  // Comprobar si un elemento contiene referencias a un usuario
  function containsUserReference(element) {
    const text = element.textContent || '';
    return (
      text.includes('👤') || 
      text.includes('Sin asignar') ||
      text.match(/\b(asignado|responsable)\b/i)
    );
  }
  
  // Añadir botón de edición al contenedor de responsable
  function addEditButton(container, taskId) {
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '✎';
    editBtn.className = 'edit-assignee-btn';
    editBtn.title = 'Editar responsable';
    editBtn.style.marginLeft = '5px';
    editBtn.style.color = '#666';
    editBtn.style.background = 'none';
    editBtn.style.border = 'none';
    editBtn.style.cursor = 'pointer';
    
    // Al hacer hover el botón cambia de color
    editBtn.addEventListener('mouseenter', () => {
      editBtn.style.color = '#0066cc';
    });
    
    editBtn.addEventListener('mouseleave', () => {
      editBtn.style.color = '#666';
    });
    
    // Al hacer clic mostrar selector de usuario
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar propagación de eventos
      showUserSelector(container, taskId);
    });
    
    container.appendChild(editBtn);
  }
  
  // Mostrar selector de usuario para cambiar el responsable
  async function showUserSelector(container, taskId) {
    // Guardar el contenido original
    const savedContent = container.innerHTML;
    
    try {
      console.log('🔄 Cargando usuarios para la tarea:', taskId);
      
      // Mostrar estado de carga
      container.innerHTML = '<span style="color:#666;font-size:12px;">Cargando usuarios...</span>';
      
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      // Cargar lista de usuarios
      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const users = await response.json();
      console.log(`✅ Cargados ${users.length} usuarios`);
      
      // Crear UI para selección
      createUserSelectionUI(container, taskId, users, savedContent);
      
    } catch (error) {
      console.error('❌ Error:', error);
      
      // Restaurar contenido original
      container.innerHTML = savedContent;
      
      // Mostrar notificación de error
      showNotification('Error: ' + error.message, 'error');
    }
  }
  
  // Crear interfaz de selección de usuario
  function createUserSelectionUI(container, taskId, users, savedContent) {
    // Crear selector
    const select = document.createElement('select');
    select.className = 'assignee-selector';
    select.style.padding = '2px 4px';
    select.style.fontSize = '12px';
    select.style.borderRadius = '4px';
    select.style.border = '1px solid #ccc';
    select.style.marginRight = '5px';
    
    // Opción para quitar responsable
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Sin asignar';
    select.appendChild(emptyOption);
    
    // Opciones para cada usuario
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user._id;
      option.textContent = user.displayName || user.username;
      select.appendChild(option);
    });
    
    // Contenedor para el selector y botones
    const selectorContainer = document.createElement('div');
    selectorContainer.style.display = 'flex';
    selectorContainer.style.alignItems = 'center';
    
    // Botones de acción
    const saveBtn = createActionButton('✓', 'verde', 'Guardar');
    const cancelBtn = createActionButton('✕', 'rojo', 'Cancelar');
    
    // Añadir elementos al contenedor
    selectorContainer.appendChild(select);
    selectorContainer.appendChild(saveBtn);
    selectorContainer.appendChild(cancelBtn);
    
    // Limpiar y añadir nuevo contenido
    container.innerHTML = '';
    container.appendChild(selectorContainer);
    
    // Evento para guardar cambios
    saveBtn.addEventListener('click', () => {
      updateTaskAssignee(taskId, select.value, container, savedContent);
    });
    
    // Evento para cancelar
    cancelBtn.addEventListener('click', () => {
      container.innerHTML = savedContent;
    });
  }
  
  // Crear botón de acción estilizado
  function createActionButton(text, color, title) {
    const button = document.createElement('button');
    button.textContent = text;
    button.title = title;
    button.style.background = 'none';
    button.style.border = 'none';
    button.style.padding = '2px 4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    
    if (color === 'verde') {
      button.style.color = '#22c55e';
    } else if (color === 'rojo') {
      button.style.color = '#ef4444';
    }
    
    return button;
  }
  
  // Actualizar responsable de tarea en el servidor
  async function updateTaskAssignee(taskId, userId, container, savedContent) {
    try {
      console.log(`🔄 Actualizando responsable de tarea ${taskId} a ${userId || 'sin asignar'}`);
      
      // Mostrar estado de guardado
      container.innerHTML = '<span style="color:#666;font-size:12px;">Guardando...</span>';
      
      // Obtener token
      const token = localStorage.getItem('token');
      
      // Enviar actualización al servidor
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assignedUserId: userId })
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // Obtener tarea actualizada
      const updatedTask = await response.json();
      console.log('✅ Tarea actualizada:', updatedTask);
      
      // Actualizar interfaz con el nuevo responsable
      updateAssigneeDisplay(container, updatedTask);
      
      // Mostrar notificación de éxito
      showNotification('Responsable actualizado correctamente', 'success');
      
    } catch (error) {
      console.error('❌ Error:', error);
      
      // Restaurar contenido original
      container.innerHTML = savedContent;
      
      // Mostrar notificación de error
      showNotification('Error al actualizar: ' + error.message, 'error');
    }
  }
  
  // Actualizar visualización del responsable
  function updateAssigneeDisplay(container, task) {
    // Crear elemento para mostrar el responsable
    const assigneeText = document.createElement('span');
    
    if (task.assignedTo) {
      assigneeText.textContent = `👤 ${task.assignedTo.displayName || task.assignedTo.username}`;
      assigneeText.style.color = '#374151';
    } else {
      assigneeText.textContent = '👤 Sin asignar';
      assigneeText.style.color = '#6b7280';
    }
    
    // Limpiar contenedor
    container.innerHTML = '';
    container.appendChild(assigneeText);
    
    // Volver a añadir botón de edición
    addEditButton(container, task._id);
  }
  
  // Mostrar notificación temporal
  function showNotification(message, type) {
    // Crear notificación
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.fontSize = '14px';
    notification.style.zIndex = '9999';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    
    // Estilo según tipo
    if (type === 'success') {
      notification.style.backgroundColor = '#dcfce7';
      notification.style.color = '#166534';
      notification.style.border = '1px solid #86efac';
    } else {
      notification.style.backgroundColor = '#fee2e2';
      notification.style.color = '#b91c1c';
      notification.style.border = '1px solid #fecaca';
    }
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      notification.style.opacity = '0';
      
      // Eliminar del DOM después de la transición
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
  
  // Configurar observer para detectar nuevos elementos
  function setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
      let needsCheck = false;
      
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          needsCheck = true;
        }
      });
      
      if (needsCheck) {
        // Esperar a que React termine de renderizar
        setTimeout(detectTaskCards, 500);
      }
    });
    
    // Observar cambios en el DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('👁️ Observer configurado para detectar nuevas tarjetas');
  }
  
  // Añadir estilos CSS
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .edit-assignee-btn:hover {
        color: #0066cc !important;
      }
      
      .assignee-selector {
        max-width: 150px;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .notification {
        animation: fadeIn 0.3s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Iniciar estilos
  addStyles();
  
  console.log('✅ Editor de responsables inicializado correctamente');
})();
