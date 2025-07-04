document.addEventListener('DOMContentLoaded', function () {
    const userModal = document.getElementById('user-modal');
    const userModalBox = document.getElementById('user-modal-box');
    const openUserModalBtn = document.getElementById('addUserBtn');
    const closeUserModalBtn = document.getElementById('closeUserModal');
    const userForm = document.getElementById('userForm');
    const userTableBody = document.getElementById('user-table-body');
    const roleSelect = document.getElementById('role-select');
    const createUserBtn = document.getElementById('createUserBtn');

    // Update button text based on role selection
    roleSelect.addEventListener('change', () => {
        const selectedRole = roleSelect.value.trim().toUpperCase();
        if (selectedRole === 'ADMIN') {
            createUserBtn.textContent = 'Create Admin';
        } else {
            createUserBtn.textContent = 'Create User';
        }
    });

    function applyFilter() {
        const selectedRole = document.getElementById('role-filter').value;
        let filteredUsers;

        if (selectedRole === 'ALL') {
            filteredUsers = allUsers;
        } else {
            filteredUsers = allUsers.filter(user => user.role === selectedRole);
        } renderUsers(filteredUsers);
    }

    // 🚀 Fetch all users (users + admins)
    let allUsers = [];

    async function getUsers() {
        // 1. Get current admin's organization
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) {
            console.error('❌ Failed to get current user:', authError?.message);
            return;
        }
        const { data: adminData, error: adminError } = await window.supabaseClient.from('admins').select('organization').eq('id', user.id).single();
        if (adminError || !adminData) {
            console.error('❌ Failed to fetch admin organization:', adminError?.message);
            return;
        }
        const organization = adminData.organization;

        // 2. Fetch users and admins with the same organization
        const {data: usersData, error: usersError} = await window.supabaseClient.from('users').select('id, username, email, role').eq('userOrganization', organization);
        const {data: adminsData, error: adminsError} = await window.supabaseClient.from('admins').select('id, username, email, role').eq('organization', organization);

        if (usersError || adminsError) {
            console.error('Error fetching users:', usersError || adminsError);
            return;
        }

        allUsers = [
            ...(usersData || []),
            ...(adminsData || [])
        ];

        applyFilter(); // call this after fetching
    }

    // 🧱 Render user table
    function renderUsers(users) {
        userTableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${
                user.username
            }</td>
                <td>${
                user.email
            }</td>
                <td>${
                user.role
            }</td>
                <td class="actions-cell">
                    <button class="delete-btn" data-id="${
                user.id
            }" data-role="${
                user.role
            }">Delete</button>
                    <button class="role-toggle" data-id="${
                user.id
            }" data-role="${
                user.role
            }">
                        ${
                user.role === 'ADMIN' ? 'Revoke Admin' : 'Make Admin'
            }
                    </button>
                </td>
            `;
            userTableBody.appendChild(row);
        });

        attachActionListeners();
    }

    // 🎯 Attach Delete and Toggle buttons
    function attachActionListeners() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                const role = this.getAttribute('data-role');

                Swal.fire({
                    title: 'Are you sure?',
                    text: 'This action will permanently delete the user!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#0B2349',
                    confirmButtonText: 'Confirm',
                    cancelButtonText: 'Cancel',
                    didOpen: () => {
                        document.querySelector('.dashboard').classList.add('blurred');
                    },
                    willClose: () => {
                        document.querySelector('.dashboard').classList.remove('blurred');
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        deleteUser(userId, role);
                    }
                });
            });
        });

        document.querySelectorAll('.role-toggle').forEach(btn => {
            btn.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                const role = this.getAttribute('data-role');
                toggleAdminRole(userId, role);
            });
        });
    }

    // ❌ Delete user from correct table
    async function deleteUser(id, role) {
        const table = (role === 'ADMIN') ? 'admins' : 'users';
        const {error} = await window.supabaseClient.from(table).delete().eq('id', id);

        if (error) {
            console.log("Error deleting user");
        } else {
            console.log("Deleted user successfully");
            getUsers();
        }
    }

    // 🔄 Toggle user/admin role
    async function toggleAdminRole(id, currentRole) {
        const action = currentRole === 'ADMIN' ? 'Revoke Admin Rights?' : 'Make Admin?';
        const actionText = currentRole === 'ADMIN' ? 'This will revoke admin rights and move the user to the regular users list.' : 'This will grant admin rights and move the user to the admins list.';

        Swal.fire({
            title: action,
            text: actionText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#0B2349',
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            didOpen: () => {
                document.querySelector('.dashboard').classList.add('blurred');
            },
            willClose: () => {
                document.querySelector('.dashboard').classList.remove('blurred');
            }
        }).then(async (result) => {
            if (!result.isConfirmed) 
                return;
            

            if (currentRole === 'ADMIN') {
                const {data: admin, error: fetchErr} = await window.supabaseClient.from('admins').select('*').eq('id', id).single();

                if (fetchErr || !admin) {
                    console.error("Error fetching admin:", fetchErr ?. message);
                    return Swal.fire('Error', 'Failed to fetch admin data.', 'error');
                }

                await window.supabaseClient.from('admins').delete().eq('id', id);
                await window.supabaseClient.from('users').insert([{
                        id: admin.id,
                        username: admin.username,
                        email: admin.email,
                        password: admin.password,
                        role: 'USER',
                        userOrganization: admin.organization
                    }]);

                Swal.fire('Success!', 'Admin rights revoked.', 'success');

            } else {
                const {data: user, error: fetchErr} = await window.supabaseClient.from('users').select('*').eq('id', id).single();

                if (fetchErr || !user) {
                    console.error("Error fetching user:", fetchErr ?. message);
                    return Swal.fire('Error', 'Failed to fetch user data.', 'error');
                }

                await window.supabaseClient.from('users').delete().eq('id', id);
                await window.supabaseClient.from('admins').insert([{
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        password: user.password,
                        role: 'ADMIN',
                        organization: user.userOrganization
                    }]);

                Swal.fire('Success!', 'User is now an admin.', 'success');
            }
            getUsers(); // Refresh user table
        });
    }


    // 🪟 Modal open/close
    openUserModalBtn.addEventListener('click', () => {
        userModal.classList.add('flex');
        setTimeout(() => userModalBox.classList.add('show'), 10);
    });

    function closeModal() {
        userModalBox.classList.remove('show');
        setTimeout(() => {
            userModal.classList.remove('flex');
            userForm.reset();
        }, 300);
    }

    closeUserModalBtn.addEventListener('click', closeModal);
    userModal.addEventListener('click', e => {
        if (e.target === userModal) 
            closeModal();
        
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && userModal.classList.contains('flex')) 
            closeModal();
        
    });

    // 📝 Handle new user creation
    userForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username-input').value.trim();
        const email = document.getElementById('email-input').value.trim();
        const role = document.getElementById('role-select').value.trim().toUpperCase();
        const password = document.getElementById('password-input').value.trim();

        if (! username || ! email || ! role) {
            console.log("❗ Please fill out all required fields (Username, Email, Role).");
            return;
        }

        try {
            let data,
                error;
            if (role === 'ADMIN') {
                // Fetch current admin's organization
                const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
                if (authError || !user) {
                    console.error('❌ Failed to get current user:', authError?.message);
                    return;
                }
                const { data: adminData, error: adminError } = await window.supabaseClient.from('admins').select('organization').eq('id', user.id).single();
                if (adminError || !adminData) {
                    console.error('❌ Failed to fetch admin organization:', adminError?.message);
                    return;
                }
                const organization = adminData.organization;
                ({data, error} = await window.supabaseClient.from('admins').insert([{
                        username,
                        email,
                        password,
                        role,
                        organization: organization
                    }]));
            } else {
                // Fetch current admin's organization
                const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
                if (authError || !user) {
                    console.error('❌ Failed to get current user:', authError?.message);
                    return;
                }
                const { data: adminData, error: adminError } = await window.supabaseClient.from('admins').select('organization').eq('id', user.id).single();
                if (adminError || !adminData) {
                    console.error('❌ Failed to fetch admin organization:', adminError?.message);
                    return;
                }
                const organization = adminData.organization;
                ({data, error} = await window.supabaseClient.from('users').insert([{
                        username,
                        email,
                        password,
                        role,
                        userOrganization: organization
                    }]));
            }

            if (error) 
                throw error;
            

            console.log("✅ User created successfully");
            userForm.reset();
            closeModal();
            getUsers();

        } catch (err) {
            console.error("❌ Error creating user:", err.message);
        }
    });

    // 🚀 Load users on page load
    getUsers();
    document.getElementById('role-filter').addEventListener('change', applyFilter);
});
