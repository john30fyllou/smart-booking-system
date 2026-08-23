const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document
        .getElementById('email')
        .value
        .trim();

    const password = document
        .getElementById('password')
        .value;

    loginMessage.textContent = 'Γίνεται σύνδεση...';

    try {
        const response = await fetch(
            `${API_URL}/users/login`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            loginMessage.textContent =
                data.message || 'Η σύνδεση απέτυχε';

            return;
        }

        localStorage.setItem(
            'token',
            data.token
        );

        const userRole = data.user?.role || data.role;

        localStorage.setItem(
            'role',
            userRole
        );

        loginMessage.textContent =
            'Η σύνδεση πραγματοποιήθηκε επιτυχώς';

        if (userRole === 'provider') {
            window.location.href = 'provider.html';
        } else if (userRole === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'customer.html';
        }

    } catch (error) {
        console.error('Login error:', error);

        loginMessage.textContent =
            'Δεν ήταν δυνατή η σύνδεση με τον server';
    }
});