document.addEventListener('DOMContentLoaded', () => {
    // Modal elements
    const projectModal = document.getElementById('project-modal');
    const projectModalBox = document.getElementById('project-modal-box');
    const openProjectModalBtn = document.querySelector('.projects-header-row .new-project-btn');
    console.log('openProjectModalBtn:', openProjectModalBtn);
    const closeProjectModalBtn = document.getElementById('closeProjectModal');
    const projectForm = document.getElementById('projectForm');
    const projectList = document.querySelector('.project-list');

    // Fetch from Supabase
    async function getProjectsFromSupabase() {
        const { data, error } = await window.supabaseClient
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch projects:', error.message);
            return [];
        }

        return data || [];
    }

    // Render all projects
    async function renderProjects() {
        projectList.innerHTML = '';
        const projects = await getProjectsFromSupabase();

        if (!projects || projects.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'no-projects-msg';
            emptyMsg.textContent = 'No projects created yet.';
            projectList.appendChild(emptyMsg);
            return;
        }

        projects.forEach((project) => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <div>
                    <div class="project-title">${project.title}</div>
                    <div class="project-meta">Due: ${project.deadline} | Status: ${project.status}</div>
                </div>
                <div class="project-actions">
                    <button class="view-project-btn" data-project-id="${project.id}">View Project</button>
                    <button class="delete-project-btn" data-project-id="${project.id}" title="Delete Project">
                        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#d90429" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </div>
            `;

            card.querySelector('.view-project-btn').addEventListener('click', () => {
                window.location.href = "../html/project_details.html?id=" + project.id;
            });

            card.querySelector('.delete-project-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const result = await Swal.fire({
                    title: 'Are you sure?',
                    text: 'This action will permanently delete the project!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#0B2349',
                    confirmButtonText: 'Confirm',
                    cancelButtonText: 'Cancel',
                    customClass: {
                        popup: 'swal-inter-font'
                    },
                    didOpen: () => {
                        document.querySelector('.dashboard')?.classList.add('blurred');
                        document.querySelector('.sidebar')?.classList.add('blurred');
                    },
                    willClose: () => {
                        document.querySelector('.dashboard')?.classList.remove('blurred');
                        document.querySelector('.sidebar')?.classList.remove('blurred');
                    }
                });

                if (result.isConfirmed) {
                    const { error } = await window.supabaseClient.from('projects').delete().eq('id', project.id);
                    if (error) {
                        console.error('Delete failed:', error.message);
                    } else {
                        renderProjects();
                    }
                }
            });

            projectList.appendChild(card);
        });
    }

    // Modal open
    if (openProjectModalBtn) {
        openProjectModalBtn.addEventListener('click', () => {
            console.log('New Project button clicked');
            projectModal.style.display = 'flex';
            setTimeout(() => projectModalBox.classList.add('show'), 10);
        });
    }

    // Modal close
    function closeModal() {
        projectModalBox.classList.remove('show');
        setTimeout(() => {
            projectModal.style.display = 'none';
            projectForm.reset();
        }, 200);
    }

    closeProjectModalBtn.addEventListener('click', closeModal);

    // Close modal on outside click
    projectModal.addEventListener('click', function (e) {
        if (e.target === projectModal) closeModal();
    });

    // Prevent modal close on modal box click
    projectModalBox.addEventListener('click', function (e) {
        e.stopPropagation();
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Handle form submission
    projectForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const title = document.getElementById('project-title-input').value;
        const description = document.getElementById('project-desc-input').value;
        const deadline = document.getElementById('project-due-date').value;
        const status = document.getElementById('project-status').value;

        const { error } = await window.supabaseClient.from('projects').insert([
            { title, description, deadline, status }
        ]);

        if (error) {
            console.error('Error creating project:', error.message);
            Swal.fire('Error', 'Could not create project', 'error');
        } else {
            closeModal();
            renderProjects();
        }
    });

    // Initial render
    renderProjects();
});

