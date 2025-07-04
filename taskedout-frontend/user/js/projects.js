// taskedout-frontend/user/js/projects.js

// Fetch and render projects for the logged-in user

document.addEventListener('DOMContentLoaded', async function () {
  const projectsList = document.querySelector('.projects-list');
  if (!projectsList) return;

  // Show loading spinner
  projectsList.innerHTML = '<div class="loading">Loading projects...</div>';

  // Get user from Supabase auth
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    projectsList.innerHTML = '<div class="error">You must be logged in to view projects.</div>';
    return;
  }

  // Fetch projects for the user
  let { data: projects, error } = await supabaseClient
    .from('projects')
    .select('id, title, deadline, status')
    .order('deadline', { ascending: true });

  if (error) {
    projectsList.innerHTML = '<div class="error">Failed to load projects.</div>';
    return;
  }

  if (!projects || projects.length === 0) {
    projectsList.innerHTML = '<div class="empty">No projects assigned to you.</div>';
    return;
  }

  // Render projects
  projectsList.innerHTML = '';
  projects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card project-card-flex';
    card.innerHTML = `
      <div>
        <div class="project-title">${project.title}</div>
        <div class="project-details">Due: ${project.deadline || 'N/A'} | Status: ${project.status}</div>
      </div>
      <button class="view-project-btn" data-project-id="${project.id}">View Project</button>
    `;
    projectsList.appendChild(card);
  });

  // Add click handler for View Project (to be implemented)
  projectsList.addEventListener('click', function (e) {
    if (e.target.classList.contains('view-project-btn')) {
      const projectId = e.target.getAttribute('data-project-id');
      window.location.href = '../html/project_details.html?id=' + encodeURIComponent(projectId);
    }
  });
}); 