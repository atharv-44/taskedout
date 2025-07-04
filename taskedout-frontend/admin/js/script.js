lucide.createIcons();

document.addEventListener('DOMContentLoaded', async function () { // List of pages that do not require authentication
    const publicPages = ['/taskedout-frontend/login.html', '/taskedout-frontend/signup.html', '/taskedout-frontend/index.html'];

    // Check if the current page is public
    if (! publicPages.includes(window.location.pathname)) { // This is a protected page, so check for a session.
        if (!window.supabaseClient) {
            console.error("Supabase client is not initialized.");
            // Redirect to login as a fallback
            window.location.href = "../../login.html";
            return;
        }

        const {data: {
                session
            }, error: sessionError} = await window.supabaseClient.auth.getSession();

        if (sessionError || !session) {
            console.error("No active session found. Redirecting to login.");
            // If no user is signed in, or there's an error, redirect to login.
            window.location.href = "../../login.html";
            return; // Stop the rest of the script from running
        }
    }

    // Sidebar Logic
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger-btn');
    const navLinks = document.querySelectorAll('.navlist-icons li');

    navLinks.forEach(li => {
        const aTag = li.querySelector('.sidebar-link');
        if (aTag && window.location.pathname.endsWith(aTag.getAttribute('href').split('/').pop())) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }

        li.addEventListener('click', function (e) {
            if (e.target !== aTag && ! aTag.contains(e.target)) {
                aTag.click();
            }
        });

        li.style.cursor = 'pointer';
    });

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        overlay.style.display = 'block';
        hamburger.setAttribute('aria-expanded', 'true');
        document.body.classList.add('no-scroll');
        setTimeout(() => window.lucide && lucide.createIcons(), 10);
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('no-scroll');
        setTimeout(() => overlay.style.display = 'none', 300);
    }

    if (sidebar && overlay && hamburger) {
        hamburger.addEventListener('click', openSidebar);
        overlay.addEventListener('click', closeSidebar);
        navLinks.forEach(link => link.addEventListener('click', closeSidebar));
        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) 
                closeSidebar();
            


        });
    }

    // Modal Logic
    const modal = document.getElementById("modal");
    const modalBtn = document.getElementById("modal-btn");
    const closeModal = document.getElementById("closeModal");

    modalBtn ?. addEventListener("click", () => modal.style.display = "flex");
    closeModal ?. addEventListener("click", () => modal.style.display = "none");
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") 
            modal.style.display = "none";
        


    });

    // 👇 Dynamic Dropdown Logic
    // IMPORTANT: Ensure `window.supabaseClient` is available here
    if (window.supabaseClient) {
        // Add a check to ensure it's defined
        // Add function to check if user is admin
        const dropdown = document.getElementById("assignees");

        async function populateDropdownWithSameOrgUsers() { // 1. Get the current Supabase Auth user
            const {data: {
                    user
                }, error: authError} = await window.supabaseClient.auth.getUser();
            if (authError || !user) {
                console.error("❌ Failed to get current user:", authError ?. message);
                return;
            }

            // 2. Fetch the admin's organization from the 'admins' table
            const {data: adminData, error: adminError} = await window.supabaseClient.from('admins').select('organization').eq('id', user.id).single();

            if (adminError || !adminData) {
                console.error("❌ Failed to fetch admin organization:", adminError ?. message);
                return;
            }

            const organization = adminData.organization;

            // 3. Fetch users with the same organization
            const {data: users, error: usersError} = await window.supabaseClient.from('users').select('id, username').eq('userOrganization', organization);

            if (usersError) {
                console.error("❌ Cannot fetch users:", usersError.message);
                return;
            }

            // 4. Populate dropdown
            //dropdown.innerHTML = ''; // Clear previous options


            users.forEach(user => {
                const option = document.createElement("option");
                option.value = user.id;
                option.textContent = user.username;
                dropdown.appendChild(option);
            });
        }

        populateDropdownWithSameOrgUsers();


        // 👇 Assign Task Logic
        document.getElementById("assignBtn").addEventListener("click", async (e) => {
            e.preventDefault();
            // Prevent form submission

            // Check if user is admin first
            const isAdmin = await checkIfAdmin();
            if (! isAdmin) {
                alert("❌ Only administrators can create tasks.");
                return;
            }

            const title = document.getElementById("title").value.trim();
            const description = document.getElementById("desc").value.trim();
            const assignedUserId = dropdown.value;
            const deadline = document.getElementById("due-date").value;
            const taskStatus = document.getElementById("taskStatus").value;

            // Validate required fields
            if (! title || ! assignedUserId || ! deadline) {
                alert("❗ Please fill out all required fields (Title, Assignee, and Deadline).");
                return;
            }

            try {
                const {data, error} = await window.supabaseClient.from('tasks').insert({
                    title,
                    description,
                    assignee_id: assignedUserId, // Changed from assignees array to single assignee_id
                    deadline,
                    status: taskStatus
                });

                if (error) 
                    throw error;
                


                // Clear form
                document.getElementById("title").value = "";
                document.getElementById("desc").value = "";
                dropdown.value = "";
                document.getElementById("due-date").value = "";
                document.getElementById("taskStatus").value = "not started";

                // Close modal
                modal.style.display = "none";

                alert("✅ Task assigned successfully!");

                // Optionally reload the tasks table if it exists
                // You can add code here to refresh the tasks list

            } catch (err) {
                console.error("❌ Error assigning task:", err.message);
                alert("Error assigning task: " + err.message);
            }
        });
    } else {
        console.error("Supabase client (window.supabaseClient) is not available in script.js. Task assignment and user fetching will not work.");
        // You might want to disable relevant UI elements or show a user-friendly message
    }
});

// Add this function to get the current admin's organization
async function getCurrentAdminOrganization() {
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        console.error('❌ Failed to get current user:', authError?.message);
        return null;
    }
    const { data: adminData, error: adminError } = await window.supabaseClient.from('admins').select('organization').eq('id', user.id).single();
    if (adminError || !adminData) {
        console.error('❌ Failed to fetch admin organization:', adminError?.message);
        return null;
    }
    return adminData.organization;
}

// Update fetchAndDisplayMyTasks to filter by organization
async function fetchAndDisplayMyTasks() {
    const organization = await getCurrentAdminOrganization();
    if (!organization) return;
    // Fetch users in this organization
    const { data: orgUsers, error: orgUsersError } = await window.supabaseClient.from('users').select('id').eq('userOrganization', organization);
    if (orgUsersError) {
        console.error('Error fetching org users:', orgUsersError.message);
        return;
    }
    const orgUserIds = orgUsers.map(u => u.id);
    // Fetch tasks assigned to these users
    const { data: tasks, error } = await window.supabaseClient.from('tasks').select('title, deadline, status, users(username, id)').order('deadline', { ascending: true });
    if (error) {
        console.error('Error fetching tasks:', error.message);
        return;
    }
    // Filter tasks where users.id is in orgUserIds
    const filteredTasks = tasks.filter(task => task.users && orgUserIds.includes(task.users.id));
    if (filteredTasks.length === 0) {
        tasksGrid.innerHTML = '<p>There are no tasks assigned to anyone by you.</p>';
        return;
    }
    renderTaskListCards(filteredTasks);
}

function renderTaskListCards(tasks) {
    const MAX_VISIBLE_TASKS = 4;
    const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);

    const tbody = document.querySelector(".tasks-table tbody");
    tbody.innerHTML = ''; // Clear previous rows

    visibleTasks.forEach(task => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><span class="title">${
            task.title || ''
        }</span></td>
            <td><span class="deadline">${
            new Date(task.deadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
        }</span></td>
            <td><span class="status" style="
                font-size: 0.75rem;
                text-transform: capitalize;
                background-color: #e5e7eb;
                color: #374151;
                padding: 4px 10px;
                border-radius: 999px;
        ">${
            task.status || 'Not Started'
        }</span></td>
            <td><span class="task-assignee">${
            task.users ?. username || 'Unassigned'
        }</span></td>
        `;

        tbody.appendChild(tr);
    });
}

fetchAndDisplayMyTasks();

async function updateDashboardCards() {
    const organization = await getCurrentAdminOrganization();
    if (!organization) return;

    // Fetch users in org
    const { data: orgUsers } = await window.supabaseClient.from('users').select('id').eq('userOrganization', organization);
    const orgUserIds = orgUsers ? orgUsers.map(u => u.id) : [];

    // Fetch tasks
    const { data: tasks } = await window.supabaseClient.from('tasks').select('status, deadline, assignee_id').in('assignee_id', orgUserIds);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Pending tasks
    const pendingTasks = (tasks || []).filter(t => t.status === 'not started');
    const pendingTasksCount = document.getElementById('pending-tasks-count');
    if (pendingTasksCount) pendingTasksCount.textContent = pendingTasks.length;
    // Pending due today
    const dueToday = pendingTasks.filter(t => t.deadline && t.deadline.startsWith(todayStr));
    const pendingTasksDueToday = document.getElementById('pending-tasks-due-today');
    if (pendingTasksDueToday) pendingTasksDueToday.textContent = `${dueToday.length} due today`;

    // Completed tasks
    const completedTasks = (tasks || []).filter(t => t.status === 'completed');
    const completedTasksCount = document.getElementById('completed-tasks-count');
    if (completedTasksCount) completedTasksCount.textContent = completedTasks.length;
    // Completed this week (last 7 days)
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const completedThisWeek = completedTasks.filter(t => t.deadline && new Date(t.deadline) >= weekAgo);
    const completedTasksThisWeek = document.getElementById('completed-tasks-this-week');
    if (completedTasksThisWeek) completedTasksThisWeek.textContent = 'This week'; // Or `${completedThisWeek.length} this week`

    // Team members
    const teamMembersCount = document.getElementById('team-members-count');
    if (teamMembersCount) teamMembersCount.textContent = orgUserIds.length;
    // (Optional) Active now: you may need a separate query for online users
    const teamMembersActive = document.getElementById('team-members-active');
    if (teamMembersActive) teamMembersActive.textContent = `Active now: ?`;

    // Fetch projects for this organization
    const { data: projects } = await window.supabaseClient.from('projects').select('id, status').eq('organization', organization);
    const projectsCount = document.getElementById('projects-count');
    if (projectsCount) projectsCount.textContent = projects ? projects.length : 0;
    // Projects in progress
    const inProgress = (projects || []).filter(p => p.status === 'In Progress');
    const projectsInProgress = document.getElementById('projects-in-progress');
    if (projectsInProgress) projectsInProgress.textContent = `${inProgress.length} in progress`;
}

document.addEventListener('DOMContentLoaded', function () {
    updateDashboardCards();

    // Real-time subscriptions for dashboard cards
    if (window.supabaseClient) {
        // Tasks table
        window.supabaseClient.channel('dashboard-tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                updateDashboardCards();
            })
            .subscribe();
        // Users table
        window.supabaseClient.channel('dashboard-users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                updateDashboardCards();
            })
            .subscribe();
        // Projects table
        window.supabaseClient.channel('dashboard-projects')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
                updateDashboardCards();
            })
            .subscribe();
    }
});

// Example: When creating a new project, set the organization field
// Usage: await createProject({title, description, ...});
async function createProject(projectData) {
    const organization = await getCurrentAdminOrganization();
    if (!organization) throw new Error('No organization found for admin');
    const { error } = await window.supabaseClient.from('projects').insert({
        ...projectData,
        organization
    });
    if (error) throw error;
}

async function updateSidebarProfile() {
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
    const avatarEl = document.querySelector('.sidebar .profile .avatar');
    if (avatarEl) avatarEl.src = admin.avatar_url || '/taskedout-frontend/assets/images/img_avatar.png';
    // Update username
    const usernameEl = document.querySelector('.sidebar .profile .username');
    if (usernameEl) usernameEl.textContent = admin.username || 'Admin';
    // Update role
    const roleEl = document.querySelector('.sidebar .profile .user-role');
    if (roleEl) roleEl.textContent = (admin.role || 'Admin').toUpperCase();
}

document.addEventListener('DOMContentLoaded', updateSidebarProfile);

// Add function to check if user is admin
async function checkIfAdmin() {
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        console.error('❌ Failed to get current user:', authError?.message);
        return false;
    }
    // Check if user exists in the admins table
    const { data: adminData, error: adminError } = await window.supabaseClient
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single();
    if (adminError || !adminData) {
        // Not an admin
        return false;
    }
    return true;
}
