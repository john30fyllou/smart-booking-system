const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token || role !== 'admin') {
    window.location.href = 'login.html';
}

const usersList = document.getElementById('usersList');
const adminBookingsList = document.getElementById('adminBookingsList');
const adminServicesList = document.getElementById('adminServicesList');
const logoutBtn = document.getElementById('logoutBtn');

const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const translateStatus = (status) => {
    const statuses = {
        pending: 'Σε αναμονή',
        approved: 'Εγκεκριμένο',
        cancelled: 'Ακυρωμένο',
        completed: 'Ολοκληρωμένο'
    };

    return statuses[status] || status;
};

const translateRole = (role) => {
    const roles = {
        customer: 'Πελάτης',
        provider: 'Πάροχος',
        admin: 'Διαχειριστής'
    };

    return roles[role] || role;
};

const translateApprovalStatus = (status) => {
    const statuses = {
        pending: 'Σε αναμονή',
        approved: 'Εγκεκριμένος',
        rejected: 'Απορρίφθηκε'
    };

    return statuses[status] || status;
};

const loadUsers = async () => {
    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const users = await response.json();

        usersList.innerHTML = '';

        if (!response.ok) {
            usersList.innerHTML = `
                <p>
                    ${users.message || 'Αποτυχία φόρτωσης χρηστών.'}
                </p>
            `;

            return;
        }

        if (users.length === 0) {
            usersList.innerHTML = '<p>Δεν υπάρχουν χρήστες.</p>';

            return;
        }

        users.forEach((user) => {
            const card = document.createElement('div');

            card.className = 'dashboard-card';

            card.innerHTML = `
                <h3>
                    ${user.first_name}
                    ${user.last_name}
                </h3>

                <p>
                    <strong>Email:</strong>
                    ${user.email}
                </p>

                <p>
                    <strong>Ρόλος:</strong>
                    ${translateRole(user.role)}
                </p>

                ${
                    user.role === 'provider'
                        ? `
                            <p>
                                <strong>Κατάσταση έγκρισης:</strong>
                                ${translateApprovalStatus(user.approval_status)}
                            </p>
                        `
                        : ''
                }

                ${
                    user.role !== 'admin'
                        ? `
                            <div class="form-group">

                                <label>
                                    Αλλαγή ρόλου
                                </label>

                                <select
                                    class="user-role-select"
                                >
                                    <option
                                        value="customer"
                                        ${user.role === 'customer' ? 'selected' : ''}
                                    >
                                        Πελάτης
                                    </option>

                                    <option
                                        value="provider"
                                        ${user.role === 'provider' ? 'selected' : ''}
                                    >
                                        Πάροχος
                                    </option>

                                    <option value="admin">
                                        Διαχειριστής
                                    </option>
                                </select>

                            </div>

                            <div class="booking-actions">

                                <button
                                    type="button"
                                    class="btn update-role-btn"
                                >
                                    Αποθήκευση ρόλου
                                </button>

                                <button
                                    type="button"
                                    class="btn delete-user-btn"
                                >
                                    Διαγραφή χρήστη
                                </button>

                            </div>
                        `
                        : ''
                }

                ${
                    user.role === 'provider' && user.approval_status === 'pending'
                        ? `
                            <div class="booking-actions">

                                <button
                                    type="button"
                                    class="btn approve-provider-btn"
                                >
                                    Έγκριση
                                </button>

                                <button
                                    type="button"
                                    class="btn reject-provider-btn"
                                >
                                    Απόρριψη
                                </button>

                            </div>
                        `
                        : ''
                }
            `;

            usersList.appendChild(card);

            const roleButton = card.querySelector('.update-role-btn');

            if (roleButton) {
                roleButton.addEventListener('click', async () => {
                    const roleSelect = card.querySelector('.user-role-select');

                    const newRole = roleSelect.value;

                    try {
                        const response = await fetch(`${API_URL}/users/${user.id}/role`, {
                            method: 'PATCH',

                            headers: {
                                'Content-Type': 'application/json',

                                Authorization: `Bearer ${token}`
                            },

                            body: JSON.stringify({
                                role: newRole
                            })
                        });

                        const data = await response.json();

                        if (!response.ok) {
                            alert(data.message || 'Η αλλαγή ρόλου απέτυχε.');

                            return;
                        }

                        await loadUsers();
                    } catch (error) {
                        console.error('Role update error:', error);

                        alert('Δεν ήταν δυνατή η επικοινωνία με τον server.');
                    }
                });
            }

            const deleteUserButton = card.querySelector('.delete-user-btn');

            if (deleteUserButton) {
                deleteUserButton.addEventListener('click', async () => {
                    const confirmed = confirm(
                        `Θέλεις σίγουρα να διαγράψεις τον χρήστη ${user.first_name} ${user.last_name};`
                    );

                    if (!confirmed) {
                        return;
                    }

                    try {
                        const response = await fetch(`${API_URL}/users/${user.id}`, {
                            method: 'DELETE',

                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });

                        const data = await response.json();

                        if (!response.ok) {
                            alert(data.message || 'Η διαγραφή απέτυχε.');

                            return;
                        }

                        await loadUsers();
                    } catch (error) {
                        console.error('Delete user error:', error);

                        alert('Δεν ήταν δυνατή η επικοινωνία με τον server.');
                    }
                });
            }

            const approveProviderButton = card.querySelector('.approve-provider-btn');

            const rejectProviderButton = card.querySelector('.reject-provider-btn');

            const updateProviderApproval = async (approvalStatus) => {
                try {
                    const response = await fetch(`${API_URL}/users/${user.id}/approval`, {
                        method: 'PATCH',

                        headers: {
                            'Content-Type': 'application/json',

                            Authorization: `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            approval_status: approvalStatus
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        alert(data.message || 'Η ενημέρωση της αίτησης απέτυχε.');

                        return;
                    }

                    await loadUsers();
                } catch (error) {
                    console.error('Provider approval error:', error);

                    alert('Δεν ήταν δυνατή η επικοινωνία με τον server.');
                }
            };

            if (approveProviderButton) {
                approveProviderButton.addEventListener('click', async () => {
                    const confirmed = confirm(
                        `Θέλεις να εγκρίνεις τον πάροχο ${user.first_name} ${user.last_name};`
                    );

                    if (!confirmed) {
                        return;
                    }

                    await updateProviderApproval('approved');
                });
            }

            if (rejectProviderButton) {
                rejectProviderButton.addEventListener('click', async () => {
                    const confirmed = confirm(
                        `Θέλεις να απορρίψεις την αίτηση του ${user.first_name} ${user.last_name};`
                    );

                    if (!confirmed) {
                        return;
                    }

                    await updateProviderApproval('rejected');
                });
            }
        });
    } catch (error) {
        console.error('Admin users error:', error);

        usersList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση χρηστών.</p>';
    }
};

const loadBookings = async () => {
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const bookings = await response.json();

        adminBookingsList.innerHTML = '';

        if (!response.ok) {
            adminBookingsList.innerHTML = `
                <p>
                    ${bookings.message || 'Αποτυχία φόρτωσης κρατήσεων.'}
                </p>
            `;

            return;
        }

        if (bookings.length === 0) {
            adminBookingsList.innerHTML = '<p>Δεν υπάρχουν κρατήσεις.</p>';

            return;
        }

        bookings.forEach((booking) => {
            const card = document.createElement('div');

            card.className = 'dashboard-card';

            card.innerHTML = `
                <h3>
                    ${booking.service_name}
                </h3>

                <p>
                    <strong>Πελάτης:</strong>
                    ${booking.customer_first_name}
                    ${booking.customer_last_name}
                </p>

                <p>
                    <strong>Πάροχος:</strong>
                    ${booking.provider_first_name}
                    ${booking.provider_last_name}
                </p>

                <p>
                    <strong>Ημερομηνία:</strong>
                    ${formatDate(booking.booking_date)}
                </p>

                <p>
                    <strong>Ώρα:</strong>
                    ${booking.start_time}
                    -
                    ${booking.end_time}
                </p>

                <p>
                    <strong>Κατάσταση:</strong>
                    ${translateStatus(booking.status)}
                </p>
            `;

            adminBookingsList.appendChild(card);
        });
    } catch (error) {
        console.error('Admin bookings error:', error);

        adminBookingsList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση κρατήσεων.</p>';
    }
};

const loadServices = async () => {
    try {
        const response = await fetch(`${API_URL}/services`);

        const services = await response.json();

        adminServicesList.innerHTML = '';

        if (!response.ok) {
            adminServicesList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση υπηρεσιών.</p>';

            return;
        }

        if (services.length === 0) {
            adminServicesList.innerHTML = '<p>Δεν υπάρχουν υπηρεσίες.</p>';

            return;
        }

        services.forEach((service) => {
            const card = document.createElement('div');

            card.className = 'dashboard-card';

            card.innerHTML = `
                <h3>
                    ${service.name}
                </h3>

                <p>
                    ${service.description || ''}
                </p>

                <p>
                    <strong>Κατηγορία:</strong>
                    ${service.category_name}
                </p>

                <p>
                    <strong>Πάροχος:</strong>
                    ${service.provider_first_name}
                    ${service.provider_last_name}
                </p>

                <p>
                    <strong>Διάρκεια:</strong>
                    ${service.duration_minutes} λεπτά
                </p>

                <p>
                    <strong>Τιμή:</strong>
                    ${service.price} €
                </p>
            `;

            adminServicesList.appendChild(card);
        });
    } catch (error) {
        console.error('Admin services error:', error);

        adminServicesList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση υπηρεσιών.</p>';
    }
};

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');

    window.location.href = 'login.html';
});

loadUsers();
loadBookings();
loadServices();
