export function setupFilters(tasks, onFilter) {
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const searchInput = document.getElementById('taskSearch');
    function filter() {
        let filtered = tasks.filter(task => {
            let match = true;
            if (statusFilter.value !== 'all' && task.status.toLowerCase() !== statusFilter.value) match = false;
            if (priorityFilter.value !== 'all' && task.priority.toLowerCase() !== priorityFilter.value) match = false;
            const q = searchInput.value.trim().toLowerCase();
            if (q && !(task.name.toLowerCase().includes(q) || task.project.toLowerCase().includes(q))) match = false;
            return match;
        });
        onFilter(filtered);
    }
    statusFilter.addEventListener('change', filter);
    priorityFilter.addEventListener('change', filter);
    searchInput.addEventListener('input', filter);
} 