document.addEventListener('DOMContentLoaded', function () {
    // Ensure the Supabase client is available
    if (!window.supabaseClient) {
        console.error('Supabase client is not initialized.');
        return;
    }

    const tasksGrid = document.getElementById('tasks-grid');

    async function fetchAndDisplayMyTasks() {
        // 1. Get the currently logged-in user
        const { data: { user } } = await window.supabaseClient.auth.getUser();

        if (!user) {
            console.error('No user is logged in.');
            tasksGrid.innerHTML = '<p>You must be logged in to see your tasks.</p>';
            return;
        }

        // 2. Fetch tasks assigned to this user from the 'tasks' table
        // This also fetches the username from the 'users' table using the foreign key
        const { data: tasks, error } = await window.supabaseClient
            .from('tasks')
            .select(`
                *,
                assignee:users(username) 
            `)
            .eq('assignee_id', user.id);

        if (error) {
            console.error('Error fetching tasks:', error.message);
            tasksGrid.innerHTML = `<p>Error loading tasks: ${error.message}</p>`;
            return;
        }

        if (tasks.length === 0) {
            tasksGrid.innerHTML = '<p>You have no tasks assigned to you.</p>';
            return;
        }

        // 3. Render the tasks as cards
        renderTaskCards(tasks);
    }

    function renderTaskCards(tasks) {
        tasksGrid.innerHTML = ''; // Clear existing content

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';

            // Add a class based on priority for styling
            if (task.priority) {
                card.classList.add(`priority-${task.priority.toLowerCase()}`);
            }

            card.innerHTML = `
                <div class="task-card-header">
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-status status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
                </div>
                <p class="task-description">${task.description || 'No description provided.'}</p>
                <div class="task-card-footer">
                    <div class="task-assignee">
                        <i data-lucide="user"></i>
                        <span>${task.assignee ? task.assignee.username : 'Unassigned'}</span>
                    </div>
                    <div class="task-deadline">
                        <i data-lucide="calendar"></i>
                        <span>${new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
            tasksGrid.appendChild(card);
        });

        // Re-render icons after adding them to the DOM
        lucide.createIcons();
    }

    // Initial load of tasks
    fetchAndDisplayMyTasks();
});
