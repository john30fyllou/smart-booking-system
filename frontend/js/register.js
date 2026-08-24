const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

const registerRole = document.getElementById('registerRole');
const providerInfo = document.getElementById('providerInfo');

const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');

const validatePasswordsMatch = () => {
    if (confirmPasswordInput.value !== '' && passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordInput.setCustomValidity('Οι κωδικοί πρόσβασης δεν ταιριάζουν.');
    } else {
        confirmPasswordInput.setCustomValidity('');
    }
};

passwordInput.addEventListener('input', validatePasswordsMatch);

confirmPasswordInput.addEventListener('input', validatePasswordsMatch);

registerRole.addEventListener('change', () => {
    if (registerRole.value === 'provider') {
        providerInfo.style.display = 'block';
    } else {
        providerInfo.style.display = 'none';
    }
});

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    validatePasswordsMatch();

    if (!registerForm.checkValidity()) {
        registerForm.reportValidity();
        return;
    }

    const firstName = document.getElementById('firstName').value.trim();

    const lastName = document.getElementById('lastName').value.trim();

    const email = document.getElementById('email').value.trim();

    const password = passwordInput.value;

    const role = registerRole.value;

    registerMessage.textContent = 'Γίνεται δημιουργία λογαριασμού...';

    try {
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email,
                password,
                role
            })
        });

        const data = await response.json();

        if (!response.ok) {
            registerMessage.textContent = data.message || 'Η εγγραφή απέτυχε.';

            return;
        }

        if (role === 'provider') {
            registerMessage.textContent =
                'Η αίτηση εγγραφής ως πάροχος καταχωρήθηκε και αναμένει έγκριση από διαχειριστή.';

            registerForm.reset();

            providerInfo.style.display = 'none';

            confirmPasswordInput.setCustomValidity('');

            return;
        }

        registerMessage.textContent = 'Η εγγραφή ολοκληρώθηκε επιτυχώς. Μεταφορά στη σύνδεση...';

        registerForm.reset();

        confirmPasswordInput.setCustomValidity('');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
    } catch (error) {
        console.error('Registration error:', error);

        registerMessage.textContent = 'Δεν ήταν δυνατή η επικοινωνία με τον server.';
    }
});
