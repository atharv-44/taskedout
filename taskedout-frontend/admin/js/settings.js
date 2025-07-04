document.addEventListener('DOMContentLoaded', function() {
    // Handle Profile Settings Form
    const profileSettingsForm = document.getElementById('profileSettingsForm');
    profileSettingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        
        // In a real app, you would send this to a server
        alert(`Profile updated:\nUsername: ${username}\nEmail: ${email}`);
    });

    // Handle Notification Settings Form
    const notificationSettingsForm = document.getElementById('notificationSettingsForm');
    notificationSettingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const emailNotifications = document.getElementById('emailNotifications').checked;
        const projectUpdates = document.getElementById('projectUpdates').checked;

        // In a real app, you would save these preferences
        alert(`Notification preferences saved:\nEmail Notifications: ${emailNotifications}\nProject Updates: ${projectUpdates}`);
    });

    // Handle Password Change Form
    const passwordChangeForm = document.getElementById('passwordChangeForm');
    passwordChangeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match.');
            return;
        }

        if (!currentPassword || !newPassword) {
            alert('Please fill in all password fields.');
            return;
        }

        // In a real app, you would handle password change logic securely
        alert('Password has been changed successfully.');
        passwordChangeForm.reset();
    });
});
