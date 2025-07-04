// Sidebar navigation: highlight active link
const sidebarLinks = document.querySelectorAll('.sidebar nav ul li a');
sidebarLinks.forEach(link => {
  link.addEventListener('click', function() {
    sidebarLinks.forEach(l => l.parentElement.classList.remove('active'));
    this.parentElement.classList.add('active');
  });
});

// Table row click: open task detail (for demo, use alert)
window.openTaskDetail = function(taskId) {
  alert('Open details for Task ID: ' + taskId);
  // In production, open a modal or navigate to task-detail.html?taskId=taskId
};

// Activity item click: open activity detail (for demo, use alert)
window.openActivityDetail = function(activityId) {
  alert('Open details for Activity ID: ' + activityId);
  // In production, open a modal or navigate to activity-detail.html?activityId=activityId
};

// New Task button: open new task modal (for demo, use alert)
document.querySelector('.new-task-btn').addEventListener('click', function() {
  alert('Open New Task modal');
});

// Logout button: confirm logout (for demo, use alert)
document.querySelector('.logout-btn').addEventListener('click', function(e) {
  e.preventDefault();
  if (confirm('Are you sure you want to logout?')) {
    // Redirect to login page or perform logout
    window.location.href = 'login.html';
  }
});
