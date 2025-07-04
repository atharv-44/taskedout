export function renderTasks(tasks, containerId) {
    const tbody = document.getElementById(containerId);
    tbody.innerHTML = '';
    if (!tasks.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.textContent = 'No tasks found';
        td.style.textAlign = 'center';
        td.style.color = '#888';
        td.style.padding = '32px 0';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }
    tasks.forEach((task, idx) => {
        const tr = document.createElement('tr');
        if (task.status.toLowerCase() === 'completed') tr.style.textDecoration = 'line-through';
        // Task Name
        const tdName = document.createElement('td');
        tdName.textContent = task.name;
        tr.appendChild(tdName);
        // Project
        const tdProject = document.createElement('td');
        tdProject.textContent = task.project;
        tr.appendChild(tdProject);
        // Due Date
        const tdDue = document.createElement('td');
        tdDue.textContent = task.due;
        tdDue.className = getDueDateClass(task.due, task.status);
        tr.appendChild(tdDue);
        // Status (dropdown)
        const tdStatus = document.createElement('td');
        const select = document.createElement('select');
        select.setAttribute('aria-label', 'Change status');
        ['Pending', 'In Progress', 'Completed'].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (task.status === opt) option.selected = true;
            select.appendChild(option);
        });
        select.className = 'status ' + task.status.toLowerCase().replace(' ', '-');
        select.dataset.idx = idx;
        tdStatus.appendChild(select);
        tr.appendChild(tdStatus);
        // Priority
        const tdPriority = document.createElement('td');
        tdPriority.textContent = task.priority;
        tdPriority.className = 'priority ' + task.priority.toLowerCase();
        tr.appendChild(tdPriority);
        tbody.appendChild(tr);
    });
}

function getDueDateClass(due, status) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(due);
    if (status.toLowerCase() === 'completed') return '';
    if (!isNaN(dueDate)) {
        if (dueDate < today) return 'overdue';
        if (dueDate.getTime() === today.getTime()) return 'due-today';
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
        if (dueDate.getTime() === tomorrow.getTime()) return 'due-tomorrow';
    }
    return '';
} 