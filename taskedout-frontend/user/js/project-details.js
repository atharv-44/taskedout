// User Project Details Page - Real-time, Read-Only Integration

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  if (!projectId) return;

  // Profile: Fetch and display user info in header
  async function fetchAndDisplayUserProfile() {
    const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
    if (userError || !user) return null;
    const userId = user.id;
    const { data: userProfile, error: profileError } = await window.supabaseClient
      .from('users')
      .select('username, avatar_url, role')
      .eq('id', userId)
      .single();
    if (profileError || !userProfile) return null;
    // Set avatar
    const avatarImg = document.getElementById('pd-user-avatar');
    if (avatarImg) avatarImg.src = userProfile.avatar_url || '../../assets/images/user_avatar.png';
    // Set username
    const usernameEl = document.getElementById('pd-user-username');
    if (usernameEl) usernameEl.textContent = userProfile.username || 'User';
    // Set role
    const roleEl = document.getElementById('pd-user-role');
    if (roleEl) roleEl.textContent = userProfile.role || 'Member';
    return userId;
  }

  // Elements
  const titleEl = document.querySelector('.pd-project-title');
  const descEl = document.querySelector('.pd-project-desc');
  const statusEl = document.querySelector('.pd-status-value');
  const timelineEl = document.querySelector('.pd-timeline-value');
  const locationEl = document.querySelector('.pd-location-value');
  const filesListEl = document.getElementById('files-list');
  const teamListEl = document.getElementById('team-list');
  const timelineListEl = document.getElementById('timeline-list');
  const tasksListEl = document.getElementById('tasks-list');
  const groupByEl = document.querySelector('.pd-tasks-group-by');
  const filterEl = document.querySelector('.pd-tasks-filter');
  // Progress
  const overallProgressBar = document.getElementById('overall-progress-bar');
  const overallProgressPercent = document.getElementById('overall-progress-percent');
  const designProgressBar = document.getElementById('design-progress-bar');
  const designProgressPercent = document.getElementById('design-progress-percent');
  const devProgressBar = document.getElementById('dev-progress-bar');
  const devProgressPercent = document.getElementById('dev-progress-percent');
  const qaProgressBar = document.getElementById('qa-progress-bar');
  const qaProgressPercent = document.getElementById('qa-progress-percent');
  const tasksCompletedStats = document.getElementById('tasks-completed-stats');
  const overdueTasksStats = document.getElementById('overdue-tasks-stats');

  // --- FILE UPLOAD & DOWNLOAD LOGIC (USER) ---
  const uploadBtn = document.querySelector('.pd-files-upload-btn');
  const fileInput = document.getElementById('file-input');
  const dropZone = document.querySelector('.pd-files-drop');

  // Handle file upload
  async function handleFileUpload(files) {
    if (!files || files.length === 0) return;
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
      alert(`Error uploading file: ${uploadError.error.message}`);
    } else {
      const files = await fetchFiles();
      renderFiles(files);
    }
  }

  // Drag-and-drop events
  if (dropZone && fileInput && uploadBtn) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    });
    dropZone.addEventListener('click', () => fileInput.click());
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileUpload(e.target.files);
        fileInput.value = '';
      }
    });
  }

  // Download file
  filesListEl.addEventListener('click', async (e) => {
    const downloadBtn = e.target.closest('.pd-file-download');
    if (downloadBtn) {
      const fileName = downloadBtn.getAttribute('data-filename');
      if (!fileName) return;
      const { data, error } = await window.supabaseClient.storage.from('project-files').download(`${projectId}/${fileName}`);
      if (error) {
        alert('Error downloading file: ' + error.message);
        return;
      }
      // Create a blob URL and trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  });

  // Fetch Project
  async function fetchProject() {
    const { data, error } = await window.supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (error || !data) {
      return null;
    }
    return data;
  }

  // Check if user is a member of the project
  async function isUserProjectMember(userId) {
    const { data, error } = await window.supabaseClient
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    if (error || !data) return false;
    return true;
  }

  // Fetch Tasks (use project_tasks like admin)
  async function fetchTasks() {
    const { data, error } = await window.supabaseClient
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId);
    if (error) return [];
    return data;
  }

  // Fetch Team
  async function fetchTeam() {
    const { data, error } = await window.supabaseClient
      .from('project_members')
      .select('id, role, users ( id, username, avatar_url )')
      .eq('project_id', projectId);
    if (error) return [];
    return data;
  }

  // Fetch Timeline
  async function fetchTimeline() {
    const { data, error } = await window.supabaseClient
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('milestone_date', { ascending: true });
    if (error) return [];
    return data;
  }

  // Fetch Files
  async function fetchFiles() {
    const { data: files, error } = await window.supabaseClient.storage
      .from('project-files')
      .list(projectId, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
    if (error) return [];
    return files || [];
  }

  // Render Project
  function renderProject(project) {
    titleEl.textContent = project.title || '';
    descEl.textContent = project.description || '';
    statusEl.textContent = project.status || '-';
    // Timeline summary now set in main render()
    locationEl.textContent = project.location || '-';
  }

  // Render Team
  function renderTeam(members) {
    teamListEl.innerHTML = '';
    if (!members.length) {
      teamListEl.innerHTML = '<li>No team members assigned yet.</li>';
      return;
    }
    members.forEach(member => {
      const user = member.users;
      const li = document.createElement('li');
      li.innerHTML = `
        <img src="${user.avatar_url || 'https://i.pravatar.cc/40?u=' + user.id}" alt="${user.username}" />
        ${user.username}
        <span class="pd-team-role ${member.role.toLowerCase()}">${member.role}</span>
      `;
      teamListEl.appendChild(li);
    });
  }

  // Render Timeline
  function renderTimeline(milestones) {
    timelineListEl.innerHTML = '';
    if (!milestones.length) {
      timelineListEl.innerHTML = '<li style="color:#888;">No timeline events have been added yet.</li>';
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    milestones.forEach(milestone => {
      // Icon selection based on status or title
      let iconHtml = '';
      if (milestone.status === 'done') {
        iconHtml = '<span class="timeline-icon completed"><svg width="24" height="24" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e6ffed"/><path d="M8 12l2.5 2.5L16 9" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      } else if (milestone.status === 'active') {
        iconHtml = '<span class="timeline-icon inprogress"><svg width="24" height="24" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e0e7ff"/><path d="M12 6v6l4 2" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      } else {
        // Upcoming or default
        iconHtml = '<span class="timeline-icon upcoming"><svg width="24" height="24" fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f3f4f6"/><path d="M12 8v4h4" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      }
      // Badge
      let badgeHtml = '';
      if (milestone.status === 'done') {
        badgeHtml = '<span class="timeline-badge completed">Completed</span>';
      } else if (milestone.status === 'active') {
        badgeHtml = '<span class="timeline-badge inprogress">In Progress</span>';
      } else {
        badgeHtml = '<span class="timeline-badge upcoming">Upcoming</span>';
      }
      // Subtext: Today or user task due
      let subtext = '';
      const milestoneDateStr = milestone.milestone_date ? milestone.milestone_date.split('T')[0] : '';
      if (milestoneDateStr === todayStr) {
        subtext = '<div class="timeline-subtext today">Today</div>';
      } else {
        // Check if user has a task due in this phase (if tasks are available in scope)
        if (window.userTasks && Array.isArray(window.userTasks)) {
          const dueTask = window.userTasks.find(t => t.milestone_id === milestone.id && t.deadline);
          if (dueTask) {
            subtext = `<div class="timeline-subtext">Your task due: ${formatDate(dueTask.deadline)}</div>`;
          }
        }
      }
      // Main timeline item
      const li = document.createElement('li');
      li.className = `timeline-item ${milestone.status}`;
      li.innerHTML = `
        <div class="timeline-left">
          ${iconHtml}
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <div class="timeline-date">${formatDate(milestone.milestone_date)}</div>
          <div class="timeline-title">${milestone.title}</div>
          ${subtext}
          ${milestone.description ? `<div class="timeline-desc">${milestone.description}</div>` : ''}
        </div>
        <div class="timeline-status">${badgeHtml}</div>
      `;
      timelineListEl.appendChild(li);
    });
  }

  // Render Files
  function renderFiles(files) {
    filesListEl.innerHTML = '';
    if (!files.length) {
      filesListEl.innerHTML = '<li>No files uploaded yet.</li>';
      return;
    }
    files.forEach(file => {
      const li = document.createElement('li');
      const extension = file.name.split('.').pop().toLowerCase();
      let iconClass = 'doc';
      if (["png","jpg","jpeg","gif","svg"].includes(extension)) iconClass = 'img';
      else if (extension === 'pdf') iconClass = 'pdf';
      li.innerHTML = `
        <span class="pd-file-icon ${iconClass}"></span>
        ${file.name}
        <span class="pd-file-size">${formatBytes(file.metadata?.size)}${file.created_at ? ' • ' + formatDate(file.created_at) : ''}</span>
        <button class="pd-file-download" data-filename="${file.name}" title="Download"></button>
      `;
      filesListEl.appendChild(li);
    });
  }

  // Render Progress (admin logic)
  function renderProgress(tasks) {
    if (!tasks.length) {
      overallProgressBar.style.width = '0%';
      overallProgressPercent.textContent = '0%';
      designProgressBar.style.width = '0%';
      designProgressPercent.textContent = '0%';
      devProgressBar.style.width = '0%';
      devProgressPercent.textContent = '0%';
      qaProgressBar.style.width = '0%';
      qaProgressPercent.textContent = '0%';
      tasksCompletedStats.textContent = '0/0';
      overdueTasksStats.textContent = '0';
      // Also update summary card progress bar
      document.querySelector('.pd-summary-card .pd-progress-bar-inner').style.width = '0%';
      return;
    }
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Completed').length;
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    // Team-specific
    const teams = ['Design', 'Development', 'QA'];
    const teamProgress = {};
    teams.forEach(teamName => {
      const teamTasks = tasks.filter(t => t.team === teamName);
      const completedTeamTasks = teamTasks.filter(t => t.status === 'Completed').length;
      teamProgress[teamName] = teamTasks.length > 0 ? Math.round((completedTeamTasks / teamTasks.length) * 100) : 0;
    });
    overallProgressPercent.textContent = `${overallProgress}%`;
    overallProgressBar.style.width = `${overallProgress}%`;
    designProgressPercent.textContent = `${teamProgress['Design']}%`;
    designProgressBar.style.width = `${teamProgress['Design']}%`;
    devProgressPercent.textContent = `${teamProgress['Development']}%`;
    devProgressBar.style.width = `${teamProgress['Development']}%`;
    qaProgressPercent.textContent = `${teamProgress['QA']}%`;
    qaProgressBar.style.width = `${teamProgress['QA']}%`;
    tasksCompletedStats.textContent = `${completedTasks}/${totalTasks}`;
    overdueTasksStats.textContent = overdueTasks;
    // Also update summary card progress bar
    document.querySelector('.pd-summary-card .pd-progress-bar-inner').style.width = `${overallProgress}%`;
  }

  // Render My Tasks and My Progress for the current user
  function renderUserTasksAndProgress(tasks, userId) {
    let myTasks = tasks.filter(t => t.assignee_id === userId);
    const myTasksList = document.getElementById('user-my-tasks-list');
    const filterSelect = document.getElementById('my-tasks-filter-select');
    const filterBtn = document.getElementById('my-tasks-filter-btn');
    if (!myTasksList) return;

    // Show/hide filter dropdown on button click
    if (filterBtn && filterSelect) {
      const filterWrap = filterBtn.closest('.my-tasks-filter-wrap');
      filterBtn.onclick = function(e) {
        e.stopPropagation();
        filterSelect.classList.toggle('show');
        if (filterWrap) filterWrap.classList.toggle('filter-active', filterSelect.classList.contains('show'));
      };
      // Hide dropdown when clicking outside or on dropdown
      function hideDropdown() {
        filterSelect.classList.remove('show');
        if (filterWrap) filterWrap.classList.remove('filter-active');
      }
      filterSelect.onchange = function() { hideDropdown(); };
      document.addEventListener('click', function(e) {
        if (!filterBtn.contains(e.target) && !filterSelect.contains(e.target)) {
          hideDropdown();
        }
      });
    }

    // Filtering logic
    function applyFilter() {
      let filtered = myTasks;
      const filter = filterSelect ? filterSelect.value : 'all';
      if (filter === 'todo') filtered = myTasks.filter(t => t.status !== 'Completed' && t.status !== 'In Progress');
      else if (filter === 'inprogress') filtered = myTasks.filter(t => t.status === 'In Progress');
      else if (filter === 'done') filtered = myTasks.filter(t => t.status === 'Completed');
      renderTaskCards(filtered);
    }

    // Render tasks as cards
    function renderTaskCards(tasksToRender) {
      myTasksList.innerHTML = '';
      if (!tasksToRender.length) {
        myTasksList.innerHTML = '<div class="no-tasks">No tasks assigned to you for this project.</div>';
        return;
      }
      tasksToRender.forEach(task => {
        const card = document.createElement('div');
        card.className = 'my-task-card';
        // Status dropdown (styled as badge)
        const statusOptions = [
          { value: 'Not Started', label: 'Not Started' },
          { value: 'In Progress', label: 'In Progress' },
          { value: 'In Review', label: 'In Review' }
        ];
        let statusDropdown = `<select class="my-task-status-dropdown" data-task-id="${task.id}" ${task.status === 'Completed' ? 'disabled' : ''}>`;
        statusOptions.forEach(opt => {
          statusDropdown += `<option value="${opt.value}" ${task.status === opt.value ? 'selected' : ''}>${opt.label}</option>`;
        });
        statusDropdown += '</select>';
        // Priority badge (optional)
        let priorityBadge = '';
        if (task.priority) priorityBadge = `<span class="my-task-priority ${task.priority.toLowerCase()}">${task.priority}</span>`;
        // Comments (stubbed as 0 for now)
        let comments = 0;
        // Card inner HTML
        card.innerHTML = `
          <div class="my-task-main-row">
            <input type="checkbox" class="my-task-checkbox" ${task.status === 'Completed' ? 'checked' : ''} data-task-id="${task.id}" ${task.status !== 'In Review' ? 'disabled' : ''}/>
            <div class="my-task-info">
              <div class="my-task-title-row">
                <span class="my-task-title${task.status === 'Completed' ? ' my-task-completed' : ''}">${task.title}</span>
                <span class="my-task-status-badge">${statusDropdown}</span>
                ${priorityBadge}
              </div>
              <div class="my-task-desc">${task.description || ''}</div>
              <div class="my-task-meta-row">
                <span class="my-task-due">${task.deadline ? 'Due: ' + formatDate(task.deadline) : ''}</span>
                <span class="my-task-comments">${comments} comments</span>
                <a href="#" class="my-task-add-note">Add note</a>
              </div>
            </div>
          </div>
        `;
        myTasksList.appendChild(card);
      });
      // Add status dropdown event listeners
      myTasksList.querySelectorAll('.my-task-status-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', async function() {
          const taskId = this.getAttribute('data-task-id');
          const newStatus = this.value;
          await window.supabaseClient.from('project_tasks').update({ status: newStatus }).eq('id', taskId);
          // Re-fetch tasks and re-render
          const updatedTasks = await fetchTasks();
          renderUserTasksAndProgress(updatedTasks, userId);
        });
      });
      // Add checkbox event listeners
      myTasksList.querySelectorAll('.my-task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', async function() {
          const taskId = this.getAttribute('data-task-id');
          const newStatus = this.checked ? 'Completed' : 'In Review';
          await window.supabaseClient.from('project_tasks').update({ status: newStatus }).eq('id', taskId);
          // Re-fetch tasks and re-render
          const updatedTasks = await fetchTasks();
          renderUserTasksAndProgress(updatedTasks, userId);
        });
      });
    }

    // Filter event
    if (filterSelect) {
      filterSelect.onchange = applyFilter;
    }

    // Initial render
    applyFilter();

    // Render My Progress (new UI)
    function renderMyProgress(tasks, userId) {
      const myTasks = tasks.filter(t => t.assignee_id === userId);
      const total = myTasks.length;
      const completed = myTasks.filter(t => t.status === 'Completed').length;
      const inprogress = myTasks.filter(t => t.status === 'In Progress').length;
      const notstarted = myTasks.filter(t => t.status === 'Not Started').length;
      // Progress bar
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const bar = document.getElementById('user-progress-bar-inner');
      const completedCount = document.getElementById('user-progress-completed-count');
      if (bar) bar.style.width = percent + '%';
      if (completedCount) completedCount.textContent = `${completed}/${total}`;
      // Stat cards
      const completedEl = document.getElementById('user-tasks-completed');
      const todoEl = document.getElementById('user-tasks-todo');
      const inprogressEl = document.getElementById('user-tasks-inprogress');
      if (completedEl) completedEl.textContent = completed;
      if (todoEl) todoEl.textContent = notstarted;
      if (inprogressEl) inprogressEl.textContent = inprogress;
      // Due soon alert
      const dueAlert = document.getElementById('user-progress-due-alert');
      const dueAlertText = document.getElementById('user-progress-due-alert-text');
      const now = new Date();
      const weekFromNow = new Date(now);
      weekFromNow.setDate(now.getDate() + 7);
      const dueSoon = myTasks.find(t => t.deadline && t.status !== 'Completed' && new Date(t.deadline) >= now && new Date(t.deadline) <= weekFromNow);
      if (dueSoon && dueAlert && dueAlertText) {
        dueAlert.style.display = '';
        dueAlertText.textContent = `You have 1 task due this week`;
      } else if (dueAlert) {
        dueAlert.style.display = 'none';
      }
      // Next due task preview (detailed)
      const nextDueEl = document.getElementById('user-progress-next-due');
      const nextDue = myTasks
        .filter(t => t.deadline && t.status !== 'Completed')
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
      if (nextDue && nextDueEl) {
        nextDueEl.style.display = '';
        let timeLeft = '';
        const dueDate = new Date(nextDue.deadline);
        const nowDate = new Date();
        const diffDays = Math.ceil((dueDate - nowDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) timeLeft = `<span class='next-due-timeleft'>in ${diffDays} day${diffDays > 1 ? 's' : ''}</span>`;
        else if (diffDays === 0) timeLeft = `<span class='next-due-timeleft'>due today</span>`;
        else timeLeft = `<span class='next-due-timeleft overdue'>overdue by ${-diffDays} day${-diffDays > 1 ? 's' : ''}</span>`;
        nextDueEl.innerHTML = `
          <span class="next-due-title">Next Due:</span>
          <span style="font-weight:700;color:#154387;">${nextDue.title}</span>
          <span class="next-due-date">${formatDate(nextDue.deadline)}</span>
          ${timeLeft}
          ${nextDue.description ? `<div class='next-due-desc'>${nextDue.description}</div>` : ''}
          <div class='next-due-badges'>
            <span class='next-due-status'>${nextDue.status}</span>
            ${nextDue.priority ? `<span class='next-due-priority'>${nextDue.priority}</span>` : ''}
          </div>
        `;
      } else if (nextDueEl) {
        nextDueEl.style.display = 'none';
      }
      // Motivational message if all tasks completed
      const motivationEl = document.getElementById('user-progress-motivation');
      if (completed === total && total > 0 && motivationEl) {
        motivationEl.style.display = '';
        motivationEl.textContent = 'All tasks completed! 🎉';
      } else if (motivationEl) {
        motivationEl.style.display = 'none';
      }
      // Recent activity list (last 3 actions) - REMOVED
      const activityListEl = document.getElementById('user-progress-activity-list');
      if (activityListEl) {
        activityListEl.style.display = 'none';
      }
      
      // Last activity (keep for subtlety) - REMOVED
      const lastActivityEl = document.getElementById('user-progress-last-activity');
      if (lastActivityEl) {
        lastActivityEl.style.display = 'none';
      }
    }

    // In renderUserTasksAndProgress, call renderMyProgress at the end
    renderMyProgress(tasks, userId);
  }

  // Helpers
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
  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} day(s) ago`;
    return date.toLocaleDateString();
  }

  // Main Render
  async function render() {
    const userId = await fetchAndDisplayUserProfile();
    if (!userId) return;
    // Check membership
    const isMember = await isUserProjectMember(userId);
    const project = await fetchProject();
    if (!isMember || !project) {
      // Show project not found and clear all fields
      titleEl.textContent = 'Project not found';
      descEl.textContent = '';
      statusEl.textContent = '';
      timelineEl.textContent = '';
      locationEl.textContent = '';
      overallProgressBar.style.width = '0%';
      overallProgressPercent.textContent = '0%';
      designProgressBar.style.width = '0%';
      designProgressPercent.textContent = '0%';
      devProgressBar.style.width = '0%';
      devProgressPercent.textContent = '0%';
      qaProgressBar.style.width = '0%';
      qaProgressPercent.textContent = '0%';
      tasksCompletedStats.textContent = '0/0';
      overdueTasksStats.textContent = '0';
      tasksListEl.innerHTML = '<tr><td colspan="7">No tasks found.</td></tr>';
      teamListEl.innerHTML = '<li>No team members assigned yet.</li>';
      timelineListEl.innerHTML = '<li>No timeline events have been added yet.</li>';
      filesListEl.innerHTML = '<li>No files uploaded yet.</li>';
      document.querySelector('.pd-summary-card .pd-progress-bar-inner').style.width = '0%';
      return;
    }
    // If member, render as before
    renderProject(project);
    const [tasks, team, timeline, files] = await Promise.all([
      fetchTasks(),
      fetchTeam(),
      fetchTimeline(),
      fetchFiles()
    ]);
    // Set timeline summary based on project deadline
    if (project.deadline) {
      timelineEl.textContent = formatDate(project.deadline);
    } else {
      timelineEl.textContent = 'No deadline set';
    }
    // renderTasks(tasks); // <-- Tasks rendering removed
    renderTeam(team);
    renderTimeline(timeline);
    renderFiles(files);
    renderProgress(tasks);
    renderUserTasksAndProgress(tasks, userId);
  }

  // Real-time listeners (optional, if Supabase supports it for your plan)
  // You can add real-time listeners here if needed for live updates

  // Initial render
  render();

  // Optionally, re-render on filter/group changes
  // (implement if you want to support filtering/grouping for users)
}); 