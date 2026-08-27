const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
if (!token || (role !== 'provider' && role !== 'admin')) {
    window.location.href = 'login.html';
}

const providerBookingsList = document.getElementById('providerBookingsList');
const providerCalendar = document.getElementById('providerCalendar');
const calendarMonthTitle = document.getElementById('calendarMonthTitle');

const selectedBookingDateTitle = document.getElementById('selectedBookingDateTitle');
const previousMonthBtn = document.getElementById('previousMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
let providerBookings = [];

let calendarDate = new Date();
const providerServicesList = document.getElementById('providerServicesList');
const providerAvailabilityList = document.getElementById('providerAvailabilityList');

const logoutBtn = document.getElementById('logoutBtn');
const availabilityForm = document.getElementById('availabilityForm');
const availabilityMessage = document.getElementById('availabilityMessage');

const availabilitySubmitBtn = document.getElementById('availabilitySubmitBtn');
let editingAvailabilityId = null;
const serviceForm = document.getElementById('serviceForm');

const serviceCategory = document.getElementById('serviceCategory');
const serviceCategoryFilter = document.getElementById('serviceCategoryFilter');
let providerServices = [];

const serviceMessage = document.getElementById('serviceMessage');
const serviceSubmitBtn = document.getElementById('serviceSubmitBtn');
let editingServiceId = null;

const providerHistoryList = document.getElementById('providerHistoryList');

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

        serviceCategoryFilter.innerHTML = `
            <option value="">Όλες οι κατηγορίες</option>
        `;

        categories.forEach((category) => {
            const option = document.createElement('option');

            option.value = category.id;
            option.textContent = category.name;

            serviceCategory.appendChild(option);
            const filterOption = document.createElement('option');

            filterOption.value = category.id;
            filterOption.textContent = category.name;

            serviceCategoryFilter.appendChild(filterOption);
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

            card.className = card.className = 'dashboard-card service-card';
            card.dataset.categoryId = service.category_id;
            ('dashboard-card');

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

serviceCategoryFilter.addEventListener('change', () => {
    const selectedCategoryId = serviceCategoryFilter.value;

    const serviceCards = document.querySelectorAll('.service-card');

    serviceCards.forEach((card) => {
        if (!selectedCategoryId || card.dataset.categoryId === selectedCategoryId) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});
const renderBookingDetails = (bookings, selectedDate = null) => {
    providerBookingsList.innerHTML = '';

    if (selectedDate) {
        selectedBookingDateTitle.textContent = `Ραντεβού ${formatDate(selectedDate)}`;
    }

    if (bookings.length === 0) {
        providerBookingsList.innerHTML = '<p>Δεν υπάρχουν ραντεβού για αυτή την ημέρα.</p>';

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
                <strong>Ώρα:</strong>
                ${booking.start_time} - ${booking.end_time}
            </p>

            <p>
                <strong>Κατάσταση:</strong>

                <span class="booking-status status-${booking.status}">
                    ${translateStatus(booking.status)}
                </span>
            </p>

            <div class="booking-actions">

                ${
                    booking.status === 'pending'
                        ? `
                            <button
                                class="success-btn approve-btn"
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
                                class="danger-btn cancel-btn"
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
};

const renderProviderCalendar = () => {
    providerCalendar.innerHTML = '';

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const monthNames = [
        'Ιανουάριος',
        'Φεβρουάριος',
        'Μάρτιος',
        'Απρίλιος',
        'Μάιος',
        'Ιούνιος',
        'Ιούλιος',
        'Αύγουστος',
        'Σεπτέμβριος',
        'Οκτώβριος',
        'Νοέμβριος',
        'Δεκέμβριος'
    ];

    calendarMonthTitle.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);

    let startingDay = firstDay.getDay();

    if (startingDay === 0) {
        startingDay = 7;
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i < startingDay; i += 1) {
        const emptyCell = document.createElement('div');

        emptyCell.className = 'calendar-day empty';

        providerCalendar.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateString =
            `${year}-${String(month + 1).padStart(2, '0')}-` + `${String(day).padStart(2, '0')}`;

        const dayBookings = providerBookings.filter(
            (booking) => booking.booking_date === dateString && booking.status !== 'cancelled'
        );

        const dayCell = document.createElement('button');

        dayCell.type = 'button';
        dayCell.className = 'calendar-day';

        const today = new Date();

        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayCell.classList.add('today');
        }

        if (dayBookings.length > 0) {
            dayCell.classList.add('has-bookings');
        }

        dayCell.innerHTML = `
            <span class="calendar-day-number">${day}</span>

            ${
                dayBookings.length > 0
                    ? `
                        <span class="calendar-booking-count">
                            ${dayBookings.length}
                            ${dayBookings.length === 1 ? 'ραντεβού' : 'ραντεβού'}
                        </span>
                    `
                    : ''
            }
        `;

        dayCell.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day.selected').forEach((cell) => {
                cell.classList.remove('selected');
            });

            dayCell.classList.add('selected');

            renderBookingDetails(dayBookings, dateString);
        });

        providerCalendar.appendChild(dayCell);
    }
};

const renderProviderHistory = () => {
    providerHistoryList.innerHTML = '';

    const historyBookings = providerBookings
        .filter((booking) => booking.status === 'completed' || booking.status === 'cancelled')
        .sort((a, b) => {
            const dateA = new Date(`${a.booking_date}T${a.start_time}`);
            const dateB = new Date(`${b.booking_date}T${b.start_time}`);

            return dateB - dateA;
        });

    if (historyBookings.length === 0) {
        providerHistoryList.innerHTML = '<p>Δεν υπάρχουν ολοκληρωμένα ή ακυρωμένα ραντεβού.</p>';

        return;
    }

    historyBookings.forEach((booking) => {
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
                ${booking.start_time} - ${booking.end_time}
            </p>

            <p>
                <strong>Κατάσταση:</strong>
                <span class="booking-status status-${booking.status}">
                    ${translateStatus(booking.status)}
                </span>
            </p>
        `;

        providerHistoryList.appendChild(card);
    });
};

const loadProviderBookings = async () => {
    try {
        const response = await fetch(`${API_URL}/bookings/provider`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const bookings = await response.json();

        if (!response.ok) {
            providerBookingsList.innerHTML = `
                <p>
                    ${bookings.message || 'Δεν ήταν δυνατή η φόρτωση ραντεβού.'}
                </p>
            `;

            return;
        }

        providerBookings = bookings;

        renderProviderCalendar();
        renderProviderHistory();

        providerBookingsList.innerHTML = '';

        selectedBookingDateTitle.textContent = 'Επίλεξε ημέρα για να δεις τα ραντεβού';
    } catch (error) {
        console.error('Provider bookings error:', error);

        providerBookingsList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση ραντεβού.</p>';
    }
};

previousMonthBtn.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);

    renderProviderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);

    renderProviderCalendar();
});

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
