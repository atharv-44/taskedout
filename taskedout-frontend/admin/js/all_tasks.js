document.addEventListener('DOMContentLoaded', function () { // This script assumes that the Supabase client and auth guard from the admin's script.js have already run.
    if (!window.supabaseClient) {
        console.error('Supabase client is not initialized. Make sure supabase-client.js is loaded.');
        return;
    }

    const tasksGrid = document.getElementById('tasks-grid');
    if (! tasksGrid) {
        console.error('The element with ID "tasks-grid" was not found.');
        return;
    }

    async function fetchAndDisplayMyTasks() {
        // Get current admin's organization
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('No user is logged in.');
            tasksGrid.innerHTML = '<p>You must be logged in to view your tasks.</p>';
            return;
        }
        const { data: adminData, error: adminError } = await window.supabaseClient.from('admins').select('organization').eq('id', user.id).single();
        if (adminError || !adminData) {
            console.error('❌ Failed to fetch admin organization:', adminError?.message);
            tasksGrid.innerHTML = '<p>Error loading organization info.</p>';
            return;
        }
        const organization = adminData.organization;
        // Fetch users in this organization
        const { data: orgUsers, error: orgUsersError } = await window.supabaseClient.from('users').select('id').eq('userOrganization', organization);
        if (orgUsersError) {
            console.error('Error fetching org users:', orgUsersError.message);
            tasksGrid.innerHTML = '<p>Error loading users for organization.</p>';
            return;
        }
        const orgUserIds = orgUsers.map(u => u.id);
        // Fetch all tasks
        const { data: tasks, error } = await window.supabaseClient.from('tasks').select('title, description, deadline,created_at, status, location, users(username, id, avatar_url)').order('deadline', { ascending: true });
        if (error) {
            console.error('Error fetching tasks:', error.message);
            tasksGrid.innerHTML = `<p>Error loading tasks: ${error.message}</p>`;
            return;
        }
        // Filter tasks where users.id is in orgUserIds
        const filteredTasks = tasks.filter(task => task.users && orgUserIds.includes(task.users.id));
        if (filteredTasks.length === 0) {
            tasksGrid.innerHTML = '<p>You have no tasks assigned to you. Great job!</p>';
            return;
        }
        renderTaskCards(filteredTasks);
    }

    function renderTaskCards(tasks) {
        tasksGrid.innerHTML = '';
        tasks.forEach((task, idx) => {
            const card = document.createElement('div');
            card.className = 'task-card';
            if (task.priority) {
                card.classList.add(`priority-${task.priority.toLowerCase()}`);
            }
            const statusClass = task.status ? task.status.toLowerCase().replace(' ', '-') : 'not-started';
            card.innerHTML = `
    <div class="task-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 class="task-title" style="font-size: 1.1rem; font-weight: 600; margin: 0;">${task.title}</h3>
        <span class="task-status" style="
            font-size: 0.75rem;
            text-transform: capitalize;
            background-color: #e5e7eb;
            color: #374151;
            padding: 4px 10px;
            border-radius: 999px;">
            ${task.status || 'Not Started'}
        </span>
    </div>
    <p class="task-description" style="color: #4b5563; margin-bottom: 16px; margin-top:16px; font-size: 0.95rem;">
        ${task.description || 'No description provided.'}
    </p>
    <div class="task-card-footer" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #6b7280; margin-top: 20px;">
      <div class="task-deadline" style="display: flex; align-items: center; gap: 6px;">
        <i data-lucide="calendar" style="width: 16px; height: 16px;"></i>
        <span>${new Date(task.deadline).toLocaleDateString()}</span>
      </div>
      <div class="task-assignee" style="display: flex; align-items: center; gap: 6px;">
        <i data-lucide="user" style="width: 16px; height: 16px;"></i>
        <span>${task.users?.username || 'Unassigned'}</span>
      </div>
    </div>
    `;
            card.style.cursor = 'pointer';
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('task-comments-btn')) return;
                openAdminTaskDetailModal(task);
            });
            tasksGrid.appendChild(card);
        });
        lucide.createIcons();
    }

    // Modal logic for task details (admin)
    function openAdminTaskDetailModal(task) {
        const modal = document.getElementById('adminViewTaskModal');
        const body = document.getElementById('adminViewTaskModalBody');
        // Avatar fallback (always from users table)
        const avatarUrl = (task.users && task.users.avatar_url) ? task.users.avatar_url : '/taskedout-frontend/assets/images/user_avatar.png';
        // Status badge class
        let statusClass = 'admin-status-badge';
        if (task.status === 'Completed') statusClass += ' completed';
        else if (task.status === 'In Progress') statusClass += ' in-progress';
        else statusClass += ' not-started';
        // Timeline (mocked for now)
        const timeline = `
          <div style="margin: 1.2rem 0 0.5rem 0;">
            <div style="font-weight:600; color:#0B2349; margin-bottom:0.3rem;">Task Timeline</div>
            <ul style="list-style:none; padding:0; margin:0;">
              <li style="margin-bottom:0.4rem;"><span style="color:#059669; font-weight:600;">${task.status}</span> &mdash; ${new Date(task.deadline).toLocaleDateString()}</li>
              <li style="color:#6b7280;">Created: (date unavailable)</li>
            </ul>
          </div>
        `;
        // Copy button
        const copyBtn = `<button id="adminCopyTaskBtn" style="background:#f3f4f6; color:#0B2349; border:none; border-radius:6px; padding:6px 14px; font-size:0.95rem; font-weight:600; cursor:pointer; margin-left:8px;">Copy Info</button>`;
        body.innerHTML = `
          <div class="admin-modal-header">
            <img src="${avatarUrl}" class="admin-modal-avatar" alt="User Avatar" />
            <div>
              <div class="admin-modal-title">${task.title}</div>
              <div class="admin-modal-badges">
                <span class="${statusClass}">${task.status}</span>
              </div>
            </div>
          </div>
          <div class="admin-modal-info">
            <div class="admin-modal-info-row"><span class="admin-modal-label">Description:</span> <span class="admin-modal-value">${task.description || 'No description provided.'}</span></div>
            <div class="admin-modal-info-row"><span class="admin-modal-label">Site Preference:</span> <span class="admin-modal-value">${task.location || 'N/A'}</span></div>
            <div class="admin-modal-info-row"><span class="admin-modal-label">Deadline:</span> <span class="admin-modal-value">${new Date(task.deadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })}</span></div>
            <div class="admin-modal-info-row"><span class="admin-modal-label">Assignee:</span> <span class="admin-modal-value">${task.users?.username || 'Unassigned'}</span></div>
            <div class="admin-modal-info-row"><span class="admin-modal-label">Created At:</span> <span class="admin-modal-value">${new Date(task.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })}</span></div>
          </div>
          <div style="display:flex; align-items:center; gap:1rem; margin-top:1.2rem;">
            <button id="adminOpenCommentsBtn">View/Add Comments</button>
            ${copyBtn}
          </div>
        `;
        modal.style.display = 'flex';
        // Copy to clipboard logic
        setTimeout(() => {
            const copyTaskBtn = document.getElementById('adminCopyTaskBtn');
            if (copyTaskBtn) {
                copyTaskBtn.onclick = function(e) {
                    e.stopPropagation();
                    const info = `Task: ${task.title}\nDescription: ${task.description}\nStatus: ${task.status}\nSite: ${task.location}\nDeadline: ${new Date(task.deadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })}\nAssignee: ${task.users?.username || 'Unassigned'}`;
                    navigator.clipboard.writeText(info);
                    copyTaskBtn.textContent = 'Copied!';
                    setTimeout(() => { copyTaskBtn.textContent = 'Copy Info'; }, 1200);
                };
            }
            const openCommentsBtn = document.getElementById('adminOpenCommentsBtn');
            if (openCommentsBtn) {
                openCommentsBtn.onclick = function(e) {
                    e.stopPropagation();
                    openAdminCommentsModal(task);
                };
            }
        }, 0);
        const closeBtn = document.getElementById('closeAdminViewTaskModal');
        if (closeBtn) {
            closeBtn.onclick = function() {
                modal.style.display = 'none';
            };
        }
        modal.onclick = function(e) {
            if (e.target === modal) modal.style.display = 'none';
        };
    }

    // Comments modal logic (admin, unique IDs)
    const commentsModal = document.getElementById('adminCommentsModal');
    const commentsList = document.getElementById('adminCommentsList');
    const newCommentInput = document.getElementById('adminNewComment');
    const submitCommentBtn = document.getElementById('adminSubmitCommentBtn');
    const closeCommentsModalBtn = document.querySelector('.close-admin-comments-modal');
    let currentTaskForComments = null;
    async function openAdminCommentsModal(task) {
        currentTaskForComments = task;
        commentsModal.style.display = 'flex';
        newCommentInput.value = '';
        await loadAdminComments(task);
    }
    async function loadAdminComments(task) {
        commentsList.innerHTML = '<div style="color:#888;">Loading...</div>';
        const { data: comments, error } = await window.supabaseClient
            .from('comments')
            .select('*')
            .eq('task_title', task.title)
            .eq('assignee_id', task.users?.id)
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
    window.addEventListener('click', function(event) {
        if (event.target === commentsModal) {
            commentsModal.style.display = 'none';
        }
    });
    if (submitCommentBtn) {
        submitCommentBtn.onclick = async function() {
            const content = newCommentInput.value.trim();
            if (!content || !currentTaskForComments) return;
            submitCommentBtn.disabled = true;
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const author = user?.email || 'Admin';
            const { error } = await window.supabaseClient
                .from('comments')
                .insert({
                    task_title: currentTaskForComments.title,
                    assignee_id: currentTaskForComments.users?.id,
                    author,
                    content
                });
            submitCommentBtn.disabled = false;
            if (error) {
                alert('Failed to add comment: ' + error.message);
            } else {
                newCommentInput.value = '';
                await loadAdminComments(currentTaskForComments);
            }
        };
    }

    fetchAndDisplayMyTasks();

    // --- NEW TASKS FUNCTIONALITY ---

    // 1. Fetch all tasks with all relevant fields
    async function fetchAllTasksWithTeams() {
        const { data: tasks, error } = await window.supabaseClient
            .from('tasks')
            .select('id, title, description, status, priority, deadline, team, users(id, username, avatar_url)')
            .order('deadline', { ascending: true });
        if (error) {
            console.error('Error fetching tasks:', error.message);
            tasksGrid.innerHTML = `<p>Error loading tasks: ${error.message}</p>`;
            return [];
        }
        return tasks;
    }

    // 2. Group tasks by team
    function groupTasksByTeam(tasks) {
        const grouped = {};
        tasks.forEach(task => {
            const team = task.team || 'Other';
            if (!grouped[team]) grouped[team] = [];
            grouped[team].push(task);
        });
        return grouped;
    }

    // 3. Render tasks grouped by team, with badges
    function renderTasksByTeam(tasks) {
        tasksGrid.innerHTML = '';
        const grouped = groupTasksByTeam(tasks);
        Object.keys(grouped).forEach(team => {
            // Team header
            const teamHeader = document.createElement('h3');
            teamHeader.textContent = team.toUpperCase() + ' TEAM';
            teamHeader.className = 'tasks-team-header';
            tasksGrid.appendChild(teamHeader);
            // Tasks for this team
            grouped[team].forEach(task => {
                const card = document.createElement('div');
                card.className = 'task-card';
                // Status badge
                let statusBadge = '';
                if (task.status) {
                    let statusClass = 'badge-status';
                    if (task.status === 'In Progress') statusClass += ' badge-inprogress';
                    else if (task.status === 'Completed') statusClass += ' badge-done';
                    else statusClass += ' badge-notstarted';
                    statusBadge = `<span class="${statusClass}">${task.status}</span>`;
                }
                // Priority badge
                let priorityBadge = '';
                if (task.priority) {
                    let priorityClass = 'badge-priority';
                    if (task.priority === 'High Priority') priorityClass += ' badge-high';
                    else if (task.priority === 'Medium Priority') priorityClass += ' badge-medium';
                    else if (task.priority === 'Low Priority') priorityClass += ' badge-low';
                    priorityBadge = `<span class="${priorityClass}">${task.priority}</span>`;
                }
                // Assignee avatar
                let assigneeHtml = '';
                if (task.users) {
                    assigneeHtml = `<img src="${task.users.avatar_url || '/taskedout-frontend/assets/images/user_avatar.png'}" alt="${task.users.username}" class="task-assignee-avatar" /> <span>${task.users.username}</span>`;
                } else {
                    assigneeHtml = '<span>Unassigned</span>';
                }
                // Card HTML
                card.innerHTML = `
                    <div class="task-card-header">
                        <a class="task-title" href="#">${task.title}</a>
                    </div>
                    <div class="task-card-desc">${task.description || ''}</div>
                    <div class="task-card-badges">
                        ${statusBadge} ${priorityBadge}
                        <span class="task-card-deadline">Due: ${task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</span>
                    </div>
                    <div class="task-card-assignee">${assigneeHtml}</div>
                `;
                tasksGrid.appendChild(card);
            });
        });
    }

    // 4. Main render function
    async function renderAllTasks() {
        const tasks = await fetchAllTasksWithTeams();
        renderTasksByTeam(tasks);
    }

    // 5. Call on load
    renderAllTasks();

    // TODO: Add real-time subscription and sidebar rendering
});
