<?php

define('TASKS_FILE', 'tasks.json');

if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['api'])) {

    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'add':
            addTask();
            break;
        case 'update':
            updateTask();
            break;
        case 'delete':
            deleteTask();
            break;
        case 'reorder':
            reorderTasks();
            break;
        default:
            getTasks();
    }
    exit; 
}

function getTasks() {
    $tasks = json_decode(file_get_contents(TASKS_FILE), true);
    echo json_encode($tasks);
}

function addTask() {
    $tasks = json_decode(file_get_contents(TASKS_FILE), true);
    $newTask = [
        'id' => uniqid(),
        'title' => $_POST['title'],
        'description' => $_POST['description'] ?? '',
        'status' => 'todo',
        'created_at' => date('Y-m-d H:i:s')
    ];
    $tasks[] = $newTask;
    file_put_contents(TASKS_FILE, json_encode($tasks));
    echo json_encode($newTask);
}

function updateTask() {
    $tasks = json_decode(file_get_contents(TASKS_FILE), true);
    $id = $_POST['id'];
    
    foreach ($tasks as &$task) {
        if ($task['id'] === $id) {
            if (isset($_POST['title'])) {
                $task['title'] = $_POST['title'];
            }
            if (isset($_POST['description'])) {
                $task['description'] = $_POST['description'];
            }
            if (isset($_POST['status'])) {
                $task['status'] = $_POST['status'];
            }
            break;
        }
    }
    
    file_put_contents(TASKS_FILE, json_encode($tasks));
    echo json_encode(['success' => true]);
}

function deleteTask() {
    $tasks = json_decode(file_get_contents(TASKS_FILE), true);
    $id = $_POST['id'];
    
    $tasks = array_filter($tasks, function($task) use ($id) {
        return $task['id'] !== $id;
    });
    
    file_put_contents(TASKS_FILE, json_encode(array_values($tasks)));
    echo json_encode(['success' => true]);
}

function reorderTasks() {
    $order = json_decode($_POST['order'], true);
    $tasks = json_decode(file_get_contents(TASKS_FILE), true);
    
    $orderedTasks = [];
    foreach ($order as $id) {
        foreach ($tasks as $task) {
            if ($task['id'] === $id) {
                $orderedTasks[] = $task;
                break;
            }
        }
    }
    
    file_put_contents(TASKS_FILE, json_encode($orderedTasks));
    echo json_encode(['success' => true]);
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Manager</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="style.css">
    <style>
        .draggable {
            cursor: move;
            user-select: none;
        }
        .dragging {
            opacity: 0.5;
            background-color: #f8f9fa;
        }
        .drag-over {
            border-top: 2px solid #0d6efd;
        }
    </style>
</head>
<body>
    <div class="container py-4">
        <h1 class="text-center mb-4">Task Manager</h1>
        
        <!-- Add Task Form -->
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">Add New Task</h5>
            </div>
            <div class="card-body">
                <form id="addTaskForm">
                    <div class="mb-3">
                        <label for="taskTitle" class="form-label">Title</label>
                        <input type="text" class="form-control" id="taskTitle" required>
                    </div>
                    <div class="mb-3">
                        <label for="taskDescription" class="form-label">Description</label>
                        <textarea class="form-control" id="taskDescription" rows="2"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Task</button>
                </form>
            </div>
        </div>

        <div id="editControls" style="display: none;">
    <div class="card mb-4">
        <div class="card-header bg-warning text-dark">
            <h5 class="mb-0">Edit Task</h5>
        </div>
        <div class="card-body">
            <form id="editTaskFormInline">
                <input type="hidden" id="currentEditId">
                <div class="mb-3">
                    <label for="editTaskTitleInline" class="form-label">Title</label>
                    <input type="text" class="form-control" id="editTaskTitleInline" required>
                </div>
                <div class="mb-3">
                    <label for="editTaskDescriptionInline" class="form-label">Description</label>
                    <textarea class="form-control" id="editTaskDescriptionInline" rows="2"></textarea>
                </div>
                <div class="mb-3">
                    <label for="editTaskStatusInline" class="form-label">Status</label>
                    <select class="form-select" id="editTaskStatusInline">
                        <option value="todo">To Do</option>
                        <option value="inprogress">In Progress</option>
                        <option value="done">Done</option>
                    </select>
                </div>
                <button type="button" class="btn btn-warning me-2" id="saveEditInline">Save Changes</button>
                <button type="button" class="btn btn-secondary" id="cancelEdit">Cancel</button>
            </form>
        </div>
    </div>
</div>
        
        <!-- Task List -->
        <div class="card">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">Your Tasks</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="tasksList">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="editTaskModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Task</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="editTaskForm">
                        <input type="hidden" id="editTaskId">
                        <div class="mb-3">
                            <label for="editTaskTitle" class="form-label">Title</label>
                            <input type="text" class="form-control" id="editTaskTitle" required>
                        </div>
                        <div class="mb-3">
                            <label for="editTaskDescription" class="form-label">Description</label>
                            <textarea class="form-control" id="editTaskDescription" rows="3"></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="editTaskStatus" class="form-label">Status</label>
                            <select class="form-select" id="editTaskStatus">
                                <option value="todo">To Do</option>
                                <option value="inprogress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveTaskChanges">Save changes</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="script.js"></script>
</body>
</html>