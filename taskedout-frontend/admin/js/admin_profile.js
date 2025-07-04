// Admin Profile Page Logic
// Requires: window.supabaseClient

document.addEventListener('DOMContentLoaded', async () => {
  const profileSection = document.querySelector('.content');
  //profileSection.innerHTML = '<div class="admin-profile-loading">Loading profile...</div>';

  // Helper: get current admin
  async function getCurrentAdmin() {
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) return null;
    const { data: admin, error } = await window.supabaseClient
      .from('admins')
      .select('id, username, email, avatar_url, organization, role')
      .eq('id', user.id)
      .single();
    if (error) return null;
    return admin;
  }

  // Render profile UI
  async function renderProfile() {
    const admin = await getCurrentAdmin();
    if (!admin) {
      showMessage('Could not load profile.', true, true);
      return;
    }
    // Populate fields (read-only)
    document.getElementById('admin-avatar-img').src = admin.avatar_url || '/taskedout-frontend/assets/images/img_avatar.png';
    document.getElementById('admin-email').value = admin.email || '';
    document.getElementById('admin-org').value = admin.organization || '';
    document.getElementById('admin-role').value = admin.role || 'Admin';

    // Avatar upload logic (Cloudinary)
    document.getElementById('change-avatar-btn').onclick = () => {
      document.getElementById('admin-avatar-upload').click();
    };
    document.getElementById('admin-avatar-upload').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showMessage('Uploading avatar...', false, true);
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'unsigned_upload'); // Replace with your preset
      try {
        const response = await fetch('https://api.cloudinary.com/v1_1/dh0twyrr1/image/upload', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        if (!data.secure_url) throw new Error('Cloudinary upload failed');
        // Update admin record in Supabase
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        const { error: updateError } = await window.supabaseClient.from('admins').update({ avatar_url: data.secure_url }).eq('id', user.id);
        if (updateError) {
          showMessage('Failed to update avatar.', true, true);
          return;
        }
        document.getElementById('admin-avatar-img').src = data.secure_url;
        showMessage('Avatar updated!', false, true);
      } catch (err) {
        showMessage('Failed to upload avatar.', true, true);
      }
    };
  }

  function showMessage(msg, isError, persistent) {
    const el = document.getElementById('admin-profile-message');
    el.textContent = msg;
    el.style.color = isError ? '#d90429' : '#0B2349';
    if (!persistent) {
      setTimeout(() => { el.textContent = ''; }, 3000);
    }
  }

  renderProfile();
});
