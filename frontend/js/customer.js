const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token || (role !== 'customer' && role !== 'admin')) {
    window.location.href = 'login.html';
}

const servicesList = document.getElementById('servicesList');
const bookingsList = document.getElementById('bookingsList');

const bookingDateInput = document.getElementById('bookingDate');
const bookingTimeSelect = document.getElementById('bookingTime');

const intentForm = document.getElementById('intentForm');
const intentPrompt = document.getElementById('intentPrompt');
const intentMessage = document.getElementById('intentMessage');
const aiResult = document.getElementById('aiResult');

const bookingForm = document.getElementById('bookingForm');
const bookingMessage = document.getElementById('bookingMessage');

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


const loadServices = async () => {
    try {
        const response = await fetch(
            `${API_URL}/services`
        );

        const services = await response.json();

        servicesList.innerHTML = '';

        if (!response.ok) {
            servicesList.innerHTML =
                '<p>Δεν ήταν δυνατή η φόρτωση υπηρεσιών.</p>';

            return;
        }

        if (services.length === 0) {
            servicesList.innerHTML =
                '<p>Δεν υπάρχουν διαθέσιμες υπηρεσίες.</p>';

            return;
        }

        services.forEach((service) => {
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

            const bookingButton =
                card.querySelector('.book-service-btn');

            bookingButton.addEventListener('click', () => {
                document.getElementById(
                    'selectedServiceId'
                ).value = service.id;

                document.getElementById(
                    'selectedServiceName'
                ).textContent = service.name;

                bookingDateInput.value = '';

                bookingTimeSelect.innerHTML = `
                    <option value="">
                        Επίλεξε πρώτα ημερομηνία
                    </option>
                `;

                bookingMessage.textContent = '';

                const bookingSection =
                    document.getElementById(
                        'booking-section'
                    );

                bookingSection.style.display = 'block';

                bookingSection.scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });

    } catch (error) {
        console.error(
            'Services loading error:',
            error
        );

        servicesList.innerHTML =
            '<p>Δεν ήταν δυνατή η φόρτωση υπηρεσιών.</p>';
    }
};


const loadBookings = async () => {
    try {
        const response = await fetch(
            `${API_URL}/bookings/my`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const bookings = await response.json();

        bookingsList.innerHTML = '';

        if (!response.ok) {
            bookingsList.innerHTML =
                `<p>${bookings.message || 'Δεν ήταν δυνατή η φόρτωση κρατήσεων.'}</p>`;

            return;
        }

        if (bookings.length === 0) {
            bookingsList.innerHTML =
                '<p>Δεν έχεις ακόμη κρατήσεις.</p>';

            return;
        }

        bookings.forEach((booking) => {
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
                    ${translateStatus(booking.status)}
                </p>
            `;

            bookingsList.appendChild(card);
        });

    } catch (error) {
        console.error(
            'Bookings loading error:',
            error
        );

        bookingsList.innerHTML =
            '<p>Δεν ήταν δυνατή η φόρτωση κρατήσεων.</p>';
    }
};


bookingDateInput.addEventListener(
    'change',
    async () => {
        const serviceId = Number(
            document.getElementById(
                'selectedServiceId'
            ).value
        );

        const selectedDate =
            bookingDateInput.value;

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
            const response = await fetch(
                `${API_URL}/bookings/available-slots` +
                `?service_id=${serviceId}` +
                `&date=${selectedDate}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error(
                    'Slots API error:',
                    data
                );

                bookingTimeSelect.innerHTML = `
                    <option value="">
                        ${data.message || 'Δεν ήταν δυνατή η φόρτωση'}
                    </option>
                `;

                return;
            }

            if (
                !data.slots ||
                data.slots.length === 0
            ) {
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
                const option =
                    document.createElement('option');

                option.value = slot;
                option.textContent = slot;

                bookingTimeSelect.appendChild(
                    option
                );
            });

        } catch (error) {
            console.error(
                'Available slots error:',
                error
            );

            bookingTimeSelect.innerHTML = `
                <option value="">
                    Σφάλμα φόρτωσης ωρών
                </option>
            `;
        }
    }
);


bookingForm.addEventListener(
    'submit',
    async (event) => {
        event.preventDefault();

        const serviceId = Number(
            document.getElementById(
                'selectedServiceId'
            ).value
        );

        const bookingDate =
            bookingDateInput.value;

        const startTime =
            bookingTimeSelect.value;

        if (
            !serviceId ||
            !bookingDate ||
            !startTime
        ) {
            bookingMessage.textContent =
                'Επίλεξε ημερομηνία και διαθέσιμη ώρα.';

            return;
        }

        bookingMessage.textContent =
            'Γίνεται δημιουργία της κράτησης...';

        try {
            const response = await fetch(
                `${API_URL}/bookings`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        service_id: serviceId,
                        booking_date: bookingDate,
                        start_time: startTime
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                bookingMessage.textContent =
                    data.message ||
                    'Η κράτηση απέτυχε';

                return;
            }

            bookingMessage.textContent =
                'Η κράτηση δημιουργήθηκε επιτυχώς!';

            await loadBookings();

            bookingDateInput.dispatchEvent(
                new Event('change')
            );

        } catch (error) {
            console.error(
                'Booking error:',
                error
            );

            bookingMessage.textContent =
                'Δεν ήταν δυνατή η επικοινωνία με τον server.';
        }
    }
);


intentForm.addEventListener(
    'submit',
    async (event) => {
        event.preventDefault();

        const prompt =
            intentPrompt.value.trim();

        if (!prompt) {
            return;
        }

        intentMessage.textContent =
            'Γίνεται ανάλυση του αιτήματός σου...';

        aiResult.innerHTML = '';

        try {
            const response = await fetch(
                `${API_URL}/intent`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        prompt
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                intentMessage.textContent =
                    data.message ||
                    'Η ανάλυση απέτυχε';

                return;
            }

            intentMessage.textContent =
                'Βρέθηκε κατάλληλη υπηρεσία';

            const service =
                data.matchedService;

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

                    <p>
                        <strong>AI confidence:</strong>
                        ${Math.round(
                            data.intent.confidence * 100
                        )}%
                    </p>

                </div>
            `;

        } catch (error) {
            console.error(
                'AI error:',
                error
            );

            intentMessage.textContent =
                'Δεν ήταν δυνατή η επικοινωνία με το AI';
        }
    }
);


logoutBtn.addEventListener(
    'click',
    () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');

        window.location.href =
            'login.html';
    }
);


loadServices();
loadBookings();