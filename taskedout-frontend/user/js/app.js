// Chart.js Doughnut Chart for Progress Overview
let progressChartInstance = null;

function updateProgressChart(tasks) {
  // Count statuses
  let completed = 0, inProgress = 0, pending = 0;
  tasks.forEach(task => {
    const status = (task.status || '').toLowerCase();
    if (status === 'completed') completed++;
    else if (status === 'in progress') inProgress++;
    else pending++;
  });
  const total = completed + inProgress + pending;
  // Avoid division by zero
  const pct = x => total ? Math.round((x / total) * 100) : 0;
  // Update chart
  if (progressChartInstance) {
    progressChartInstance.data.datasets[0].data = [completed, inProgress, pending];
    progressChartInstance.update();
  }
  // Update legend
  const completedVal = document.querySelector('.legend-value.completed');
  const inProgressVal = document.querySelector('.legend-value.in-progress');
  const pendingVal = document.querySelector('.legend-value.pending');
  if (completedVal) completedVal.textContent = pct(completed) + '%';
  if (inProgressVal) inProgressVal.textContent = pct(inProgress) + '%';
  if (pendingVal) pendingVal.textContent = pct(pending) + '%';
}

document.addEventListener("DOMContentLoaded", async function () {
  const progressChart = document.getElementById("progressChart");
  if (progressChart) {
    const ctx = progressChart.getContext("2d");
    progressChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Completed", "In Progress", "Pending"],
        datasets: [
          {
            data: [0, 0, 0],
            backgroundColor: [
              "#22c55e", // Completed
              "#f59e42", // In Progress
              "#6b7280", // Pending
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: "70%",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  // SEARCH + FILTER FUNCTIONALITY
  const searchInput = document.querySelector(".search-bar input");
  const statusFilter = document.getElementById("statusFilter");
  const priorityFilter = document.getElementById("priorityFilter");
  if (searchInput) searchInput.addEventListener("input", filterAndRenderTasks);
  if (statusFilter)
    statusFilter.addEventListener("change", filterAndRenderTasks);
  if (priorityFilter)
    priorityFilter.addEventListener("change", filterAndRenderTasks);
  // Only call filterAndRenderTasks if at least one filter/search exists
  if (searchInput || statusFilter || priorityFilter) {
    filterAndRenderTasks();
  }

  // Hamburger menu toggle logic for all user pages
  setupHamburgerSidebarToggle();

  // Fetch user info for avatar logic
  let userId = null;
  let userAvatarUrl = null;
  const {
    data: { user },
    error: userFetchError
  } = await supabaseClient.auth.getUser();
  if (userFetchError) {
    console.error("Error fetching user:", userFetchError);
  }
  if (user) {
    userId = user.id;
    console.log("Logged in user ID:", userId);
    // Fetch avatar_url from users table
    const { data: userProfile, error: profileError } = await supabaseClient
      .from("users")
      .select("avatar_url")
      .eq("id", userId)
      .single();
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
    }
    userAvatarUrl = userProfile?.avatar_url || null;
    console.log("Fetched avatar_url from Supabase:", userAvatarUrl);
    if (userAvatarUrl) {
      const avatarImg = document.getElementById("userAvatar");
      if (avatarImg) {
        avatarImg.src = userAvatarUrl;
        console.log("Avatar image src set to:", userAvatarUrl);
      }
    } else {
      console.log("No avatar_url found, using default avatar.");
    }
  } else {
    console.log("No user logged in.");
  }

  // Profile Popup Logic
  const avatar = document.getElementById("userAvatar");
  const popup = document.getElementById("profilePopup");
  const avatarInput = document.getElementById("avatarInput");
  const deleteAvatarBtn = document.getElementById("deleteAvatarBtn");
  const popupLogoutBtn = document.getElementById("popupLogoutBtn");
  const defaultAvatar = "../../assets/images/Sarah_User.avif";

  // Toggle popup
  if (avatar && popup) {
    avatar.addEventListener("click", function (e) {
      e.stopPropagation();
      popup.style.display = popup.style.display === "none" ? "flex" : "none";
    });
    // Close popup on outside click
    document.addEventListener("click", function (e) {
      if (
        popup.style.display !== "none" &&
        !popup.contains(e.target) &&
        e.target !== avatar
      ) {
        popup.style.display = "none";
      }
    });
  }

  // Update Profile Picture (upload to Cloudinary and update users table)
  if (avatarInput && avatar) {
    avatarInput.addEventListener("change", async function (e) {
      // 1. Get the authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        alert("You must be logged in to upload a profile picture.");
        console.error("User not logged in or error:", userError);
        return;
      }
      // 2. Get the file from the input
      const file = avatarInput.files[0];
      if (!file) {
        alert("No file selected.");
        console.error("No file selected for upload.");
        return;
      }
      // 3. Upload to Cloudinary
      const cloudName = "dh0twyrr1"; // <-- Set your Cloudinary cloud name
      const uploadPreset = "unsigned_upload"; // <-- Set your unsigned upload preset
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      let cloudinaryResponse;
      try {
        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });
        cloudinaryResponse = await response.json();
        console.log("Cloudinary upload response:", cloudinaryResponse);
      } catch (err) {
        alert("Failed to upload image to Cloudinary.");
        console.error("Cloudinary upload error:", err);
        return;
      }
      if (!cloudinaryResponse.secure_url) {
        alert("Failed to upload image to Cloudinary.");
        console.error("No secure_url in Cloudinary response:", cloudinaryResponse);
        return;
      }
      // 4. Update the user's avatar_url in the users table
      const { error: updateError } = await supabaseClient
        .from("users")
        .update({ avatar_url: cloudinaryResponse.secure_url })
        .eq("id", user.id);
      if (updateError) {
        alert("Failed to update profile: " + updateError.message);
        console.error("Supabase update error:", updateError);
        return;
      }
      // 5. Update the avatar image on the page
      avatar.src = cloudinaryResponse.secure_url;
      console.log("Avatar image src updated to:", cloudinaryResponse.secure_url);
      popup.style.display = "none";
    });
  }

  // Delete Profile Picture (remove from users table, set default)
  if (deleteAvatarBtn && avatar) {
    deleteAvatarBtn.addEventListener("click", async function () {
      if (!userId) {
        console.error("No userId found for delete avatar.");
        return;
      }
      // 1. Remove avatar_url from users table
      const { error: updateError } = await supabaseClient
        .from("users")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (updateError) {
        alert("Failed to update profile: " + updateError.message);
        console.error("Supabase update error (delete):", updateError);
        return;
      }
      // 2. Reset avatar on UI
      avatar.src = defaultAvatar;
      console.log("Avatar reset to default.");
      popup.style.display = "none";
    });
  }

  // Logout from popup
  if (popupLogoutBtn) {
    popupLogoutBtn.addEventListener("click", function () {
      if (typeof supabaseClient !== "undefined" && supabaseClient.auth) {
        supabaseClient.auth.signOut().then(() => {
          window.location.href = "../../login.html";
        });
      } else {
        window.location.href = "../../login.html";
      }
    });
  }
});

// Stub for task detail function
function openTaskDetail(id) {
  // No action for now
}

// Helper: Parse date string to Date object
function parseDueDate(str) {
  const today = new Date();
  if (str.toLowerCase() === "today")
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (str.toLowerCase() === "tomorrow") {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }
  const d = new Date(str);
  if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return null;
}

// Helper: Get all tasks from the table
function getTasksFromTable() {
  const rows = document.querySelectorAll(".tasks-table tbody tr");
  const tasks = [];
  rows.forEach((row) => {
    if (row.style.display === "none") return;
    const tds = row.querySelectorAll("td");
    if (tds.length < 5) return;
    tasks.push({
      name: tds[0].textContent.trim(),
      project: tds[1].textContent.trim(),
      due: tds[2].textContent.trim(),
      status: tds[3].textContent.trim(),
      priority: tds[4].textContent.trim(),
    });
  });
  return tasks;
}

// Update summary cards
function updateSummaryCards() {
  const tasks = getTasksFromTable();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let pending = 0,
    completed = 0,
    dueToday = 0,
    overdue = 0;
  tasks.forEach((task) => {
    const dueDate = parseDueDate(task.due);
    if (task.status.toLowerCase() === "pending") pending++;
    if (task.status.toLowerCase() === "completed") completed++;
    if (dueDate) {
      if (dueDate.getTime() === today.getTime()) dueToday++;
      if (
        dueDate.getTime() < today.getTime() &&
        task.status.toLowerCase() !== "completed"
      )
        overdue++;
    }
  });
  document.querySelector(".summary-card.pending .card-value").textContent =
    pending;
  document.querySelector(".summary-card.completed .card-value").textContent =
    completed;
  document.querySelector(".summary-card.due .card-value").textContent =
    dueToday;
  document.querySelector(".summary-card.overdue .card-value").textContent =
    overdue;
}

// ✅ Updated filter function with white space fix
function filterAndRenderTasks() {
  const searchInput = document.querySelector(".search-bar input");
  const statusFilter = document.getElementById("statusFilter");
  const priorityFilter = document.getElementById("priorityFilter");
  const searchValue = searchInput ? searchInput.value.toLowerCase() : "";
  const statusValue = statusFilter ? statusFilter.value : "all";
  const priorityValue = priorityFilter ? priorityFilter.value : "all";
  const taskRows = document.querySelectorAll(".tasks-table tbody tr");
  let visibleCount = 0;

  taskRows.forEach((row) => {
    const tds = row.querySelectorAll("td");
    if (tds.length < 5) return;
    const taskName = tds[0].textContent.trim().toLowerCase();
    const projectName = tds[1].textContent.trim().toLowerCase();
    const status = tds[3].textContent.trim().toLowerCase();
    const priority = tds[4].textContent.trim().toLowerCase();

    let show = true;
    if (statusValue !== "all" && status !== statusValue) show = false;
    if (priorityValue !== "all" && priority !== priorityValue) show = false;
    if (
      searchValue &&
      !(taskName.includes(searchValue) || projectName.includes(searchValue))
    )
      show = false;

    row.style.display = show ? "" : "none";
    if (show) visibleCount++;
  });

  // Show/hide 'No tasks found' message
  let noTasksRow = document.getElementById("noTasksRow");
  if (!noTasksRow) {
    noTasksRow = document.createElement("tr");
    noTasksRow.id = "noTasksRow";
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "No tasks found";
    td.style.textAlign = "center";
    td.style.color = "#888";
    td.style.padding = "32px 0";
    noTasksRow.appendChild(td);
    document.querySelector(".tasks-table tbody").appendChild(noTasksRow);
  }
  noTasksRow.style.display = visibleCount === 0 ? "" : "none";

  // ✅ Fix the top white space by adjusting padding dynamically
  const tasksSection = document.querySelector(".tasks-section");
  if (visibleCount === 0) {
    tasksSection.style.paddingTop = "8px"; // Reduced when empty
    tasksSection.style.minHeight = "220px"; // Maintain visual balance
  } else {
    tasksSection.style.paddingTop = "";
    tasksSection.style.minHeight = "";
  }

  updateSummaryCards();
}

// Hamburger menu toggle logic for all user pages
function setupHamburgerSidebarToggle() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const sidebar = document.getElementById("sidebar");
  const sidebarBackdrop = document.querySelector(".sidebar-backdrop");
  function closeSidebar() {
    sidebar?.classList.add("collapsed");
    if (sidebarBackdrop) sidebarBackdrop.classList.add("collapsed");
    hamburgerBtn?.setAttribute("aria-expanded", "false");
  }
  function openSidebar() {
    sidebar?.classList.remove("collapsed");
    if (sidebarBackdrop) sidebarBackdrop.classList.remove("collapsed");
    hamburgerBtn?.setAttribute("aria-expanded", "true");
    const firstLink = sidebar?.querySelector(".nav-link");
    if (firstLink) firstLink.focus();
  }
  function handleResize() {
    if (window.innerWidth < 900) {
      closeSidebar();
    } else {
      sidebar?.classList.remove("collapsed");
      if (sidebarBackdrop) sidebarBackdrop.classList.add("collapsed");
    }
  }
  if (hamburgerBtn && sidebar && sidebarBackdrop) {
    hamburgerBtn.addEventListener("click", () => {
      if (sidebar.classList.contains("collapsed")) {
        openSidebar();
      } else {
        closeSidebar();
      }
    });
    sidebarBackdrop.addEventListener("click", closeSidebar);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !sidebar.classList.contains("collapsed")) {
        closeSidebar();
      }
    });
    window.addEventListener("resize", handleResize);
    handleResize();
  } else {
    console.log("[Sidebar Toggle] Elements not found:", {
      hamburgerBtn,
      sidebar,
      sidebarBackdrop,
    });
  }
}
async function fetchAndDisplayProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();
  console.log("Supabase user:", user, "Error:", userError);
  if (userError || !user) {
    alert(
      "No user logged in or error: " +
        (userError ? userError.message : "No user")
    );
    return;
  }
  const userId = user.id;
  const { data: users, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", userId)
    .limit(1);
  console.log("User fetch result:", users, "Error:", error);
  if (error) {
    alert("Error fetching user: " + error.message);
    return;
  }
  if (!user || user.length === 0) {
    alert(
      "No profile found for your user. Please check the users table. Your user_id is: " +
        userId
    );
    return;
  }
  const userss = users[0];
  // // Sidebar name and image
  // const sidebarName = document.querySelector('.sidebar .profile-section h3');
  // const sidebarImg = document.querySelector('.sidebar .profile-pic img');
  // if (sidebarName) sidebarName.textContent = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  // if (sidebarImg) sidebarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.first_name || '')}+${encodeURIComponent(profile.last_name || '')}&background=1E237E&color=fff`;

  // Profile header name, title, and image
  document
    .querySelectorAll(".user-name")
    .forEach((el) => (el.textContent = `${userss.username || ""}`.trim()));
  // document.querySelectorAll('.user-avatar img').forEach(img => {
  //     img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.first_name || '')}+${encodeURIComponent(profile.last_name || '')}&background=1E237E&color=fff`;
  // });
}
fetchAndDisplayProfile();

// Settings page logic for fetching and updating user profile
if (document.getElementById("profile-settings-form")) {
  document.addEventListener("DOMContentLoaded", async function () {
    const profileForm = document.getElementById("profile-settings-form");
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const successMsg = document.getElementById("settings-success");
    const errorMsg = document.getElementById("settings-error");
    // Fetch current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      errorMsg.style.display = "block";
      errorMsg.textContent = "You must be logged in to view settings.";
      return;
    }
    // Fetch user profile from users table
    const { data: userProfile, error: fetchError } = await supabaseClient
      .from("users")
      .select("username, email")
      .eq("id", user.id)
      .single();
    if (fetchError || !userProfile) {
      errorMsg.style.display = "block";
      errorMsg.textContent = "Failed to load profile.";
      return;
    }
    usernameInput.value = userProfile.username || "";
    emailInput.value = userProfile.email || "";
    // Save changes
    profileForm.onsubmit = async function (e) {
      e.preventDefault();
      successMsg.style.display = "none";
      errorMsg.style.display = "none";
      const newUsername = usernameInput.value.trim();
      const newEmail = emailInput.value.trim();
      if (!newUsername || !newEmail) {
        errorMsg.style.display = "block";
        errorMsg.textContent = "Username and email cannot be empty.";
        return;
      }
      // Only update if changed
      if (
        newUsername === userProfile.username &&
        newEmail === userProfile.email
      ) {
        successMsg.style.display = "block";
        successMsg.textContent = "No changes to save.";
        return;
      }
      const { error: updateError } = await supabaseClient
        .from("users")
        .update({ username: newUsername, email: newEmail })
        .eq("id", user.id);
      if (updateError) {
        errorMsg.style.display = "block";
        errorMsg.textContent = "Failed to update profile.";
      } else {
        successMsg.style.display = "block";
        successMsg.textContent = "Profile updated successfully!";
        userProfile.username = newUsername;
        userProfile.email = newEmail;
      }
    };
  });
}

// DASHBOARD SUMMARY CARDS FUNCTIONALITY
async function updateDashboardSummaryCards() {
  const pendingCard = document.querySelector('.summary-card.pending .card-value');
  const pendingSub = document.querySelector('.summary-card.pending .card-subtext');
  const completedCard = document.querySelector('.summary-card.completed .card-value');
  const completedSub = document.querySelector('.summary-card.completed .card-subtext');
  const dueTodayCard = document.querySelector('.summary-card.due .card-value');
  const dueTodaySub = document.querySelector('.summary-card.due .card-subtext');
  const overdueCard = document.querySelector('.summary-card.overdue .card-value');
  const overdueSub = document.querySelector('.summary-card.overdue .card-subtext');

  // Show loading state
  if (pendingCard) pendingCard.textContent = '...';
  if (completedCard) completedCard.textContent = '...';
  if (dueTodayCard) dueTodayCard.textContent = '...';
  if (overdueCard) overdueCard.textContent = '...';

  // Get user
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    if (pendingCard) pendingCard.textContent = '0';
    if (completedCard) completedCard.textContent = '0';
    if (dueTodayCard) dueTodayCard.textContent = '0';
    if (overdueCard) overdueCard.textContent = '0';
    return;
  }

  // Fetch all tasks for this user
  const { data: tasks, error } = await supabaseClient
    .from('tasks')
    .select('id, status, deadline')
    .eq('assignee_id', user.id);

  if (error || !tasks) {
    if (pendingCard) pendingCard.textContent = '0';
    if (completedCard) completedCard.textContent = '0';
    if (dueTodayCard) dueTodayCard.textContent = '0';
    if (overdueCard) overdueCard.textContent = '0';
    return;
  }

  // Today's date (YYYY-MM-DD)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  let pending = 0, completed = 0, dueToday = 0, overdue = 0, highPriorityToday = 0;
  let completedThisWeek = 0;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Saturday

  tasks.forEach(task => {
    const status = (task.status || '').toLowerCase();
    const deadline = task.deadline;
    // Completed
    if (status === 'completed') {
      completed++;
      // Completed this week
      if (deadline) {
        const d = new Date(deadline);
        if (d >= weekStart && d <= weekEnd) completedThisWeek++;
      }
      return;
    }
    // Pending
    if (status === 'not started' || status === 'in progress') {
      pending++;
    }
    // Due Today
    if (deadline === todayStr && status !== 'completed') {
      dueToday++;
      if (priority === 'high') highPriorityToday++;
    }
    // Overdue
    if (deadline && deadline < todayStr && status !== 'completed') {
      overdue++;
    }
  });

  if (pendingCard) pendingCard.textContent = pending;
  if (pendingSub) pendingSub.textContent = `${dueToday} new today`;
  if (completedCard) completedCard.textContent = completed;
  if (completedSub) completedSub.textContent = `${completedThisWeek} this week`;
  if (dueTodayCard) dueTodayCard.textContent = dueToday;
  if (dueTodaySub) dueTodaySub.textContent = `${highPriorityToday} high priority`;
  if (overdueCard) overdueCard.textContent = overdue;
  if (overdueSub) overdueSub.textContent = overdue > 0 ? 'Needs attention' : '';
}

// Call on dashboard page
if (document.querySelector('.summary-cards')) {
  updateDashboardSummaryCards();
}

// --- DYNAMIC TASK FETCH & RENDER ---
let allTasks = [];

async function fetchAndRenderTasks() {
  const tasksTableBody = document.getElementById('tasksTableBody');
  if (!tasksTableBody) return;
  tasksTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:32px 0;">Loading...</td></tr>';

  // Get user
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    tasksTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:32px 0;">Not logged in</td></tr>';
    return;
  }
  // Fetch tasks for this user (join projects table for project title)
  const { data: tasks, error } = await supabaseClient
    .from('tasks')
    .select('id, title, deadline, status')
    .eq('assignee_id', user.id)
    .order('deadline', { ascending: true });
  if (error || !tasks) {
    tasksTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:32px 0;">Failed to load tasks</td></tr>';
    return;
  }
  allTasks = tasks;
  renderTasksTable();
  updateProgressChart(allTasks);
}

function renderTasksTable() {
  const tasksTableBody = document.getElementById('tasksTableBody');
  if (!tasksTableBody) return;
  // Remove any existing 'No tasks found' row
  const oldNoTasksRow = document.getElementById('noTasksRow');
  if (oldNoTasksRow) oldNoTasksRow.remove();
  // Get filter/search values
  const searchInput = document.querySelector('.search-bar input');
  const statusFilter = document.getElementById('statusFilter');
  const priorityFilter = document.getElementById('priorityFilter');
  const searchValue = searchInput ? searchInput.value.toLowerCase() : '';
  const statusValue = statusFilter ? statusFilter.value : 'all';
  const priorityValue = priorityFilter ? priorityFilter.value : 'all';

  // Filter tasks
  let filtered = allTasks.filter(task => {
    let show = true;
    if (statusValue !== 'all' && (task.status || '').toLowerCase() !== statusValue) show = false;
    if (priorityValue !== 'all' && (task.priority || '').toLowerCase() !== priorityValue) show = false;
    if (searchValue && !(task.title || '').toLowerCase().includes(searchValue)) show = false;
    return show;
  });

  // Render rows
  if (filtered.length === 0) {
    tasksTableBody.innerHTML = `
      <tr id="noTasksRow">
        <td colspan="3" style="text-align:center;color:#888;padding:32px 0;">No tasks found</td>
      </tr>
    `;
  } else {
    tasksTableBody.innerHTML = filtered.map(task => {
      // Due date formatting
      let dueLabel = '';
      let dueClass = '';
      if (task.deadline) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const dueDate = new Date(task.deadline);
        dueDate.setHours(0,0,0,0);
        if (dueDate.getTime() === today.getTime()) {
          dueLabel = 'Today';
          dueClass = 'due-today';
        } else if (dueDate.getTime() < today.getTime()) {
          dueLabel = 'Overdue';
          dueClass = 'overdue';
        } else {
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          if (dueDate.getTime() === tomorrow.getTime()) {
            dueLabel = 'Tomorrow';
          } else {
            dueLabel = dueDate.toLocaleDateString();
          }
        }
      }
      return `<tr onclick=\"openTaskDetail('${task.id}')\">
        <td>${task.title || ''}</td>
        <td class=\"${dueClass}\">${dueLabel}</td>
        <td><span class=\"status\">${task.status || ''}</span></td>
      </tr>`;
    }).join('');
  }
  updateSummaryCardsDynamic(filtered);
  updateProgressChart(filtered);
}

// Update summary cards based on filtered tasks
function updateSummaryCardsDynamic(tasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let pending = 0, completed = 0, dueToday = 0, overdue = 0;
  tasks.forEach(task => {
    const status = (task.status || '').toLowerCase();
    const dueDate = task.deadline ? new Date(task.deadline) : null;
    if (status === 'pending') pending++;
    if (status === 'completed') completed++;
    if (dueDate) {
      dueDate.setHours(0,0,0,0);
      if (dueDate.getTime() === today.getTime()) dueToday++;
      if (dueDate.getTime() < today.getTime() && status !== 'completed') overdue++;
    }
  });
  document.querySelector('.summary-card.pending .card-value').textContent = pending;
  document.querySelector('.summary-card.completed .card-value').textContent = completed;
  document.querySelector('.summary-card.due .card-value').textContent = dueToday;
  document.querySelector('.summary-card.overdue .card-value').textContent = overdue;
}

// Hook up filter/search to dynamic render
const searchInput = document.querySelector('.search-bar input');
const statusFilter = document.getElementById('statusFilter');
const priorityFilter = document.getElementById('priorityFilter');
if (searchInput) searchInput.addEventListener('input', renderTasksTable);
if (statusFilter) statusFilter.addEventListener('change', renderTasksTable);
if (priorityFilter) priorityFilter.addEventListener('change', renderTasksTable);

// On page load, fetch and render tasks
document.addEventListener('DOMContentLoaded', fetchAndRenderTasks);
