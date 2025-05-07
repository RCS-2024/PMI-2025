/**
 * Simple editor: Versión ultra simplificada del editor de responsables
 * Esta versión funciona completamente independiente del código React
 */

(function() {
  // Configuración
  const API_URL = 'http://localhost:5000/api';
  
  // Función para buscar tarjetas alternativas (para más compatibilidad)
  function findAlternativeCards() {
    // Esta función es más selectiva para evitar falsos positivos
    const cards = [];
    
    try {
      // Buscar solo elementos que tengan la estructura correcta
      document.querySelectorAll('.bg-white.rounded-lg.border, div.p-3').forEach(el => {
        if (el && !cards.includes(el) && el.textContent && el.textContent.length > 10) {
          // Verificar que tenga características de una tarjeta de tarea
          const hasAssignee = el.textContent.includes('Eder') || 
                             el.textContent.includes('Admin');
          const hasDate = el.textContent.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
          
          // Solo considerar si tiene ambos atributos
          if (hasAssignee && hasDate && !cards.includes(el)) {
            cards.push(el);
          }
        }
      });
    } catch (err) {
      console.error('Error buscando tarjetas alternativas:', err);
    }
    
    return cards;
  }
  
  // Inicializar cuando la página se cargue
  window.addEventListener('load', () => {
    console.log('🔧 Inicializando el editor simple de responsables...');
    // Esperar más tiempo para asegurarnos que React haya montado todos los componentes
    setTimeout(init, 2500);
  });
  
  function init() {
    try {
      // Verificar que el DOM está listo
      if (!document.body) {
        console.log('⚠️ DOM no está listo. Reintentando...');
        setTimeout(init, 1000);
        return;
      }
      
      // Limpiar cualquier botón de edición anterior que pudiera estar mal colocado
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.parentNode.removeChild(btn);
      });
      
      // Buscar todas las tarjetas de tarea
      const taskCards = findTaskCards();
      const alternativeCards = findAlternativeCards();
      
      const allCards = [...taskCards, ...alternativeCards];
      
      if (allCards.length === 0) {
        console.log('⚠️ No se encontraron tarjetas de tareas. Reintentando...');
        setTimeout(init, 2000);
        return;
      }
      
      console.log(`✅ Encontradas ${allCards.length} tarjetas de tareas`);
      
      // Añadir botones solo donde se necesitan
      let buttonsAdded = 0;
      allCards.forEach(card => {
        const section = findAssigneeSection(card);
        if (section) {
          addEditButton(section, findTaskId(card));
          buttonsAdded++;
        }
      });
      
      console.log(`✅ Añadidos ${buttonsAdded} botones de edición`);
      
      // Solo continuar si se añadió al menos un botón
      if (buttonsAdded > 0) {
        // Observar cambios en el DOM para detectar nuevas tarjetas
        const observer = new MutationObserver(() => {
          setTimeout(() => {
            try {
              // Evitar duplicar botones
              const cardsToCheck = [
                ...findTaskCards(),
                ...findAlternativeCards()
              ];
              
              cardsToCheck.forEach(card => {
                const section = findAssigneeSection(card);
                if (section) {
                  addEditButton(section, findTaskId(card));
                }
              });
            } catch (err) {
              console.error('Error detectando nuevas tarjetas:', err);
            }
          }, 500);
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Mensaje de confirmación
        showMessage('Editor de responsables activado', 'success');
      } else {
        console.log('⚠️ No se pudieron añadir botones. Reintentando...');
        setTimeout(init, 3000);
      }
    } catch (err) {
      console.error('Error en inicialización:', err);
      setTimeout(init, 2000);
    }
  }
  
  function findTaskCards() {
    // Buscar elementos que contengan texto de usuario asignado
    const cards = [];
    const elements = document.querySelectorAll('div');
    
    elements.forEach(el => {
      try {
        if (el && el.textContent && (
            el.textContent.includes('👤') || 
            el.textContent.includes('Asignar a usuario') ||
            el.textContent.includes('Sin asignar'))) {
          
          // Encontrar la tarjeta contenedora
          let card = el;
          while (card && 
                card.classList && 
                card.parentElement && 
                !card.classList.contains('bg-white') && 
                (!card.parentElement.classList || !card.parentElement.classList.contains('task-card'))) {
            card = card.parentElement;
            if (!card) break;
          }
          
          if (card && !cards.includes(card)) {
            cards.push(card);
          }
        }
      } catch (err) {
        console.error('Error procesando elemento:', err);
      }
    });
    
    console.log(`Tarjetas encontradas: ${cards.length}`);
    return cards;
  }
  
  function addEditButtons(cards) {
    cards.forEach(card => {
      // Buscar sección de responsable
      const assigneeContainer = findAssigneeSection(card);
      if (!assigneeContainer) return;
      
      // Añadir el botón de edición
      addEditButton(assigneeContainer, findTaskId(card));
    });
  }
  
  function addEditButton(container, taskId) {
    // Si ya tiene un botón de edición, no añadir otro
    if (container.querySelector && container.querySelector('.edit-btn')) return;
    
    // Crear botón de edición
    const editBtn = document.createElement('button');
    editBtn.innerText = '✎';
    editBtn.className = 'edit-btn';
    editBtn.style.marginLeft = '5px';
    editBtn.style.border = 'none';
    editBtn.style.background = 'none';
    editBtn.style.cursor = 'pointer';
    editBtn.style.color = '#666';
    editBtn.style.fontSize = '12px';
    
    editBtn.addEventListener('mouseenter', () => {
      editBtn.style.color = '#0066cc';
    });
    
    editBtn.addEventListener('mouseleave', () => {
      editBtn.style.color = '#666';
    });
    
    editBtn.addEventListener('click', () => {
      if (taskId) {
        showUserSelector(container, taskId);
      } else {
        console.error('No se pudo determinar el ID de la tarea');
      }
    });
    
    container.appendChild(editBtn);
  }
  
  function findAssigneeSection(card) {
    try {
      // Buscar solo elementos que contienen el nombre del responsable
      if (!card || !card.querySelectorAll) return null;
      
      // Buscar específicamente los elementos que tienen imágenes de usuario o "Eder"
      const assigneeElements = [];
      
      // Buscar elementos de tipo "span" que contienen el nombre "Eder"
      card.querySelectorAll('span, div').forEach(el => {
        if (el && el.textContent && 
            (el.textContent.includes('Eder') || 
             el.textContent.includes('Admin'))) {
          assigneeElements.push(el);
        }
      });
      
      // Si encontramos alguno, usar el primero
      if (assigneeElements.length > 0) {
        // Verificar si ya tiene botón
        if (assigneeElements[0].querySelector && 
            assigneeElements[0].querySelector('.edit-btn')) {
          return null; // Ya tiene botón
        }
        return assigneeElements[0];
      }
    } catch (err) {
      console.error('Error buscando sección de responsable:', err);
    }
    
    return null;
  }
  
  function findTaskId(card) {
    // Intentar extraer ID de tarea del HTML
    const html = card.outerHTML;
    const match = html.match(/id=['"]([a-f0-9]{24})['"]/);
    if (match && match[1]) return match[1];
    
    // Intentar otros atributos
    const idAttrs = ['data-id', 'data-task-id', 'id'];
    for (const attr of idAttrs) {
      const id = card.getAttribute(attr);
      if (id && id.match(/[a-f0-9]{24}/)) {
        return id.match(/[a-f0-9]{24}/)[0];
      }
    }
    
    // Generar ID temporal único
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  }
  
  async function showUserSelector(container, taskId) {
    const originalContent = container.innerHTML;
    
    try {
      // Mostrar estado de carga
      container.innerHTML = '<span style="color:#666;">Cargando usuarios...</span>';
      
      // Obtener token
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');
      
      // Cargar usuarios
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error cargando usuarios');
      
      const users = await response.json();
      console.log(`Cargados ${users.length} usuarios`);
      
      // Crear selector
      const select = document.createElement('select');
      select.style.fontSize = '12px';
      select.style.padding = '2px';
      select.style.borderRadius = '4px';
      select.style.marginRight = '5px';
      
      // Opción para quitar responsable
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = 'Sin asignar';
      select.appendChild(emptyOption);
      
      // Agregar usuarios
      users.forEach(user => {
        const option = document.createElement('option');
        option.value = user._id;
        option.textContent = user.displayName || user.username;
        select.appendChild(option);
      });
      
      // Botones de acción
      const saveBtn = document.createElement('button');
      saveBtn.innerText = '✓';
      saveBtn.style.color = '#22c55e';
      saveBtn.style.border = 'none';
      saveBtn.style.background = 'none';
      saveBtn.style.cursor = 'pointer';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.innerText = '✕';
      cancelBtn.style.color = '#ef4444';
      cancelBtn.style.border = 'none';
      cancelBtn.style.background = 'none';
      cancelBtn.style.cursor = 'pointer';
      
      // Reemplazar contenido
      container.innerHTML = '';
      container.appendChild(select);
      container.appendChild(saveBtn);
      container.appendChild(cancelBtn);
      
      // Eventos
      saveBtn.addEventListener('click', () => {
        updateAssignee(taskId, select.value, container, originalContent);
      });
      
      cancelBtn.addEventListener('click', () => {
        container.innerHTML = originalContent;
      });
      
    } catch (error) {
      console.error('Error:', error);
      container.innerHTML = originalContent;
      showMessage('Error: ' + error.message, 'error');
    }
  }
  
  async function updateAssignee(taskId, userId, container, originalContent) {
    try {
      // Mostrar estado de guardado
      container.innerHTML = '<span style="color:#666;">Guardando...</span>';
      
      // Obtener token
      const token = localStorage.getItem('token');
      
      // Actualizar en el servidor
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assignedUserId: userId })
      });
      
      if (!response.ok) throw new Error('Error actualizando tarea');
      
      const updatedTask = await response.json();
      
      // Actualizar UI
      const text = document.createElement('span');
      if (updatedTask.assignedTo) {
        text.innerHTML = `👤 ${updatedTask.assignedTo.displayName || updatedTask.assignedTo.username}`;
      } else {
        text.innerHTML = '👤 Sin asignar';
        text.style.color = '#666';
      }
      
      container.innerHTML = '';
      container.appendChild(text);
      
      // Volver a añadir botón de edición
      const editBtn = document.createElement('button');
      editBtn.innerText = '✎';
      editBtn.className = 'edit-btn';
      editBtn.style.marginLeft = '5px';
      editBtn.style.border = 'none';
      editBtn.style.background = 'none';
      editBtn.style.cursor = 'pointer';
      editBtn.style.color = '#666';
      
      editBtn.addEventListener('click', () => {
        showUserSelector(container, taskId);
      });
      
      container.appendChild(editBtn);
      
      // Mostrar mensaje de éxito
      showMessage('Responsable actualizado correctamente', 'success');
      
    } catch (error) {
      console.error('Error:', error);
      container.innerHTML = originalContent;
      showMessage('Error: ' + error.message, 'error');
    }
  }
  
  function showMessage(message, type) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.zIndex = '9999';
    
    if (type === 'success') {
      notification.style.backgroundColor = '#dcfce7';
      notification.style.color = '#166534';
      notification.style.border = '1px solid #86efac';
    } else {
      notification.style.backgroundColor = '#fee2e2';
      notification.style.color = '#b91c1c';
      notification.style.border = '1px solid #fecaca';
    }
    
    document.body.appendChild(notification);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }
})();
