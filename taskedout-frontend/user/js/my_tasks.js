document.addEventListener('DOMContentLoaded', async function () { // This script assumes that the Supabase client and auth guard from the admin's script.js have already run.
    if (!window.supabaseClient) {
        console.error('Supabase client is not initialized. Make sure supabase-client.js is loaded.');
        return;
    }

    const tasksGrid = document.getElementById('tasks-grid');
    if (! tasksGrid) {
        console.error('The element with ID "tasks-grid" was not found.');
        return;
    }

    // Fetch the logged-in user once
    const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('No user is logged in.');
            tasksGrid.innerHTML = '<p>You must be logged in to view your tasks.</p>';
            return;
        }
    const userId = user.id;

    async function fetchAndDisplayMyTasks() {
        const {data: tasks, error} = await window.supabaseClient.from('tasks').select(`
                id,
                title,
                description,
                deadline,
                status,
                location
            `).eq('assignee_id', userId).order('deadline', {ascending: true});

        if (error) {
            console.error('Error fetching tasks:', error.message);
            tasksGrid.innerHTML = `<p>Error loading tasks: ${
                error.message
            }</p>`;
            return;
        }

        if (tasks.length === 0) {
            tasksGrid.innerHTML = '<p>You have no tasks assigned to you. Great job!</p>';
            return;
        }

        renderTaskCards(tasks);
    }

    function renderTaskCards(tasks) {
        tasksGrid.innerHTML = '';
        tasks.forEach((task, idx) => {
            const card = document.createElement('div');
            card.className = 'task-card';
            if (task.priority) {
                card.classList.add(`priority-${task.priority.toLowerCase()}`);
            }
            const statusOptions = [
                { value: 'Not Started', label: 'Not Started' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'In Review', label: 'In Review' },
                { value: 'Completed', label: 'Completed' }
            ];
            const currentStatus = (task.status || 'Not Started');
            const statusDropdown = `<select class="task-status-dropdown" data-task-idx="${idx}">
                ${statusOptions.map(opt => `<option value="${opt.value}"${opt.value === currentStatus ? ' selected' : ''}>${opt.label}</option>`).join('')}
            </select>`;
            // Site preference dropdown (styled as pill)
            const locationOptions = [
                { value: 'On Site', label: 'On Site' },
                { value: 'Off Site', label: 'Off Site' },
                { value: 'Client Site', label: 'Client Site' }
            ];
            const currentLocation = task.location || '';
            const locationDropdown = `<select class="site-pref-dropdown" data-task-idx="${idx}">
                        ${locationOptions.map(opt => `<option value="${opt.value}"${opt.value === currentLocation ? ' selected' : ''}>${opt.label}</option>`).join('')}
            </select>`;
            // Modal HTML (only add once if not present)
            if (!document.getElementById('viewTaskModal')) {
                const modal = document.createElement('div');
                modal.id = 'viewTaskModal';
                modal.style.display = 'none';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100vw';
                modal.style.height = '100vh';
                modal.style.background = 'rgba(44,62,80,0.18)';
                modal.style.zIndex = '2000';
                modal.innerHTML = `
                  <div id="viewTaskModalContent" style="background:#fff; border-radius:16px; padding:32px 28px 24px 28px; max-width:480px; width:95vw; box-shadow:0 8px 32px rgba(44,62,80,0.18); position:relative; margin:60px auto;">
                    <span id="closeViewTaskModal" style="position:absolute; top:14px; right:18px; font-size:1.5rem; color:#888; cursor:pointer; font-weight:bold;">&times;</span>
                    <div id="viewTaskModalBody"></div>
                  </div>
                `;
                document.body.appendChild(modal);
                document.getElementById('closeViewTaskModal').onclick = function() {
                  modal.style.display = 'none';
                };
                modal.onclick = function(e) {
                  if (e.target === modal) modal.style.display = 'none';
                };
            }
            card.innerHTML = `
    <div class="task-card-header" style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; width: 100%;">
        <h3 class="task-title" style="font-size: 1.1rem; font-weight: 600; margin: 0;">${task.title}</h3>
        <button class="view-task-btn" data-task-idx="${idx}" style="margin-left:auto; background:#0B2349; color:#fff; border:none; border-radius:8px; padding:6px 18px; font-size:0.98rem; font-weight:600; cursor:pointer;">View Task</button>
    </div>
    <p class="task-description" style="color: #4b5563; margin-bottom: 16px; font-size: 0.95rem;">
        ${task.description || 'No description provided.'}
    </p>
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 18px;">
    <div class="task-deadline" style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #6b7280;">
        <i data-lucide="calendar" style="width: 16px; height: 16px;"></i>
        <span>${new Date(task.deadline).toLocaleDateString()}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            ${statusDropdown}
            ${locationDropdown}
            <button class="task-comments-btn" title="View/Add Comments" data-task-idx="${idx}"><i class="fa-regular fa-comments"></i></button>
        </div>
    </div>
`;
            tasksGrid.appendChild(card);
            // View Task button event
            card.querySelector('.view-task-btn').onclick = function() {
                const modal = document.getElementById('viewTaskModal');
                const body = document.getElementById('viewTaskModalBody');
                body.innerHTML = `
                  <h2 style='margin-top:0;'>${task.title}</h2>
                  <p><strong>Description:</strong> ${task.description || 'No description provided.'}</p>
                  <p><strong>Status:</strong> ${task.status}</p>
                  <p><strong>Site Preference:</strong> ${task.location}</p>
                  <p><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()}</p>
                `;
                modal.style.display = 'flex';
            };
        });
        // Status dropdown event listeners
        document.querySelectorAll('.task-status-dropdown').forEach((dropdown, idx) => {
            dropdown.addEventListener('change', async function(e) {
                const newStatus = e.target.value;
                const task = tasks[idx];
                const { error } = await window.supabaseClient
                    .from('tasks')
                    .update({ status: newStatus })
                    .eq('id', task.id);
                if (error) {
                    alert('Failed to update status: ' + error.message);
                    e.target.value = task.status || 'Not Started';
                } else {
                    task.status = newStatus;
                }
            });
        });
        // Site preference dropdown event listeners
        document.querySelectorAll('.site-pref-dropdown').forEach((dropdown, idx) => {
            dropdown.addEventListener('change', async function(e) {
                const newLocation = e.target.value;
                const task = tasks[idx];
                const { error } = await window.supabaseClient
                    .from('tasks')
                    .update({ location: newLocation })
                    .eq('id', task.id);
                if (error) {
                    alert('Failed to update site preference: ' + error.message);
                    e.target.value = task.location || '';
                } else {
                    task.location = newLocation;
                }
            });
        });
        // Comments icon event listeners
        document.querySelectorAll('.task-comments-btn').forEach((btn, idx) => {
            btn.addEventListener('click', function() {
                openCommentsModal(tasks[idx]);
            });
        });
        lucide.createIcons();
    }

    // Comments modal logic
    const commentsModal = document.getElementById('commentsModal');
    const commentsList = document.getElementById('commentsList');
    const newCommentInput = document.getElementById('newComment');
    const submitCommentBtn = document.getElementById('submitCommentBtn');
    const closeCommentsModalBtn = document.querySelector('.close-comments-modal');
    let currentTaskForComments = null;
    async function openCommentsModal(task) {
        currentTaskForComments = task;
        commentsModal.style.display = 'flex';
        newCommentInput.value = '';
        await loadComments(task);
    }
    async function loadComments(task) {
        commentsList.innerHTML = '<div style="color:#888;">Loading...</div>';
        // Fetch comments for this task (by title and assignee_id)
        const { data: comments, error } = await window.supabaseClient
            .from('comments')
            .select('*')
            .eq('task_title', task.title)
            .eq('assignee_id', userId)
            .order('created_at', { ascending: true });
        if (error) {
            commentsList.innerHTML = '<div style="color:#ef4444;">Failed to load comments.</div>';
            return;
        }
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<div style="color:#888;">No comments yet.</div>';
            return;
        }
        commentsList.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-meta">${c.author || 'Unknown'} &middot; ${new Date(c.created_at).toLocaleString()}</div>
                <div>${c.content}</div>
            </div>
        `).join('');
    }
    if (closeCommentsModalBtn) {
        closeCommentsModalBtn.onclick = function() {
            commentsModal.style.display = 'none';
        };
    }
    window.onclick = function(event) {
        if (event.target === commentsModal) {
            commentsModal.style.display = 'none';
        }
    };
    if (submitCommentBtn) {
        submitCommentBtn.onclick = async function() {
            const content = newCommentInput.value.trim();
            if (!content || !currentTaskForComments) return;
            submitCommentBtn.disabled = true;
            // Get user info
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const author = user?.email || 'User';
            // Insert comment
            const { error } = await window.supabaseClient
                .from('comments')
                .insert({
                    task_title: currentTaskForComments.title,
                    assignee_id: userId,
                    author,
                    content
                });
            submitCommentBtn.disabled = false;
            if (error) {
                alert('Failed to add comment: ' + error.message);
            } else {
                newCommentInput.value = '';
                await loadComments(currentTaskForComments);
            }
        };
    }

    fetchAndDisplayMyTasks();
});
