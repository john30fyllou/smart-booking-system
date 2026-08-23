const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token || (role !== 'provider' && role !== 'admin')) {
    window.location.href = 'login.html';
}

const providerBookingsList = document.getElementById('providerBookingsList');

const providerServicesList = document.getElementById('providerServicesList');

const providerAvailabilityList = document.getElementById('providerAvailabilityList');

const logoutBtn = document.getElementById('logoutBtn');

const availabilityForm = document.getElementById('availabilityForm');

const availabilityMessage = document.getElementById('availabilityMessage');

const availabilitySubmitBtn = document.getElementById('availabilitySubmitBtn');

let editingAvailabilityId = null;

const serviceForm = document.getElementById('serviceForm');

const serviceCategory = document.getElementById('serviceCategory');

const serviceMessage = document.getElementById('serviceMessage');

const serviceSubmitBtn = document.getElementById('serviceSubmitBtn');

let editingServiceId = null;

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

const loadCategories = async () => {
    try {
        const response = await fetch(`${API_URL}/categories`);

        const categories = await response.json();

        serviceCategory.innerHTML = `
            <option value="">
                Επίλεξε κατηγορία
            </option>
        `;

        categories.forEach((category) => {
            const option = document.createElement('option');

            option.value = category.id;
            option.textContent = category.name;

            serviceCategory.appendChild(option);
        });
    } catch (error) {
        console.error('Categories loading error:', error);
    }
};

serviceForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const categoryId = Number(serviceCategory.value);

    const name = document.getElementById('serviceName').value.trim();

    const description = document.getElementById('serviceDescription').value.trim();

    const durationMinutes = Number(document.getElementById('serviceDuration').value);

    const price = Number(document.getElementById('servicePrice').value);

    if (!categoryId || !name || !durationMinutes || price < 0) {
        serviceMessage.textContent = 'Συμπλήρωσε σωστά όλα τα υποχρεωτικά πεδία.';

        return;
    }

    serviceMessage.textContent = 'Αποθήκευση...';

    try {
        const url = editingServiceId
            ? `${API_URL}/services/${editingServiceId}`
            : `${API_URL}/services`;

        const method = editingServiceId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,

            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                category_id: categoryId,
                name,
                description,
                duration_minutes: durationMinutes,
                price
            })
        });

        const data = await response.json();

        if (!response.ok) {
            serviceMessage.textContent = data.message || 'Η προσθήκη απέτυχε.';

            return;
        }

        serviceMessage.textContent = editingServiceId
            ? 'Η υπηρεσία ενημερώθηκε επιτυχώς!'
            : 'Η υπηρεσία προστέθηκε επιτυχώς!';

        editingServiceId = null;

        serviceSubmitBtn.textContent = 'Προσθήκη';

        serviceForm.reset();

        await loadProviderServices();
    } catch (error) {
        console.error('Create service error:', error);

        serviceMessage.textContent = 'Δεν ήταν δυνατή η επικοινωνία με τον server.';
    }
});

const updateBookingStatus = async (bookingId, newStatus) => {
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
            method: 'PATCH',

            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                status: newStatus
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || 'Η αλλαγή κατάστασης απέτυχε');

            return;
        }

        await loadProviderBookings();
    } catch (error) {
        console.error('Status update error:', error);

        alert('Δεν ήταν δυνατή η επικοινωνία με τον server.');
    }
};

const getCurrentUser = async () => {
    const response = await fetch(`${API_URL}/users/profile`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Unable to load profile');
    }

    return data.user;
};

const loadProviderServices = async () => {
    try {
        const currentUser = await getCurrentUser();

        const response = await fetch(`${API_URL}/services`);

        const services = await response.json();

        providerServicesList.innerHTML = '';

        if (!response.ok) {
            providerServicesList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση υπηρεσιών.</p>';

            return;
        }

        const myServices = services.filter(
            (service) => Number(service.provider_id) === Number(currentUser.id)
        );

        if (myServices.length === 0) {
            providerServicesList.innerHTML = '<p>Δεν έχεις δημιουργήσει υπηρεσίες.</p>';

            return;
        }

        myServices.forEach((service) => {
            const card = document.createElement('div');

            card.className = 'dashboard-card';

            card.innerHTML = `
                <h3>${service.name}</h3>

                <p>
                    ${service.description || ''}
                </p>

                <p>
                    <strong>Κατηγορία:</strong>
                    ${service.category_name}
                </p>

                <p>
                    <strong>Διάρκεια:</strong>
                    ${service.duration_minutes} λεπτά
                </p>

                <p>
                    <strong>Τιμή:</strong>
                    ${service.price} €
                </p>

                <div class="booking-actions">
                    <button
                        type="button"
                        class="btn edit-service-btn"
                    >
                        Επεξεργασία
                    </button>

                    <button
                        type="button"
                        class="btn delete-service-btn"
                    >
                        Διαγραφή
                    </button>
                </div>
            `;

            providerServicesList.appendChild(card);

            const editButton = card.querySelector('.edit-service-btn');

            editButton.addEventListener('click', () => {
                editingServiceId = service.id;

                serviceCategory.value = service.category_id;

                document.getElementById('serviceName').value = service.name;

                document.getElementById('serviceDescription').value = service.description || '';

                document.getElementById('serviceDuration').value = service.duration_minutes;

                document.getElementById('servicePrice').value = service.price;

                serviceSubmitBtn.textContent = 'Αποθήκευση αλλαγών';

                serviceMessage.textContent = 'Επεξεργασία υπηρεσίας';

                document.getElementById('services').scrollIntoView({
                    behavior: 'smooth'
                });
            });

            const deleteButton = card.querySelector('.delete-service-btn');

            deleteButton.addEventListener('click', async () => {
                const confirmed = confirm('Θέλεις σίγουρα να διαγράψεις αυτή την υπηρεσία;');

                if (!confirmed) {
                    return;
                }

                try {
                    const response = await fetch(`${API_URL}/services/${service.id}`, {
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

                    await loadProviderServices();
                } catch (error) {
                    console.error('Delete service error:', error);

                    alert('Δεν ήταν δυνατή η επικοινωνία με τον server.');
                }
            });
        });
    } catch (error) {
        console.error('Provider services error:', error);

        providerServicesList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση υπηρεσιών.</p>';
    }
};

const loadProviderBookings = async () => {
    try {
        const response = await fetch(`${API_URL}/bookings/provider`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const bookings = await response.json();

        providerBookingsList.innerHTML = '';

        if (!response.ok) {
            providerBookingsList.innerHTML = `
                <p>
                    ${bookings.message || 'Δεν ήταν δυνατή η φόρτωση ραντεβού.'}
                </p>
            `;

            return;
        }

        if (bookings.length === 0) {
            providerBookingsList.innerHTML = '<p>Δεν υπάρχουν ραντεβού.</p>';

            return;
        }

        bookings.forEach((booking) => {
            const card = document.createElement('div');

            card.className = 'dashboard-card';

            card.innerHTML = `
                <h3>${booking.service_name}</h3>

                <p>
                    <strong>Πελάτης:</strong>
                    ${booking.customer_first_name}
                    ${booking.customer_last_name}
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

                <div class="booking-actions">

                    ${
                        booking.status === 'pending'
                            ? `
                                <button
                                    class="btn approve-btn"
                                    type="button"
                                >
                                    Έγκριση
                                </button>
                            `
                            : ''
                    }

                    ${
                        booking.status === 'approved'
                            ? `
                                <button
                                    class="btn complete-btn"
                                    type="button"
                                >
                                    Ολοκλήρωση
                                </button>
                            `
                            : ''
                    }

                    ${
                        booking.status === 'pending' || booking.status === 'approved'
                            ? `
                                <button
                                    class="btn cancel-btn"
                                    type="button"
                                >
                                    Ακύρωση
                                </button>
                            `
                            : ''
                    }

                </div>
            `;

            providerBookingsList.appendChild(card);

            const approveButton = card.querySelector('.approve-btn');

            if (approveButton) {
                approveButton.addEventListener('click', () => {
                    updateBookingStatus(booking.id, 'approved');
                });
            }

            const completeButton = card.querySelector('.complete-btn');

            if (completeButton) {
                completeButton.addEventListener('click', () => {
                    updateBookingStatus(booking.id, 'completed');
                });
            }

            const cancelButton = card.querySelector('.cancel-btn');

            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    updateBookingStatus(booking.id, 'cancelled');
                });
            }
        });
    } catch (error) {
        console.error('Provider bookings error:', error);

        providerBookingsList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση ραντεβού.</p>';
    }
};

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');

    window.location.href = 'login.html';
});

const loadProviderAvailability = async () => {
    try {
        const currentUser = await getCurrentUser();

        const response = await fetch(`${API_URL}/availability`);

        const availability = await response.json();

        providerAvailabilityList.innerHTML = '';

        if (!response.ok) {
            providerAvailabilityList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση διαθεσιμότητας.</p>';

            return;
        }

        const myAvailability = availability.filter(
            (item) => Number(item.provider_id) === Number(currentUser.id)
        );

        if (myAvailability.length === 0) {
            providerAvailabilityList.innerHTML = '<p>Δεν έχεις δηλώσει διαθεσιμότητα.</p>';

            return;
        }

        myAvailability.forEach((item) => {
            const card = document.createElement('div');

            card.className = 'dashboard-card';

            card.innerHTML = `
                <h3>
                    ${formatDate(item.available_date)}
                </h3>

                <p>
                    <strong>Από:</strong>
                    ${item.start_time}
                </p>

                <p>
                    <strong>Έως:</strong>
                    ${item.end_time}
                </p>

                <div class="booking-actions">
                    <button
                        type="button"
                        class="btn edit-availability-btn"
                    >
                        Επεξεργασία
                    </button>

                    <button
                        type="button"
                        class="btn delete-availability-btn"
                    >
                        Διαγραφή
                    </button>
                </div>
            `;

            providerAvailabilityList.appendChild(card);

            const editButton = card.querySelector('.edit-availability-btn');

            editButton.addEventListener('click', () => {
                editingAvailabilityId = item.id;

                document.getElementById('availabilityDate').value = item.available_date;

                const [startHour, startMinute] = item.start_time.split(':');

                const [endHour, endMinute] = item.end_time.split(':');

                document.getElementById('availabilityStartHour').value = startHour;

                document.getElementById('availabilityStartMinute').value = startMinute;

                document.getElementById('availabilityEndHour').value = endHour;

                document.getElementById('availabilityEndMinute').value = endMinute;

                availabilitySubmitBtn.textContent = 'Αποθήκευση αλλαγών';

                availabilityMessage.textContent = 'Επεξεργασία διαθεσιμότητας';

                document.getElementById('availability').scrollIntoView({
                    behavior: 'smooth'
                });
            });

            const deleteButton = card.querySelector('.delete-availability-btn');

            deleteButton.addEventListener('click', async () => {
                const confirmed = confirm('Θέλεις σίγουρα να διαγράψεις αυτή τη διαθεσιμότητα;');

                if (!confirmed) {
                    return;
                }

                try {
                    const response = await fetch(`${API_URL}/availability/${item.id}`, {
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

                    await loadProviderAvailability();
                } catch (error) {
                    console.error('Delete availability error:', error);

                    alert('Δεν ήταν δυνατή η επικοινωνία με τον server.');
                }
            });
        });
    } catch (error) {
        console.error('Provider availability error:', error);

        providerAvailabilityList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση διαθεσιμότητας.</p>';
    }
};

availabilityForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const availableDate = document.getElementById('availabilityDate').value;

    const startHour = document.getElementById('availabilityStartHour').value;

    const startMinute = document.getElementById('availabilityStartMinute').value;

    const endHour = document.getElementById('availabilityEndHour').value;

    const endMinute = document.getElementById('availabilityEndMinute').value;

    if (!availableDate || !startHour || !startMinute || !endHour || !endMinute) {
        availabilityMessage.textContent = 'Συμπλήρωσε όλα τα πεδία.';

        return;
    }

    const startTime = `${startHour}:${startMinute}`;

    const endTime = `${endHour}:${endMinute}`;

    if (!availableDate || !startTime || !endTime) {
        availabilityMessage.textContent = 'Συμπλήρωσε όλα τα πεδία.';

        return;
    }

    if (startTime >= endTime) {
        availabilityMessage.textContent = 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.';

        return;
    }

    availabilityMessage.textContent = 'Αποθήκευση...';

    try {
        const url = editingAvailabilityId
            ? `${API_URL}/availability/${editingAvailabilityId}`
            : `${API_URL}/availability`;

        const method = editingAvailabilityId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,

            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                available_date: availableDate,
                start_time: startTime,
                end_time: endTime
            })
        });

        const data = await response.json();

        if (!response.ok) {
            availabilityMessage.textContent = data.message || 'Η προσθήκη απέτυχε.';

            return;
        }

        availabilityMessage.textContent = editingAvailabilityId
            ? 'Η διαθεσιμότητα ενημερώθηκε επιτυχώς!'
            : 'Η διαθεσιμότητα προστέθηκε επιτυχώς!';

        editingAvailabilityId = null;

        availabilitySubmitBtn.textContent = 'Προσθήκη';

        availabilityForm.reset();

        await loadProviderAvailability();
    } catch (error) {
        console.error('Create availability error:', error);

        availabilityMessage.textContent = 'Δεν ήταν δυνατή η επικοινωνία με τον server.';
    }
});

loadProviderBookings();
loadProviderServices();
loadProviderAvailability();
loadCategories();
