/**
 * Script para agregar la funcionalidad de editar responsable
 * 
 * Este script se puede agregar al final del HTML para añadir
 * la funcionalidad sin modificar el código principal.
 */

// Esperar a que la página cargue completamente
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar después de 2 segundos para asegurar que React haya renderizado
  setTimeout(initAssigneeEditor, 2000);
});

function initAssigneeEditor() {
  console.log('Inicializando editor de responsables...');
  
  // Detectar todas las tarjetas de tareas basadas en la estructura del DOM
  // Esta selección es más flexible y busca elementos que parezcan tarjetas de tareas
  const taskCards = document.querySelectorAll('.rounded-lg.border.shadow-sm, .bg-white.rounded-lg');
  
  if (taskCards.length === 0) {
    console.log('No se encontraron tarjetas de tareas. Reintentando en 2s...');
    setTimeout(initAssigneeEditor, 2000);
    return;
  }

  console.log(`Encontradas ${taskCards.length} posibles tarjetas de tareas`);
  
  // Para cada tarjeta de tarea, intentar encontrar la sección de responsable
  taskCards.forEach(card => {
    // Intentar encontrar el ID de la tarea
    let taskId = null;
    
    // Buscar un atributo data-id, data-task-id o similar
    const possibleIdAttrs = ['data-task-id', 'data-id', 'id'];
    for (const attr of possibleIdAttrs) {
      const value = card.getAttribute(attr);
      if (value) {
        // Si es un ID completo, extraer solo el ID de mongo
        if (value.match(/[a-f0-9]{24}/)) {
          taskId = value.match(/[a-f0-9]{24}/)[0];
          break;
        }
        // Si no es un formato de ObjectId, usar el valor tal cual
        taskId = value;
        break;
      }
    }
    
    // Si no encontramos un ID, intentar extraerlo del HTML o alguna propiedad interna
    if (!taskId) {
      const cardHTML = card.outerHTML;
      const idMatch = cardHTML.match(/['"]_id['"]:\s*['"]([a-f0-9]{24})['"]/);
      if (idMatch && idMatch[1]) {
        taskId = idMatch[1];
      }
    }
    
    // Si aún no tenemos ID, no podemos proceder con esta tarjeta
    if (!taskId) {
      // Marcar la tarjeta para depuración
      card.style.border = '1px dashed red';
      console.log('Tarjeta sin ID detectado:', card);
      return;
    }
    
    // Añadir un atributo data-task-id para futura referencia
    card.setAttribute('data-task-id', taskId);
    
    // Buscar el contenedor del responsable - usamos múltiples selectores para mayor flexibilidad
    let assigneeContainer = null;
    
    // Intento 1: Buscar elementos con clases específicas que suelen indicar al responsable
    const possibleContainers = card.querySelectorAll('.flex.items-center.bg-gray-100, .bg-gray-100, .rounded-full');
    
    for (const container of possibleContainers) {
      // Si el contenedor tiene un ícono de usuario o texto como "Sin asignar", es probable que sea el responsable
      if (container.textContent.includes('👤') || container.textContent.includes('Sin asignar') || 
          container.textContent.match(/\b(asignado|responsable)\b/i)) {
        assigneeContainer = container;
        break;
      }
    }
    
    // Intento 2: Buscar por texto que sugiera un responsable
    if (!assigneeContainer) {
      const allElements = card.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent.includes('👤') || el.textContent.includes('Sin asignar')) {
          assigneeContainer = el;
          break;
        }
      }
    }
    
    // Si no encontramos un contenedor de responsable, no podemos proceder
    if (!assigneeContainer) {
      console.log('No se encontró contenedor de responsable para la tarjeta:', taskId);
      return;
    }
    
    // Añadir la clase assignee-container para futura referencia
    assigneeContainer.classList.add('assignee-container');
    
    // Verificar si ya tiene un botón de edición
    if (assigneeContainer.querySelector('.edit-assignee-btn')) {
      return; // Ya tiene botón, no añadir otro
    }
    
    // Agregar botón de editar
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '✎';
    editBtn.className = 'edit-assignee-btn';
    editBtn.title = 'Editar responsable';
    editBtn.style.marginLeft = '5px';
    editBtn.style.color = '#666';
    editBtn.style.background = 'none';
    editBtn.style.border = 'none';
    editBtn.style.cursor = 'pointer';
    
    editBtn.addEventListener('click', () => showUserSelector(assigneeContainer, taskId));
    
    assigneeContainer.appendChild(editBtn);
  });
}

async function showUserSelector(container, taskId) {
  try {
    console.log('Mostrando selector de usuario para la tarea:', taskId);
    
    // Crear un div contenedor para mostrar "Cargando..."
    const originalContent = container.innerHTML;
    const loadingContainer = document.createElement('div');
    loadingContainer.textContent = 'Cargando usuarios...';
    loadingContainer.style.fontSize = '12px';
    loadingContainer.style.color = '#666';
    container.innerHTML = '';
    container.appendChild(loadingContainer);
    
    // Obtener la lista de usuarios
    const token = localStorage.getItem('token');
    
    // URL base de la API
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
    
    const response = await fetch(`${apiUrl}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('No se pudieron cargar los usuarios');
    }
    
    const users = await response.json();
    console.log(`Obtenidos ${users.length} usuarios:`, users.map(u => u.displayName || u.username).join(', '));
    
    // Crear selector
    const select = document.createElement('select');
    select.className = 'user-selector';
    select.style.padding = '2px';
    select.style.fontSize = '12px';
    select.style.borderRadius = '4px';
    select.style.margin = '0 5px';
    
    // Opción vacía
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Sin asignar';
    select.appendChild(emptyOption);
    
    // Agregar opciones de usuarios
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user._id;
      option.textContent = user.displayName || user.username;
      select.appendChild(option);
    });
    
    // Botones
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '✓';
    saveBtn.style.color = 'green';
    saveBtn.style.background = 'none';
    saveBtn.style.border = 'none';
    saveBtn.style.cursor = 'pointer';
    saveBtn.title = 'Guardar';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕';
    cancelBtn.style.color = 'red';
    cancelBtn.style.background = 'none';
    cancelBtn.style.border = 'none';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.title = 'Cancelar';
    
    // Guardar contenido original
    const originalContent = container.innerHTML;
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Agregar elementos
    container.appendChild(select);
    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);
    
    // Manejar eventos
    saveBtn.addEventListener('click', async () => {
      const userId = select.value;
      
      try {
        const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ assignedUserId: userId })
        });
        
        if (!response.ok) {
          throw new Error('Error al actualizar responsable');
        }
        
        // Actualizar la UI después de éxito
        const updatedTask = await response.json();
        
        // Restaurar contenedor con nueva información
        container.innerHTML = '';
        const nameSpan = document.createElement('span');
        
        if (updatedTask.assignedTo) {
          nameSpan.textContent = `👤 ${updatedTask.assignedTo.displayName || updatedTask.assignedTo.username}`;
        } else {
          nameSpan.textContent = '👤 Sin asignar';
          nameSpan.style.color = '#888';
        }
        
        container.appendChild(nameSpan);
        
        // Volver a agregar botón de editar
        const newEditBtn = document.createElement('button');
        newEditBtn.innerHTML = '✎';
        newEditBtn.className = 'edit-assignee-btn';
        newEditBtn.title = 'Editar responsable';
        newEditBtn.style.marginLeft = '5px';
        newEditBtn.style.color = '#666';
        newEditBtn.style.background = 'none';
        newEditBtn.style.border = 'none';
        newEditBtn.style.cursor = 'pointer';
        
        newEditBtn.addEventListener('click', () => showUserSelector(container, taskId));
        
        container.appendChild(newEditBtn);
        
      } catch (error) {
        console.error('Error:', error);
        // Restaurar contenido original en caso de error
        container.innerHTML = originalContent;
        
        // Mostrar mensaje de error
        alert('Error al actualizar responsable: ' + error.message);
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      // Restaurar contenido original
      container.innerHTML = originalContent;
    });
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

// Agregar estilos CSS para los elementos de edición
const style = document.createElement('style');
style.textContent = `
  .edit-assignee-btn:hover {
    color: #0066cc !important;
  }
  
  .user-selector {
    max-width: 150px;
  }
`;
document.head.appendChild(style);

// Observador de mutaciones para detectar nuevos elementos añadidos
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length) {
      // Si se añaden nuevos nodos, revisar si son tareas
      setTimeout(initAssigneeEditor, 500);
    }
  });
});

// Iniciar observación del DOM
observer.observe(document.body, { 
  childList: true,
  subtree: true
});

console.log('Script de editor de responsable cargado correctamente');
