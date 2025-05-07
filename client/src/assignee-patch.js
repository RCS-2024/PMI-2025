/**
 * Script para agregar la funcionalidad de editar responsable
 * 
 * Este script se puede agregar al final del HTML para añadir
 * la funcionalidad sin modificar el código principal.
 */

// Esperar a que la página cargue completamente
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar después de 1 segundo para asegurar que React haya renderizado
  setTimeout(initAssigneeEditor, 1000);
});

function initAssigneeEditor() {
  console.log('Inicializando editor de responsables...');
  
  // Buscar todas las tareas en la página
  const taskCards = document.querySelectorAll('.task-card');
  
  if (taskCards.length === 0) {
    console.log('No se encontraron tarjetas de tareas. Reintentando en 1s...');
    setTimeout(initAssigneeEditor, 1000);
    return;
  }

  console.log(`Encontradas ${taskCards.length} tarjetas de tareas`);
  
  // Para cada tarjeta de tarea, agregar el botón de editar responsable
  taskCards.forEach(card => {
    // Buscar el contenedor del responsable
    const assigneeContainer = card.querySelector('.assignee-container');
    if (!assigneeContainer) return;
    
    // Obtener el ID de la tarea
    const taskId = card.getAttribute('data-task-id');
    if (!taskId) return;
    
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
    // Obtener la lista de usuarios
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('No se pudieron cargar los usuarios');
    }
    
    const users = await response.json();
    
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
