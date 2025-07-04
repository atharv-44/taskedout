// Initialize Supabase client
const SUPABASE_URL = window.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.env.SUPABASE_ANON_KEY;
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Main signup logic
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const messageDisplay = document.getElementById('message');
    const organizationDropdown = document.getElementById('userOrganization');

    async function populateOrganizations() {
        const {
            data: admins,
            error: orgError
        } = await supabase.from("admins").select("organization");

        if (orgError) {
            console.error("❌ Cannot fetch organizations:", orgError.message);
            organizationDropdown.disabled = true;
            return;
        }

        const uniqueOrgs = [...new Set(admins.map(a => a.organization))];

        uniqueOrgs.forEach(org => {
            const option = document.createElement("option");
            option.value = org;
            option.textContent = org;
            organizationDropdown.appendChild(option);
        });
    }

    populateOrganizations();

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageDisplay.textContent = '';
        messageDisplay.className = 'message-area';

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const organization = organizationDropdown.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // ✅ Basic validations
        if (!username || !email || !password || !confirmPassword || !organization) {
            messageDisplay.textContent = 'All fields are required.';
            messageDisplay.classList.add('error');
            return;
        }

        if (password !== confirmPassword) {
            messageDisplay.textContent = 'Passwords do not match.';
            messageDisplay.classList.add('error');
            return;
        }

        if (password.length < 8) {
            messageDisplay.textContent = 'Password must be at least 8 characters.';
            messageDisplay.classList.add('error');
            return;
        }

        // 🔐 Sign up user in Supabase Auth
        const {
            data: {
                user
            },
            error
        } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username, // Save it in user_metadata
                    userOrganization: organization
                }
            }
        });

        if (error) {
            console.error('Signup Error:', error.message);
            messageDisplay.textContent = `Signup failed: ${
                error.message
            }`;
            messageDisplay.classList.add('error');
            return;
        }

        // ✅ Also insert into custom 'users' table
        if (user) {
            console.log("📦 Inserting user with password:", password);
            const {
                error: insertError
            } = await supabase.from('users').upsert([{
                id: user.id,
                username: username,
                email: email,
                password: password, // ⚠️ still raw — just for testing
                userOrganization: organization
            }]);

            if (insertError) {
                console.error("❌ Failed to insert into users table:", insertError.message);
            } else {
                console.log("✅ User inserted successfully in 'users' table.");
            }

            // Success message
            messageDisplay.textContent = 'User registered successfully! Redirecting to login...';
            messageDisplay.classList.add('success');
            signupForm.reset();
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        }
    });
});
