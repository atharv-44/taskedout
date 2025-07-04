import { drawStatusPieChart, drawWeeklyBarChart } from './charts.js';
import { setupFilters } from './filterTasks.js';
import { renderTasks } from './renderTasks.js';
import { setupStatusUpdate } from './updateStatus.js';

// Dummy data for tasks
const tasks = [
    { name: 'Design Homepage', project: 'Website', due: '2024-06-20', status: 'In Progress', priority: 'High' },
    { name: 'Update Database', project: 'Backend', due: '2024-06-21', status: 'Pending', priority: 'Medium' },
    { name: 'Client Meeting', project: 'Sales', due: '2024-06-18', status: 'Completed', priority: 'Low' },
    { name: 'Write Docs', project: 'Website', due: '2024-06-19', status: 'Pending', priority: 'High' },
    { name: 'QA Review', project: 'Backend', due: '2024-06-17', status: 'In Progress', priority: 'Medium' }
];

// Page detection
const isTasksPage = document.getElementById('tasksTbody');
const isProgressPage = document.getElementById('statusPieChart');

if (isTasksPage) {
    renderTasks(tasks, 'tasksTbody');
    setupFilters(tasks, filtered => renderTasks(filtered, 'tasksTbody'));
    setupStatusUpdate(tasks, filtered => renderTasks(filtered, 'tasksTbody'));
    // Replace alert with redirect for openTaskDetail
    window.openTaskDetail = function(id) {
        window.location.href = `task_details.html?id=${id}`;
    };
}

if (isProgressPage) {
    // Dummy data for charts
    const statusData = { Completed: 12, 'In Progress': 5, Pending: 3 };
    const weeklyData = [3, 5, 4, 5];
    drawStatusPieChart(document.getElementById('statusPieChart'), statusData);
    drawWeeklyBarChart(document.getElementById('weeklyBarChart'), weeklyData);
} 