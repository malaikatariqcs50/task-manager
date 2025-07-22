document.addEventListener('DOMContentLoaded', function() {

    loadTasks();

    // Add new task
    document.getElementById('addTaskForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        
        fetch(window.location.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=add&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`
        })
        .then(response => response.json())
        .then(task => {
            
            addTaskToDOM(task);
            document.getElementById('addTaskForm').reset();
        })
        .catch(error => console.error('Error:', error));
    });

    function loadTasks() {
        fetch(window.location.href + '?api')
            .then(response => response.json())
            .then(tasks => {
                const tasksList = document.getElementById('tasksList');
                tasksList.innerHTML = ''; // Clear existing tasks
                tasks.forEach(task => addTaskToDOM(task));
            })
            .catch(error => console.error('Error:', error));
    }

    initDragAndDrop();
    
    function initDragAndDrop() {
        const tasksList = document.getElementById('tasksList');
        
        tasksList.addEventListener('dragover', function(e) {
            e.preventDefault();
            const draggable = document.querySelector('.dragging');
            const afterElement = getDragAfterElement(tasksList, e.clientY);
            
            if (afterElement == null) {
                tasksList.appendChild(draggable);
            } else {
                tasksList.insertBefore(draggable, afterElement);
            }
        });
        
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('tr:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    }

    function addTaskToDOM(task) {
        const tasksList = document.getElementById('tasksList');
        const row = document.createElement('tr');
        row.dataset.id = task.id;
        row.draggable = true;
        row.classList.add('draggable');
        
         row.addEventListener('dragstart', () => {
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', task.id);
        });
        
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            saveTaskOrder();
        });

        row.addEventListener('mousedown', () => {
        row.draggable = true;
    });
    
    row.addEventListener('mouseleave', () => {
        if (!row.classList.contains('dragging')) {
            row.draggable = false;
        }
    });
        
        let statusClass, statusText;
        switch(task.status) {
            case 'todo':
                statusClass = 'status-todo';
                statusText = 'To Do';
                break;
            case 'inprogress':
                statusClass = 'status-inprogress';
                statusText = 'In Progress';
                break;
            case 'done':
                statusClass = 'status-done';
                statusText = 'Done';
                break;
        }
        
        row.innerHTML = `
            <td>${task.title}</td>
            <td>${task.description || ''}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td class="task-actions">
                <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${task.id}">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${task.id}">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
        
        tasksList.appendChild(row);
        
        row.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
    }

    function saveTaskOrder() {
        const taskIds = [];
        document.querySelectorAll('#tasksList tr').forEach(row => {
            taskIds.push(row.dataset.id);
        });
        
        fetch(window.location.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=reorder&order=${JSON.stringify(taskIds)}`
        }).catch(error => console.error('Error saving order:', error));
    }
});

function openEditModal(task) {
    const modal = document.getElementById('editTaskModal');
    const editForm = document.getElementById('editTaskForm');
    
    // Populate form with task data
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskStatus').value = task.status;
    
    // Show edit controls
    const editControls = document.getElementById('editControls');
    editControls.style.display = 'block';
    document.getElementById('currentEditId').value = task.id;
    
    // Initialize Bootstrap modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

document.getElementById('saveTaskChanges').addEventListener('click', function() {
    const id = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTaskTitle').value;
    const description = document.getElementById('editTaskDescription').value;
    const status = document.getElementById('editTaskStatus').value;
    
    fetch(window.location.href, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=update&id=${id}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&status=${status}`
    })
    .then(response => response.json())
    .then(() => {
        // Update the task in the DOM
        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (row) {
            let statusClass, statusText;
            switch(status) {
                case 'todo':
                    statusClass = 'status-todo';
                    statusText = 'To Do';
                    break;
                case 'inprogress':
                    statusClass = 'status-inprogress';
                    statusText = 'In Progress';
                    break;
                case 'done':
                    statusClass = 'status-done';
                    statusText = 'Done';
                    break;
            }
            
            row.innerHTML = `
                <td>${title}</td>
                <td>${description || ''}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="task-actions">
                    <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${id}">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${id}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            `;
            
            row.querySelector('.edit-btn').addEventListener('click', () => openEditModal({
                id,
                title,
                description,
                status
            }));
            row.querySelector('.delete-btn').addEventListener('click', () => deleteTask(id));
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
        modal.hide();
        
        document.getElementById('addTaskForm').style.display = 'block';
        document.getElementById('editControls').style.display = 'none';
    })
    .catch(error => console.error('Error:', error));
});

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        fetch(window.location.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=delete&id=${id}`
        })
        .then(response => response.json())
        .then(() => {
            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (row) {
                row.remove();
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

document.getElementById('cancelEdit').addEventListener('click', function() {
    document.getElementById('addTaskForm').style.display = 'block';
    document.getElementById('editControls').style.display = 'none';
});