document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  console.log('Project ID:', projectId);
  if (!projectId) return;

  const titleEl = document.querySelector('.pd-project-title');
  const descEl = document.querySelector('.pd-project-desc');
  const statusEl = document.querySelector('.pd-status-select');
  const timelineEl = document.querySelectorAll('.pd-meta-block')[1].querySelector('.pd-meta-value');
  const locationEl = document.querySelectorAll('.pd-meta-block')[2].querySelector('.pd-meta-value');
  const filesListEl = document.getElementById('files-list');
  const uploadBtn = document.querySelector('.pd-files-upload-btn');
  const fileInput = document.getElementById('file-input');
  const dropZone = document.querySelector('.pd-files-drop');
  const teamListEl = document.getElementById('team-list');
  const addMemberBtn = document.querySelector('.pd-team-add-btn');
  const editBtn = document.querySelector('.pd-edit-btn');
  const moreBtn = document.querySelector('.pd-more-btn');
  const locationSelectEl = document.querySelector('.pd-location-select');
  const timelineListEl = document.getElementById('timeline-list');
  const addMilestoneBtn = document.querySelector('.pd-timeline-add-btn');
  const addTaskBtn = document.querySelector('.pd-tasks-add-btn');
  const tasksListEl = document.getElementById('tasks-list');
  const groupByEl = document.querySelector('.pd-tasks-group-by');

  const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed'];
  const LOCATION_OPTIONS = ['Not Set', 'On Site', 'Off Site', 'Client Site'];
  const ROLE_OPTIONS = ['PM', 'Design', 'Dev', 'QA', 'Stakeholder'];

  let allProjectTasks = []; // Cache for all tasks related to the project

  async function fetchProject() {
    const { data, error } = await window.supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (error || !data) {
      console.error('Error fetching project:', error);
      titleEl.textContent = 'Project not found';
      descEl.textContent = '';
      statusEl.innerHTML = '';
      timelineEl.textContent = '';
      locationEl.textContent = '';
      return null;
    }
    console.log('Fetched project:', data);
    return data;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async function renderFiles() {
    filesListEl.innerHTML = '<li>Loading files...</li>';

    const { data: files, error } = await window.supabaseClient.storage
        .from('project-files')
        .list(projectId, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
        console.error('Error listing files:', error);
        filesListEl.innerHTML = '<li>Error loading files.</li>';
        return;
    }
    if (!files || files.length === 0) {
        filesListEl.innerHTML = '<li>No files uploaded yet.</li>';
        return;
    }

    filesListEl.innerHTML = '';
    files.forEach(file => {
        const fileLi = document.createElement('li');
        const extension = file.name.split('.').pop().toLowerCase();
        let iconClass = 'doc';
        if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(extension)) iconClass = 'img';
        else if (extension === 'pdf') iconClass = 'pdf';

        fileLi.innerHTML = `
            <span class="pd-file-icon ${iconClass}"></span> 
            ${file.name} 
            <span class="pd-file-size">${formatBytes(file.metadata.size)} • ${new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> 
            <button class="pd-file-download" data-filename="${file.name}"></button>
            <button class="pd-file-delete" data-filename="${file.name}">&times;</button>
        `;
        filesListEl.appendChild(fileLi);
    });
  }

  async function handleFileUpload(files) {
    uploadBtn.textContent = 'Uploading...';
    uploadBtn.disabled = true;

    const uploadPromises = Array.from(files).map(file => {
        const filePath = `${projectId}/${file.name}`;
        return window.supabaseClient.storage.from('project-files').upload(filePath, file, { cacheControl: '3600', upsert: true });
    });

    const results = await Promise.all(uploadPromises);
    uploadBtn.textContent = 'Upload Files';
    uploadBtn.disabled = false;

    const uploadError = results.find(result => result.error);
    if (uploadError) {
        console.error('Error uploading file:', uploadError.error.message);
        alert(`Error uploading file: ${uploadError.error.message}`);
    } else {
        await renderFiles();
    }
  }

  async function renderTeamMembers() {
    teamListEl.innerHTML = '<li>Loading team...</li>';
    const { data: members, error } = await window.supabaseClient
        .from('project_members')
        .select(`
            id,
            role,
            users ( id, username, avatar_url )
        `)
        .eq('project_id', projectId);

    if (error) {
        console.error('Error fetching team members:', error);
        teamListEl.innerHTML = '<li>Error loading team members.</li>';
        return;
    }

    if (!members || members.length === 0) {
        teamListEl.innerHTML = '<li>No team members assigned yet.</li>';
        return;
    }
    
    teamListEl.innerHTML = '';
    members.forEach(member => {
        const memberLi = document.createElement('li');
        memberLi.dataset.memberId = member.id;
        const user = member.users;

        memberLi.innerHTML = `
            <img src="${user.avatar_url || 'https://i.pravatar.cc/40?u=' + user.id}" alt="${user.username}" />
            ${user.username}
            <span class="pd-team-role ${member.role.toLowerCase()}">${member.role}</span>
            <button class="pd-member-remove-btn" data-member-id="${member.id}">&times;</button>
        `;
        teamListEl.appendChild(memberLi);
    });
  }

  async function updateProject(fields, showSuccessAlert = true) {
    const { error } = await window.supabaseClient
        .from('projects')
        .update(fields)
        .eq('id', projectId);

    if (error) {
        Swal.fire('Error!', `Failed to update project: ${error.message}`, 'error');
        return false;
    } 
    
    if (showSuccessAlert) {
        Swal.fire('Success!', 'Project details have been updated.', 'success');
    }
    await render();
    return true;
  }

  async function renderTimeline() {
    timelineListEl.innerHTML = '<li>Loading timeline...</li>';
    const { data: milestones, error } = await window.supabaseClient
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('milestone_date', { ascending: true });

    if (error) {
        console.error('Error fetching milestones:', error);
        timelineListEl.innerHTML = '<li>Error loading timeline.</li>';
        return;
    }

    if (!milestones || milestones.length === 0) {
        timelineListEl.innerHTML = '<li>No timeline events have been added yet.</li>';
        return;
    }

    timelineListEl.innerHTML = '';
    milestones.forEach(milestone => {
        const milestoneLi = document.createElement('li');
        milestoneLi.className = milestone.status; // 'done', 'active', or 'upcoming'
        milestoneLi.dataset.milestoneId = milestone.id; // Add ID for click events
        milestoneLi.innerHTML = `
            <span class="pd-timeline-dot ${milestone.status}"></span>
            <div>
                <b>${milestone.title}</b><br/>
                <span>${new Date(milestone.milestone_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><br/>
                <span>${milestone.description || ''}</span>
            </div>
            <button class="pd-milestone-delete-btn" data-milestone-id="${milestone.id}">&times;</button>
        `;
        timelineListEl.appendChild(milestoneLi);
    });
  }

  async function openMilestoneModal(milestone = null) {
    const isEditing = milestone !== null;
    const milestoneStatusOptions = ['done', 'active', 'upcoming'];

    const swalResult = await Swal.fire({
        title: isEditing ? 'Edit Milestone' : 'Add New Milestone',
        html: `
            <div class="swal-form-group">
                <label class="swal-form-label">Title</label>
                <input id="swal-title" class="swal2-input" value="${isEditing ? milestone.title : ''}">
            </div>
            <div class="swal-form-group">
                <label class="swal-form-label">Description</label>
                <textarea id="swal-desc" class="swal2-textarea">${isEditing ? milestone.description : ''}</textarea>
            </div>
            <div class="swal-form-group">
                <label class="swal-form-label">Date</label>
                <input id="swal-date" type="date" class="swal2-input" value="${isEditing ? new Date(milestone.milestone_date).toISOString().split('T')[0] : ''}">
            </div>
            <div class="swal-form-group">
                <label class="swal-form-label">Status</label>
                <select id="swal-status" class="swal2-select">
                    ${milestoneStatusOptions.map(s => `<option value="${s}" ${isEditing && milestone.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
        `,
        customClass: { popup: 'swal-edit-project-modal' },
        focusConfirm: false,
        showCancelButton: true,
        showDenyButton: isEditing,
        confirmButtonText: isEditing ? 'Save Changes' : 'Add Milestone',
        denyButtonText: 'Delete Milestone',
        preConfirm: () => {
            return {
                title: document.getElementById('swal-title').value,
                description: document.getElementById('swal-desc').value,
                milestone_date: document.getElementById('swal-date').value,
                status: document.getElementById('swal-status').value
            };
        }
    });

    if (swalResult.isConfirmed) {
        const formValues = swalResult.value;
        if (isEditing) {
            const { error } = await window.supabaseClient.from('project_milestones').update(formValues).eq('id', milestone.id);
            if (error) Swal.fire('Error!', error.message, 'error');
            else Swal.fire('Success!', 'Milestone updated.', 'success');
        } else {
            const { error } = await window.supabaseClient.from('project_milestones').insert({ ...formValues, project_id: projectId });
            if (error) Swal.fire('Error!', error.message, 'error');
            else Swal.fire('Success!', 'Milestone added.', 'success');
        }
        await renderTimeline();
    } else if (swalResult.isDenied) {
        Swal.fire({
            title: 'Are you sure?',
            text: "This will permanently delete the milestone.",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { error } = await window.supabaseClient.from('project_milestones').delete().eq('id', milestone.id);
                if (error) Swal.fire('Error!', error.message, 'error');
                else Swal.fire('Deleted!', 'Milestone has been deleted.', 'success');
                await renderTimeline();
            }
        });
    }
  }

  async function renderProgress() {
    // 1. Fetch all tasks for the project
    const { data: tasks, error } = await window.supabaseClient
        .from('project_tasks')
        .select('status, deadline, team')
        .eq('project_id', projectId);

    if (error) {
        console.error("Error fetching tasks for progress calculation:", error);
        return;
    }

    // 2. Perform calculations
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Completed').length;
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Team-specific calculations
    const teams = ['Design', 'Development', 'QA'];
    const teamProgress = {};

    teams.forEach(teamName => {
        const teamTasks = tasks.filter(t => t.team === teamName);
        const completedTeamTasks = teamTasks.filter(t => t.status === 'Completed').length;
        teamProgress[teamName] = teamTasks.length > 0 ? Math.round((completedTeamTasks / teamTasks.length) * 100) : 0;
    });

    // 3. Update the DOM
    document.getElementById('overall-progress-percent').textContent = `${overallProgress}%`;
    document.getElementById('overall-progress-bar').style.width = `${overallProgress}%`;
    
    document.getElementById('design-progress-percent').textContent = `${teamProgress['Design']}%`;
    document.getElementById('design-progress-bar').style.width = `${teamProgress['Design']}%`;
    
    document.getElementById('dev-progress-percent').textContent = `${teamProgress['Development']}%`;
    document.getElementById('dev-progress-bar').style.width = `${teamProgress['Development']}%`;
    
    document.getElementById('qa-progress-percent').textContent = `${teamProgress['QA']}%`;
    document.getElementById('qa-progress-bar').style.width = `${teamProgress['QA']}%`;

    document.getElementById('tasks-completed-stats').textContent = `${completedTasks}/${totalTasks}`;
    document.getElementById('overdue-tasks-stats').textContent = overdueTasks;
    
    // Also update the main progress bar in the summary card
    document.querySelector('.pd-summary-card .pd-progress-bar-inner').style.width = `${overallProgress}%`;
  }

  async function renderTasks() {
    // This function now primarily fetches and caches the tasks
    tasksListEl.innerHTML = '<div>Loading tasks...</div>';
    const { data: tasks, error } = await window.supabaseClient
        .from('project_tasks')
        .select(`
            id, title, description, status, priority, deadline, team,
            assignees:project_task_assignees (
                users ( id, username, avatar_url )
            )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching tasks:", error);
        tasksListEl.innerHTML = '<div>Error loading tasks.</div>';
        return;
    }

    allProjectTasks = tasks || [];
    renderGroupedTasks(); // Initial render
  }

  function renderGroupedTasks() {
      const grouping = groupByEl.value; // 'team', 'assignee', or 'status'
      
      if (allProjectTasks.length === 0) {
          tasksListEl.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">No tasks have been created for this project yet.</td></tr>';
          return;
      }

      const tasksByGroup = allProjectTasks.reduce((acc, task) => {
          let key;
          if (grouping === 'assignee') {
              key = task.assignees ? task.assignees.map(a => a.users.username).join(', ') : 'Unassigned';
          } else if (grouping === 'status') {
              key = task.status || 'Not Started';
          } else { // Default to 'team'
              key = task.team || 'Unassigned';
          }
          if (!acc[key]) acc[key] = [];
          acc[key].push(task);
          return acc;
      }, {});

      tasksListEl.innerHTML = '';
      for (const groupName in tasksByGroup) {
          const groupTasks = tasksByGroup[groupName];
          groupTasks.forEach(task => {
              const tr = document.createElement('tr');
              // Status badge
              let statusBadge = '';
              if (task.status) {
                  let statusClass = 'pd-badge-status';
                  if (task.status === 'In Progress') statusClass += ' badge-inprogress';
                  else if (task.status === 'Completed') statusClass += ' badge-done';
                  else statusClass += ' badge-notstarted';
                  statusBadge = `<span class="${statusClass}">${task.status}</span>`;
              }
              // Priority badge
              let priorityBadge = '';
              if (task.priority) {
                  let priorityClass = 'pd-badge-priority';
                  if (task.priority === 'High Priority') priorityClass += ' badge-high';
                  else if (task.priority === 'Medium Priority') priorityClass += ' badge-medium';
                  else if (task.priority === 'Low Priority') priorityClass += ' badge-low';
                  priorityBadge = `<span class="${priorityClass}">${task.priority}</span>`;
              }
              // --- Task Description Tooltip ---
              const descTooltip = task.description ? `data-tippy-content="${task.description.replace(/"/g, '&quot;')}" data-tippy-theme="pd-tooltip"` : '';
              // --- Assignees Avatar Stack ---
              let assigneeHtml = '';
              const assignees = Array.isArray(task.assignees) ? task.assignees.map(a => a.users) : [];
              if (assignees.length > 0) {
                  const maxAvatars = 3;
                  const avatars = assignees.slice(0, maxAvatars).map(a =>
                      `<img class='pd-assignee-avatar' src='${a.avatar_url || 'https://i.pravatar.cc/30?u=' + a.id}' alt='${a.username}' title='${a.username}' />`
                  ).join('');
                  const extraCount = assignees.length - maxAvatars;
                  const plusBadge = extraCount > 0 ? `<span class='pd-assignee-plus'>+${extraCount}</span>` : '';
                  // Tooltip content for all assignees
                  const tooltipContent = `<div class='pd-tooltip-assignees'>${assignees.map(a =>
                    `<div class='pd-tooltip-assignee-row'><img class='pd-tooltip-avatar' src='${a.avatar_url || 'https://i.pravatar.cc/30?u=' + a.id}' alt='${a.username}' /><span>${a.username}</span></div>`
                  ).join('')}</div>`;
                  assigneeHtml = `<div class='pd-assignee-stack' data-tippy-content="${tooltipContent.replace(/"/g, '&quot;')}" data-tippy-theme='pd-tooltip'>${avatars}${plusBadge}</div>`;
              } else {
                  assigneeHtml = `<div class='pd-assignee-stack'><i data-lucide='user'></i> <span style='color:#64748b;'>Unassigned</span></div>`;
              }
              // Team
              const teamHtml = task.team || 'Unassigned';
              // Due Date
              const dueDateHtml = task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
              // --- Delete Button ---
              const deleteBtnHtml = `<button class="pd-task-delete-btn" data-task-id="${task.id}" title="Delete Task"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"25\" height=\"25\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#d90429\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2\"/><line x1=\"10\" y1=\"11\" x2=\"10\" y2=\"17\"/><line x1=\"14\" y1=\"11\" x2=\"14\" y2=\"17\"/></svg></button>`;
              // Table row
              tr.innerHTML = `
                  <td><a class="pd-task-title" href="#" ${descTooltip}>${task.title}</a></td>
                  <td>${teamHtml}</td>
                  <td>${dueDateHtml}</td>
                  <td>${statusBadge}</td>
                  <td>${priorityBadge}</td>
                  <td>${assigneeHtml}</td>
                  <td>${deleteBtnHtml}</td>
              `;
              tr.classList.add('pd-task-row');
              tasksListEl.appendChild(tr);
          });
      }
      // Initialize Tippy.js for tooltips
      if (window.tippy) {
        tippy('.pd-task-title[data-tippy-content]', { theme: 'pd-tooltip', allowHTML: true, placement: 'top', interactive: true });
        tippy('.pd-assignee-stack[data-tippy-content]', { theme: 'pd-tooltip', allowHTML: true, placement: 'top', interactive: true });
      }
  }

  // Add event listener for grouping
  groupByEl.addEventListener('change', renderGroupedTasks);

  // Add real-time subscription for tasks
  window.supabaseClient
      .channel(`project-tasks-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks', filter: `project_id=eq.${projectId}` },
          (payload) => {
              console.log('Task change received!', payload);
              renderTasks(); // Re-fetch and re-render on any change
          }
      )
      .subscribe();

  // --- Add Task Modal & Logic ---
  async function openTaskModal(task = null) {
      const isEditing = task !== null;

      // 1. Fetch project members for the assignee dropdown
      const { data: members, error: membersError } = await window.supabaseClient
          .from('project_members')
          .select('users(id, username)')
          .eq('project_id', projectId);

      if (membersError) {
          Swal.fire('Error', 'Could not fetch project members for the form.', 'error');
          return;
      }
      const assigneeOptions = members.map(m => `<option value="${m.users.id}" ${isEditing && task.assignee_id === m.users.id ? 'selected' : ''}>${m.users.username}</option>`).join('');

      // 2. Define other dropdown options
      const teamOptions = ['Design', 'Development', 'QA', 'Management'].map(t => `<option value="${t}" ${isEditing && task.team === t ? 'selected' : ''}>${t}</option>`).join('');
      const statusOptions = ['Not Started', 'In Progress', 'Completed'].map(s => `<option value="${s}" ${isEditing && task.status === s ? 'selected' : ''}>${s}</option>`).join('');
      const priorityOptions = ['Low Priority', 'Medium Priority', 'High Priority'].map(p => `<option value="${p}" ${isEditing && task.priority === p ? 'selected' : ''}>${p}</option>`).join('');

      // 3. Show the modal
      const swalResult = await Swal.fire({
          title: isEditing ? 'Edit Task' : 'Add New Task',
          html: `
            <form class="swal-task-form-grid">
              <div class="swal-form-group title">
                <label class="swal-form-label">Task Title</label>
                <input id="swal-title" class="swal2-input" placeholder="e.g., Design the landing page" value="${isEditing ? task.title : ''}">
              </div>
              <div class="swal-form-group description">
                <label class="swal-form-label">Description</label>
                <textarea id="swal-desc" class="swal2-textarea" placeholder="Add a more detailed description...">${isEditing ? task.description || '' : ''}</textarea>
              </div>
              <div class="swal-form-group">
                <label class="swal-form-label">Assignee</label>
                <select id="swal-assignee" class="swal2-select">
                  <option value="">Unassigned</option>
                  ${assigneeOptions}
                </select>
              </div>
              <div class="swal-form-group">
                <label class="swal-form-label">Deadline</label>
                <input id="swal-deadline" type="date" class="swal2-input" value="${isEditing && task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''}">
              </div>
              <div class="swal-form-group">
                <label class="swal-form-label">Team</label>
                <select id="swal-team" class="swal2-select">
                  ${teamOptions}
                </select>
              </div>
              <div class="swal-form-group">
                <label class="swal-form-label">Status</label>
                <select id="swal-status" class="swal2-select">
                  ${statusOptions}
                </select>
              </div>
              <div class="swal-form-group priority">
                <label class="swal-form-label">Priority</label>
                <select id="swal-priority" class="swal2-select">
                  ${priorityOptions}
                </select>
              </div>
            </form>
          `,
          customClass: { popup: 'swal-edit-task-modal-modern' },
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: isEditing ? 'Save Changes' : 'Add Task',
          preConfirm: () => {
              const title = document.getElementById('swal-title').value;
              if (!title) {
                  Swal.showValidationMessage(`Task title cannot be empty.`);
              }
              return {
                  title: title,
                  description: document.getElementById('swal-desc').value,
                  assignee_id: document.getElementById('swal-assignee').value || null,
                  team: document.getElementById('swal-team').value,
                  status: document.getElementById('swal-status').value,
                  priority: document.getElementById('swal-priority').value,
                  deadline: document.getElementById('swal-deadline').value || null
              };
          }
      });

      if (swalResult.isConfirmed) {
          const formValues = swalResult.value;
          if (isEditing) {
              // TODO: Add update logic
          } else {
              // 1. Insert new task
              const { data: insertedTasks, error } = await window.supabaseClient
                  .from('project_tasks')
                  .insert({ ...formValues, project_id: projectId })
                  .select('id')
                  .limit(1);

              if (error) {
                  Swal.fire('Error!', `Failed to create task: ${error.message}`, 'error');
              } else {
                  // 2. If assignee selected, insert into project_task_assignees
                  const newTaskId = insertedTasks && insertedTasks[0] && insertedTasks[0].id;
                  if (formValues.assignee_id && newTaskId) {
                      await window.supabaseClient
                          .from('project_task_assignees')
                          .insert({ task_id: newTaskId, user_id: formValues.assignee_id });
                  }
                  const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
                  Toast.fire({ icon: 'success', title: 'New task added!' });
                  await renderTasks(); // Instantly update the list
              }
          }
      }
  }

  async function render() {
    const project = await fetchProject();
    if (!project) return;
    titleEl.textContent = project.title;
    descEl.textContent = project.description || '';
    
    statusEl.innerHTML = STATUS_OPTIONS.map(opt => `<option value="${opt}"${opt === project.status ? ' selected' : ''}>${opt}</option>`).join('');
    statusEl.disabled = false;
    
    const currentLocation = project.location || 'Not Set';
    locationSelectEl.innerHTML = LOCATION_OPTIONS.map(opt => `<option value="${opt}" ${opt === currentLocation ? 'selected' : ''}>${opt}</option>`).join('');

    timelineEl.innerHTML = `<b>${formatDate(project.created_at)} - ${formatDate(project.deadline)}</b>`;

    await renderFiles();
    await renderTeamMembers();
    await renderTimeline();
    await renderProgress();
    await renderTasks();
  }

  render();

  // --- EVENT LISTENERS ---
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileUpload(e.target.files);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files);
  });

  filesListEl.addEventListener('click', async (e) => {
    const target = e.target;
    const filename = target.dataset.filename;
    if (!filename) return;

    if (target.classList.contains('pd-file-download')) {
        target.disabled = true;
        const { data, error } = await window.supabaseClient.storage.from('project-files').download(`${projectId}/${filename}`);
        if (error) {
            alert(`Error downloading file: ${error.message}`);
        } else {
            const a = document.createElement('a');
            const url = URL.createObjectURL(data);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        target.disabled = false;
    }

    if (target.classList.contains('pd-file-delete')) {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete "${filename}"`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#0B2349',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                target.disabled = true;
                const { error } = await window.supabaseClient.storage
                    .from('project-files')
                    .remove([`${projectId}/${filename}`]);

                if (error) {
                    Swal.fire(
                        'Error!',
                        `Failed to delete file: ${error.message}`,
                        'error'
                    );
                } else {
                    Swal.fire(
                        'Deleted!',
                        'Your file has been deleted.',
                        'success'
                    );
                    await renderFiles();
                }
            }
        });
    }
  });

  // --- TEAM MEMBERS EVENT LISTENERS ---

  addMemberBtn.addEventListener('click', async () => {
    // Get current admin's organization
    const { data: { user: currentUser }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !currentUser) {
        Swal.fire('Authentication Error', 'Could not identify current user. Please log in again.', 'error');
        return;
    }

    const { data: admin, error: adminError } = await window.supabaseClient
        .from('admins')
        .select('organization')
        .eq('id', currentUser.id)
        .single();

    if (adminError || !admin) {
        Swal.fire('Error', 'Could not find your user details in the database.', 'error');
        return;
    }
    const adminOrganization = admin.organization;
    if (!adminOrganization) {
        Swal.fire('No Organization', 'Your user profile does not have an organization assigned.', 'warning');
        return;
    }

    // First, get user IDs of members already in the project
    const { data: existingMembers, error: existingMembersError } = await window.supabaseClient
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

    if (existingMembersError) {
        Swal.fire('Error', 'Could not fetch existing members.', 'error');
        return;
    }
    const existingMemberIds = existingMembers.map(m => m.user_id);

    // Now, get all users from the same organization who are NOT already in the project
    const { data: availableUsers, error: usersError } = await window.supabaseClient
        .from('users')
        .select('id, username')
        .eq('userOrganization', adminOrganization)
        .not('id', 'in', `(${existingMemberIds.join(',')})`);
    
    if (usersError) {
        Swal.fire('Error', 'Could not fetch available users from your organization.', 'error');
        return;
    }

    if (availableUsers.length === 0) {
        Swal.fire('No Users Available', 'All users from your organization are already assigned to this project.', 'info');
        return;
    }

    const userOptions = `<option value="" disabled selected>Select User</option>` + availableUsers.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
    const roleOptions = `<option value="" disabled selected>Select Role</option>` + ROLE_OPTIONS.map(r => `<option value="${r}">${r}</option>`).join('');

    const { value: formValues } = await Swal.fire({
        title: 'Add New Member',
        html: `
            <div class="swal-form-group">
                <label for="swal-user" class="swal-form-label">Select Member</label>
                <select id="swal-user" class="swal2-select">${userOptions}</select>
            </div>
            <div class="swal-form-group">
                <label for="swal-role" class="swal-form-label">Select Role</label>
                <select id="swal-role" class="swal2-select">${roleOptions}</select>
            </div>
        `,
        customClass: { popup: 'swal-edit-project-modal' },
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Add Member',
        preConfirm: () => {
            return {
                user_id: document.getElementById('swal-user').value,
                role: document.getElementById('swal-role').value
            };
        }
    });

    if (formValues) {
        const { error } = await window.supabaseClient
            .from('project_members')
            .insert({
                project_id: projectId,
                user_id: formValues.user_id,
                role: formValues.role
            });

        if (error) {
            Swal.fire('Error', `Failed to add member: ${error.message}`, 'error');
        } else {
            Swal.fire('Success', 'New member has been added.', 'success');
            await renderTeamMembers();
        }
    }
  });

  teamListEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('pd-member-remove-btn')) {
        const memberId = e.target.dataset.memberId;
        
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, remove member!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { error } = await window.supabaseClient
                    .from('project_members')
                    .delete()
                    .eq('id', memberId);
                
                if (error) {
                    Swal.fire('Error', `Failed to remove member: ${error.message}`, 'error');
                } else {
                    Swal.fire('Removed!', 'The member has been removed from the project.', 'success');
                    await renderTeamMembers();
                }
            }
        });
    }
  });

  // --- EDIT and STATUS LISTENERS ---

  statusEl.addEventListener('change', async (e) => {
    const newStatus = e.target.value;
    const { error } = await window.supabaseClient
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);
    
    if (error) {
        Swal.fire('Error!', `Failed to update status: ${error.message}`, 'error');
        await render(); // Revert on error
    } else {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
        });
        Toast.fire({
            icon: 'success',
            title: 'Status updated'
        });
    }
  });

  locationSelectEl.addEventListener('change', async (e) => {
    const newLocation = e.target.value === 'Not Set' ? null : e.target.value;
    const { error } = await window.supabaseClient
        .from('projects')
        .update({ location: newLocation })
        .eq('id', projectId);

    if (error) {
        Swal.fire('Error!', `Failed to update location: ${error.message}`, 'error');
        await render(); // Revert on error
    } else {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
        });
        Toast.fire({
            icon: 'success',
            title: 'Location updated'
        });
    }
  });

  editBtn.addEventListener('click', async () => {
    const project = await fetchProject();
    if (!project) return;

    const { value: formValues } = await Swal.fire({
        title: 'Edit Project Details',
        html: `
            <div class="swal-form-group">
                <label for="swal-title" class="swal-form-label">Project Title</label>
                <input id="swal-title" class="swal2-input" value="${project.title}">
            </div>
            <div class="swal-form-group">
                <label for="swal-desc" class="swal-form-label">Description</label>
                <textarea id="swal-desc" class="swal2-textarea">${project.description || ''}</textarea>
            </div>
            <div class="swal-form-group">
                <label for="swal-deadline" class="swal-form-label">Deadline</label>
                <input id="swal-deadline" type="date" class="swal2-input" value="${project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''}">
            </div>
            <div class="swal-form-group">
                <label for="swal-location" class="swal-form-label">Location</label>
                <input id="swal-location" class="swal2-input" value="${project.location || ''}">
            </div>
        `,
        customClass: {
            popup: 'swal-edit-project-modal',
        },
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Save Changes',
        preConfirm: () => {
            return {
                title: document.getElementById('swal-title').value,
                description: document.getElementById('swal-desc').value,
                deadline: document.getElementById('swal-deadline').value || null,
                location: document.getElementById('swal-location').value
            };
        }
    });

    if (formValues) {
        await updateProject(formValues);
    }
  });

  // --- MORE OPTIONS MENU ---
  const menuContent = `
      <div>
          <button id="archive-btn" class="project-menu-button">Archive Project</button>
          <button id="delete-btn" class="project-menu-button delete">Delete Project</button>
      </div>
  `;

  tippy(moreBtn, {
      content: menuContent,
      allowHTML: true,
      interactive: true,
      trigger: 'click',
      placement: 'bottom-end',
      theme: 'project-menu',
      onShow(instance) {
          // Use a timeout to ensure the DOM elements are there
          setTimeout(() => {
              const archiveBtn = instance.popper.querySelector('#archive-btn');
              const deleteBtn = instance.popper.querySelector('#delete-btn');
              
              archiveBtn.addEventListener('click', () => {
                  instance.hide();
                  handleArchiveProject();
              });
              deleteBtn.addEventListener('click', () => {
                  instance.hide();
                  handleDeleteProject();
              });
          }, 10);
      },
  });

  async function handleArchiveProject() {
      Swal.fire({
          title: 'Archive this project?',
          text: "The project will be hidden but not permanently deleted.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, archive it!'
      }).then(async (result) => {
          if (result.isConfirmed) {
              const { error } = await window.supabaseClient
                  .from('projects')
                  .update({ is_archived: true })
                  .eq('id', projectId);

              if (error) {
                  Swal.fire('Error', `Failed to archive project: ${error.message}`, 'error');
              } else {
                  Swal.fire('Archived!', 'The project has been archived.', 'success')
                      .then(() => window.location.href = "projects.html");
              }
          }
      });
  }

  async function handleDeleteProject() {
      Swal.fire({
          title: 'Are you absolutely sure?',
          text: "This action cannot be undone. This will permanently delete the project and all associated files.",
          icon: 'error',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'Yes, delete it forever!'
      }).then(async (result) => {
          if (result.isConfirmed) {
              // 1. Delete all files from storage first
              const { data: files, error: listError } = await window.supabaseClient.storage.from('project-files').list(projectId);
              if (listError) {
                  Swal.fire('Error', `Could not list files for deletion: ${listError.message}`, 'error');
                  return;
              }
              if (files && files.length > 0) {
                  const filePaths = files.map(f => `${projectId}/${f.name}`);
                  const { error: removeError } = await window.supabaseClient.storage.from('project-files').remove(filePaths);
                  if (removeError) {
                      Swal.fire('Error', `Could not delete project files: ${removeError.message}`, 'error');
                      return;
                  }
              }

              // 2. Delete the project record from the database
              const { error: deleteError } = await window.supabaseClient.from('projects').delete().eq('id', projectId);
              if (deleteError) {
                  Swal.fire('Error', `Failed to delete project: ${deleteError.message}`, 'error');
              } else {
                  Swal.fire('Deleted!', 'The project has been permanently deleted.', 'success')
                      .then(() => window.location.href = "projects.html");
              }
          }
      });
  }

  // --- TIMELINE EVENT LISTENERS ---
  addMilestoneBtn.addEventListener('click', () => openMilestoneModal());

  timelineListEl.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.pd-milestone-delete-btn');
    if (deleteBtn) {
        e.stopPropagation(); // Prevent the edit modal from opening
        const milestoneId = deleteBtn.dataset.milestoneId;
        
        Swal.fire({
            title: 'Delete this milestone?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { error } = await window.supabaseClient.from('project_milestones').delete().eq('id', milestoneId);
                if (error) {
                    Swal.fire('Error!', `Failed to delete milestone: ${error.message}`, 'error');
                } else {
                    Swal.fire('Deleted!', 'The milestone has been deleted.', 'success');
                    await renderTimeline();
                }
            }
        });
        return;
    }

    const milestoneLi = e.target.closest('li');
    if (!milestoneLi || !milestoneLi.dataset.milestoneId) return;

    const milestoneId = milestoneLi.dataset.milestoneId;
    const { data: milestone, error } = await window.supabaseClient
        .from('project_milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

    if (error) {
        Swal.fire('Error', `Could not fetch milestone details: ${error.message}`, 'error');
        return;
    }
    openMilestoneModal(milestone);
  });

  // Event Listener for the add task button
  addTaskBtn.addEventListener('click', () => openTaskModal());

  // Add event listener for delete task button
  tasksListEl.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.pd-task-delete-btn');
    if (deleteBtn) {
        const taskId = deleteBtn.dataset.taskId;
        Swal.fire({
            title: 'Delete this task?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Delete assignees first (if any)
                await window.supabaseClient
                    .from('project_task_assignees')
                    .delete()
                    .eq('task_id', taskId);
                // Delete the task
                const { error } = await window.supabaseClient
                    .from('project_tasks')
                    .delete()
                    .eq('id', taskId);
                if (error) {
                    Swal.fire('Error!', `Failed to delete task: ${error.message}`, 'error');
                } else {
                    Swal.fire('Deleted!', 'The task has been deleted.', 'success');
                    await renderTasks(); // Instantly update the list
                }
            }
        });
    }
  });

  async function updateProjectHeaderProfile() {
    if (!window.supabaseClient) return;
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) return;
    const { data: admin, error } = await window.supabaseClient
      .from('admins')
      .select('username, avatar_url, role')
      .eq('id', user.id)
      .single();
    if (error || !admin) return;
    // Update avatar
    const avatarEl = document.getElementById('pd-admin-avatar');
    if (avatarEl) avatarEl.src = admin.avatar_url || '/taskedout-frontend/assets/images/img_avatar.png';
    // Update username
    const usernameEl = document.getElementById('pd-admin-username');
    if (usernameEl) usernameEl.textContent = admin.username || 'Admin';
    // Update role
    const roleEl = document.getElementById('pd-admin-role');
    if (roleEl) roleEl.textContent = (admin.role || 'Admin').toUpperCase();
  }
  await updateProjectHeaderProfile();
}); 