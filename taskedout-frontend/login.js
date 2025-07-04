// Initialize Supabase
const SUPABASE_URL = window.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.env.SUPABASE_ANON_KEY;
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Main login logic
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email'); // Assuming input ID is 'email'
  const passwordInput = document.getElementById('password');
  const messageDisplay = document.getElementById('message');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageDisplay.textContent = '';
    messageDisplay.className = 'message-area';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      messageDisplay.textContent = 'Please enter both email and password.';
      messageDisplay.classList.add('error');
      return;
    }

    // Use Supabase Auth to sign in
    const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Login Error:', error.message);
      messageDisplay.textContent = 'Invalid credentials. Please try again.';
      messageDisplay.classList.add('error');
      return;
    }

    if (user) {
      // Check if the user is in the 'admins' table
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single();

      if (admin) {
        // It's an admin
        messageDisplay.textContent = 'Admin login successful!';
        messageDisplay.classList.add('success');
        setTimeout(() => window.location.href = "admin/html/admin_dashboard.html", 1000);
      } else {
        // It's a regular user
        messageDisplay.textContent = 'User login successful!';
        messageDisplay.classList.add('success');
        setTimeout(() => window.location.href = "user/html/user_dashboard.html", 1000);
      }
    }
  });
});
