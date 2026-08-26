const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token || (role !== 'customer' && role !== 'admin')) {
    window.location.href = 'login.html';
}

const servicesList = document.getElementById('servicesList');
const activeBookingsList = document.getElementById('activeBookingsList');
const bookingHistoryList = document.getElementById('bookingHistoryList');

const bookingDateInput = document.getElementById('bookingDate');
const bookingTimeSelect = document.getElementById('bookingTime');

const intentForm = document.getElementById('intentForm');
const intentPrompt = document.getElementById('intentPrompt');
const intentMessage = document.getElementById('intentMessage');
const aiResult = document.getElementById('aiResult');

const serviceSuggestions = document.getElementById('serviceSuggestions');
let availableServices = [];
const bookingForm = document.getElementById('bookingForm');
const bookingMessage = document.getElementById('bookingMessage');

const logoutBtn = document.getElementById('logoutBtn');
let reschedulingBookingId = null;

const serviceCategoryFilters = document.getElementById('serviceCategoryFilters');
const showMoreServicesBtn = document.getElementById('showMoreServicesBtn');

let selectedServiceCategory = 'all';
let visibleServicesCount = 8;

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

const renderServiceFilters = () => {
    serviceCategoryFilters.innerHTML = '';

    const categories = [
        ...new Set(availableServices.map((service) => service.category_name).filter(Boolean))
    ];

    const filterOptions = ['all', ...categories];

    filterOptions.forEach((category) => {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'service-filter-btn';

        if (category === selectedServiceCategory) {
            button.classList.add('active');
        }

        button.textContent = category === 'all' ? 'Όλες' : category;

        button.addEventListener('click', () => {
            selectedServiceCategory = category;
            visibleServicesCount = 6;

            renderServiceFilters();
            renderServices();
        });

        serviceCategoryFilters.appendChild(button);
    });
};

const renderServices = () => {
    servicesList.innerHTML = '';

    const filteredServices =
        selectedServiceCategory === 'all'
            ? availableServices
            : availableServices.filter(
                  (service) => service.category_name === selectedServiceCategory
              );

    if (filteredServices.length === 0) {
        servicesList.innerHTML = '<p>Δεν υπάρχουν υπηρεσίες σε αυτή την κατηγορία.</p>';

        showMoreServicesBtn.style.display = 'none';
        return;
    }

    const visibleServices = filteredServices.slice(0, visibleServicesCount);

    visibleServices.forEach((service) => {
        const card = document.createElement('div');

        card.className = 'dashboard-card';

        card.innerHTML = `
            <h3>${service.name}</h3>

            <p>${service.description || ''}</p>

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

            <button
                class="btn book-service-btn"
                type="button"
            >
                Κράτηση
            </button>
        `;

        servicesList.appendChild(card);

        const bookingButton = card.querySelector('.book-service-btn');

        bookingButton.addEventListener('click', () => {
            reschedulingBookingId = null;

            document.getElementById('selectedServiceId').value = service.id;

            document.getElementById('selectedServiceName').textContent = service.name;

            bookingDateInput.value = '';

            bookingTimeSelect.innerHTML = `
                <option value="">
                    Επίλεξε πρώτα ημερομηνία
                </option>
            `;

            bookingMessage.textContent = '';

            const bookingSection = document.getElementById('booking-section');

            bookingSection.style.display = 'block';

            bookingSection.scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    showMoreServicesBtn.style.display =
        filteredServices.length > visibleServicesCount ? 'inline-flex' : 'none';
};

const loadServices = async () => {
    try {
        const response = await fetch(`${API_URL}/services`);
        const services = await response.json();

        servicesList.innerHTML = '';

        if (!response.ok) {
            servicesList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση υπηρεσιών.</p>';
            return;
        }

        if (services.length === 0) {
            servicesList.innerHTML = '<p>Δεν υπάρχουν διαθέσιμες υπηρεσίες.</p>';
            return;
        }

        // Αποθηκεύουμε όλες τις υπηρεσίες
        availableServices = services;

        // Φτιάχνουμε τα φίλτρα κατηγοριών
        renderServiceFilters();

        // Εμφανίζουμε τις πρώτες 6 υπηρεσίες
        renderServices();
    } catch (error) {
        console.error('Services loading error:', error);

        servicesList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση υπηρεσιών.</p>';
    }
};

const loadBookings = async () => {
    try {
        const response = await fetch(`${API_URL}/bookings/my`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const bookings = await response.json();

        activeBookingsList.innerHTML = '';
        bookingHistoryList.innerHTML = '';

        if (!response.ok) {
            activeBookingsList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση κρατήσεων.</p>';

            return;
        }

        const activeBookings = bookings.filter(
            (booking) => booking.status === 'pending' || booking.status === 'approved'
        );

        const historyBookings = bookings.filter(
            (booking) => booking.status === 'completed' || booking.status === 'cancelled'
        );

        if (activeBookings.length === 0) {
            activeBookingsList.innerHTML = '<p>Δεν έχεις ενεργά ραντεβού.</p>';
        } else {
            activeBookings.forEach((booking) => {
                const card = document.createElement('div');

                card.className = 'dashboard-card';

                card.innerHTML = `
                    <h3>${booking.service_name}</h3>

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
                        <strong>Πάροχος:</strong>
                        ${booking.provider_first_name}
                        ${booking.provider_last_name}
                    </p>

                    <p>
                        <strong>Κατάσταση:</strong>

                        <span
                            class="booking-status
                            status-${booking.status}"
                        >
                            ${translateStatus(booking.status)}
                        </span>
                    </p>

                    <div class="booking-actions">
                        <button
                            type="button"
                            class="
                                btn
                                customer-reschedule-booking-btn
                            "
                        >
                            Αλλαγή ραντεβού
                        </button>

                        <button
                            type="button"
                            class="
                                danger-btn
                                customer-cancel-booking-btn
                            "
                        >
                            Ακύρωση
                        </button>
                    </div>
                `;

                activeBookingsList.appendChild(card);

                const rescheduleButton = card.querySelector('.customer-reschedule-booking-btn');

                rescheduleButton.addEventListener('click', () => {
                    reschedulingBookingId = booking.id;

                    document.getElementById('selectedServiceId').value = booking.service_id;

                    document.getElementById('selectedServiceName').textContent =
                        booking.service_name;

                    bookingDateInput.value = booking.booking_date.split('T')[0];

                    bookingTimeSelect.innerHTML = `
                        <option value="">
                            Φόρτωση διαθέσιμων ωρών...
                        </option>
                    `;

                    bookingDateInput.dispatchEvent(new Event('change'));

                    bookingMessage.textContent = 'Επίλεξε νέα ημερομηνία και ώρα.';

                    const bookingSection = document.getElementById('booking-section');

                    bookingSection.style.display = 'block';

                    bookingSection.scrollIntoView({
                        behavior: 'smooth'
                    });
                });

                const cancelButton = card.querySelector('.customer-cancel-booking-btn');

                cancelButton.addEventListener('click', async () => {
                    const confirmed = confirm('Θέλεις σίγουρα να ακυρώσεις αυτό το ραντεβού;');

                    if (!confirmed) {
                        return;
                    }

                    try {
                        const response = await fetch(`${API_URL}/bookings/${booking.id}/cancel`, {
                            method: 'PATCH',

                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });

                        const data = await response.json();

                        if (!response.ok) {
                            alert(data.message || 'Η ακύρωση του ραντεβού απέτυχε.');

                            return;
                        }

                        // Αν ακυρώθηκε το booking
                        // που επεξεργαζόμασταν.
                        if (reschedulingBookingId === booking.id) {
                            reschedulingBookingId = null;

                            document.getElementById('booking-section').style.display = 'none';
                        }

                        await loadBookings();
                    } catch (error) {
                        console.error('Customer cancel booking error:', error);

                        alert('Δεν ήταν δυνατή η επικοινωνία με τον server.');
                    }
                });
            });
        }

        if (historyBookings.length === 0) {
            bookingHistoryList.innerHTML = '<p>Δεν υπάρχει ιστορικό ραντεβού.</p>';
        } else {
            historyBookings.forEach((booking) => {
                const card = document.createElement('div');

                card.className = 'dashboard-card history-booking-card';

                card.innerHTML = `
                    <h3>${booking.service_name}</h3>

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
                        <strong>Πάροχος:</strong>
                        ${booking.provider_first_name}
                        ${booking.provider_last_name}
                    </p>

                    <p>
                        <strong>Κατάσταση:</strong>

                        <span
                            class="booking-status
                            status-${booking.status}"
                        >
                            ${translateStatus(booking.status)}
                        </span>
                    </p>
                `;

                bookingHistoryList.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Bookings loading error:', error);

        activeBookingsList.innerHTML = '<p>Δεν ήταν δυνατή η φόρτωση κρατήσεων.</p>';
    }
};

bookingDateInput.addEventListener('change', async () => {
    const serviceId = Number(document.getElementById('selectedServiceId').value);

    const selectedDate = bookingDateInput.value;

    bookingTimeSelect.innerHTML = `
            <option value="">
                Φόρτωση διαθέσιμων ωρών...
            </option>
        `;

    if (!serviceId || !selectedDate) {
        bookingTimeSelect.innerHTML = `
                <option value="">
                    Επίλεξε πρώτα ημερομηνία
                </option>
            `;

        return;
    }

    try {
        let slotsUrl =
            `${API_URL}/bookings/available-slots` +
            `?service_id=${serviceId}` +
            `&date=${selectedDate}`;

        if (reschedulingBookingId) {
            slotsUrl += `&exclude_booking_id=` + `${reschedulingBookingId}`;
        }

        const response = await fetch(slotsUrl, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Slots API error:', data);

            bookingTimeSelect.innerHTML = `
                    <option value="">
                        ${data.message || 'Δεν ήταν δυνατή η φόρτωση'}
                    </option>
                `;

            return;
        }

        if (!data.slots || data.slots.length === 0) {
            bookingTimeSelect.innerHTML = `
                    <option value="">
                        Δεν υπάρχουν διαθέσιμες ώρες
                    </option>
                `;

            return;
        }

        bookingTimeSelect.innerHTML = `
                <option value="">
                    Επίλεξε ώρα
                </option>
            `;

        data.slots.forEach((slot) => {
            const option = document.createElement('option');

            option.value = slot;
            option.textContent = slot;

            bookingTimeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Available slots error:', error);

        bookingTimeSelect.innerHTML = `
                <option value="">
                    Σφάλμα φόρτωσης ωρών
                </option>
            `;
    }
});

bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const serviceId = Number(document.getElementById('selectedServiceId').value);

    const bookingDate = bookingDateInput.value;

    const startTime = bookingTimeSelect.value;

    if (!serviceId || !bookingDate || !startTime) {
        bookingMessage.textContent = 'Επίλεξε ημερομηνία και διαθέσιμη ώρα.';

        return;
    }

    const isRescheduling = reschedulingBookingId !== null;

    bookingMessage.textContent = isRescheduling
        ? 'Γίνεται αλλαγή του ραντεβού...'
        : 'Γίνεται δημιουργία της κράτησης...';

    try {
        const url = isRescheduling
            ? `${API_URL}/bookings/${reschedulingBookingId}/reschedule`
            : `${API_URL}/bookings`;

        const method = isRescheduling ? 'PATCH' : 'POST';

        const requestBody = isRescheduling
            ? {
                  booking_date: bookingDate,
                  start_time: startTime
              }
            : {
                  service_id: serviceId,
                  booking_date: bookingDate,
                  start_time: startTime
              };

        const response = await fetch(url, {
            method,

            headers: {
                'Content-Type': 'application/json',

                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            bookingMessage.textContent =
                data.message ||
                (isRescheduling ? 'Η αλλαγή του ραντεβού απέτυχε.' : 'Η κράτηση απέτυχε.');

            return;
        }

        bookingMessage.textContent = isRescheduling
            ? 'Το ραντεβού άλλαξε επιτυχώς και περιμένει νέα έγκριση.'
            : 'Η κράτηση δημιουργήθηκε επιτυχώς!';

        reschedulingBookingId = null;

        await loadBookings();

        bookingDateInput.value = '';

        bookingTimeSelect.innerHTML = `
                <option value="">
                    Επίλεξε πρώτα ημερομηνία
                </option>
            `;

        document.getElementById('booking-section').style.display = 'none';
    } catch (error) {
        console.error('Booking error:', error);

        bookingMessage.textContent = 'Δεν ήταν δυνατή η επικοινωνία με τον server.';
    }
});

const normalizeText = (text) => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

const hideServiceSuggestions = () => {
    serviceSuggestions.innerHTML = '';
    serviceSuggestions.style.display = 'none';
};

intentPrompt.addEventListener('input', () => {
    const query = normalizeText(intentPrompt.value.trim());

    serviceSuggestions.innerHTML = '';

    if (query.length < 2) {
        hideServiceSuggestions();
        return;
    }

    const matchingServices = availableServices
        .filter((service) => {
            const name = normalizeText(service.name || '');

            const words = name.split(/\s+/);

            return words.some((word) => word.startsWith(query));
        })
        .sort((a, b) => {
            const nameA = normalizeText(a.name || '');
            const nameB = normalizeText(b.name || '');

            return nameA.localeCompare(nameB, 'el');
        })
        .slice(0, 5);
    if (matchingServices.length === 0) {
        hideServiceSuggestions();
        return;
    }

    matchingServices.forEach((service) => {
        const suggestion = document.createElement('button');

        suggestion.type = 'button';
        suggestion.className = 'service-suggestion';

        suggestion.innerHTML = `
            <span class="suggestion-name">
                ${service.name}
            </span>

            <span class="suggestion-category">
                ${service.category_name}
            </span>
        `;

        suggestion.addEventListener('click', () => {
            intentPrompt.value = service.name;

            hideServiceSuggestions();

            intentPrompt.focus();
        });

        serviceSuggestions.appendChild(suggestion);
    });

    serviceSuggestions.style.display = 'block';
});

document.addEventListener('click', (event) => {
    if (!intentPrompt.contains(event.target) && !serviceSuggestions.contains(event.target)) {
        hideServiceSuggestions();
    }
});

intentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const prompt = intentPrompt.value.trim();

    if (!prompt) {
        return;
    }

    intentMessage.textContent = 'Γίνεται ανάλυση του αιτήματός σου...';

    aiResult.innerHTML = '';

    try {
        const response = await fetch(`${API_URL}/intent`, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',

                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                prompt
            })
        });

        const data = await response.json();

        if (!response.ok) {
            intentMessage.textContent = data.message || 'Η ανάλυση απέτυχε';

            return;
        }

        intentMessage.textContent = 'Βρέθηκε κατάλληλη υπηρεσία';

        const service = data.matchedService;

        aiResult.innerHTML = `
                <div class="dashboard-card ai-card">

                    <h3>${service.name}</h3>

                    <p>
                        ${service.description || ''}
                    </p>

                    <p>
                        <strong>Κατηγορία:</strong>
                        ${data.intent.category}
                    </p>

                    <p>
                        <strong>Πάροχος:</strong>
                        ${service.provider.firstName}
                        ${service.provider.lastName}
                    </p>

                    <p>
                        <strong>Διάρκεια:</strong>
                        ${service.durationMinutes} λεπτά
                    </p>

                    <p>
                        <strong>Τιμή:</strong>
                        ${service.price} €
                    </p>

                    ${
                        data.fallback
                            ? `
                                <p>
                                    <strong>Τρόπος αντιστοίχισης:</strong>
                                    Τοπική αντιστοίχιση
                                </p>
                            `
                            : `
                                <p>
                                    <strong>AI confidence:</strong>
                                    ${Math.round(data.intent.confidence * 100)}%
                                </p>
                            `
                    }

                </div>
            `;
    } catch (error) {
        console.error('AI error:', error);

        intentMessage.textContent = 'Δεν ήταν δυνατή η επικοινωνία με το AI';
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');

    window.location.href = 'login.html';
});

loadServices();
loadBookings();
