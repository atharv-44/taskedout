import { showToast } from './toast.js';
export function setupStatusUpdate(tasks, onUpdate) {
    const tbody = document.getElementById('tasksTbody');
    tbody.addEventListener('change', function(e) {
        if (e.target.tagName === 'SELECT' && e.target.getAttribute('aria-label') === 'Change status') {
            const idx = parseInt(e.target.dataset.idx, 10);
            const newStatus = e.target.value;
            tasks[idx].status = newStatus;
            showToast('Task status updated');
            onUpdate(tasks);
        }
    });
} 