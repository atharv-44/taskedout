// storage.js
export function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}
export function loadTasks() {
    const data = localStorage.getItem('tasks');
    return data ? JSON.parse(data) : [];
} 