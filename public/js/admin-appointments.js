document.addEventListener('DOMContentLoaded', function() {
    console.log('admin-appointments.js loaded');
    console.log('Found appointment-status:', document.querySelectorAll('.appointment-status').length);
    
    // Initialize FullCalendar
    const calendarEl = document.getElementById('calendar');
    if (calendarEl && window.FullCalendar) {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: '/admin/appointments/calendar',
            eventClick: function(info) {
                fetch(`/admin/appointments/${info.event.id}`)
                    .then(response => response.json())
                    .then(appointment => {
                        const details = `
                            <h6>Client Information</h6>
                            <p>Name: ${appointment.client_name}</p>
                            <p>Email: ${appointment.client_email}</p>
                            <p>Phone: ${appointment.client_phone}</p>
                            <h6>Appointment Details</h6>
                            <p>Date: ${new Date(appointment.appointment_date).toLocaleDateString()}</p>
                            <p>Time: ${appointment.appointment_time}</p>
                            <p>Reason: ${appointment.reason}</p>
                            <p>Status: ${appointment.status}</p>
                        `;
                        document.getElementById('appointmentDetails').innerHTML = details;
                        $('#appointmentModal').modal('show');
                    });
            }
        });
        calendar.render();
    }

    // Handle appointment status change with jQuery
    $(document).ready(function() {
        $('.appointment-status').on('change', function() {
            const select = $(this);
            const appointmentId = select.data('id');
            const newStatus = select.val();
            $.ajax({
                url: `/admin/appointments/${appointmentId}/status`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ status: newStatus }),
                success: function(res) {
                    // Update badge color and text
                    const badge = select.closest('tr').find('span.badge');
                    badge.text(newStatus);
                    badge.removeClass('bg-warning bg-success bg-danger');
                    if (newStatus === 'pending') badge.addClass('bg-warning');
                    else if (newStatus === 'accepted') badge.addClass('bg-success');
                    else if (newStatus === 'declined') badge.addClass('bg-danger');
                    showSuccess('Appointment status updated successfully!');
                },
                error: function(xhr) {
                    alert('Failed to update status. ' + (xhr.responseJSON?.error || 'Please try again.'));
                }
            });
        });
    });

    // Show a temporary success message
    function showSuccess(message) {
        let alert = document.getElementById('ajax-success-alert');
        if (!alert) {
            alert = document.createElement('div');
            alert.id = 'ajax-success-alert';
            alert.className = 'alert alert-success alert-dismissible fade show';
            alert.style.position = 'fixed';
            alert.style.top = '70px';
            alert.style.right = '20px';
            alert.style.zIndex = 9999;
            alert.innerHTML = `
                <span>${message}</span>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(alert);
        } else {
            alert.querySelector('span').textContent = message;
            alert.classList.add('show');
        }
        setTimeout(() => {
            if (alert) alert.classList.remove('show');
        }, 2000);
    }

    // Filter handler
    const applyFilterBtn = document.getElementById('applyFilter');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', function() {
            const form = document.getElementById('filterForm');
            const formData = new FormData(form);
            const params = new URLSearchParams(formData);
            window.location.href = `/admin/appointments?${params.toString()}`;
        });
    }

    // View appointment handler
    document.querySelectorAll('.view-appointment').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.dataset.id;
            fetch(`/admin/appointments/${id}`)
                .then(response => response.json())
                .then(appointment => {
                    const details = `
                        <h6>Client Information</h6>
                        <p>Name: ${appointment.client_name}</p>
                        <p>Email: ${appointment.client_email}</p>
                        <p>Phone: ${appointment.client_phone}</p>
                        <h6>Appointment Details</h6>
                        <p>Date: ${new Date(appointment.appointment_date).toLocaleDateString()}</p>
                        <p>Time: ${appointment.appointment_time}</p>
                        <p>Reason: ${appointment.reason}</p>
                        <p>Status: ${appointment.status}</p>
                    `;
                    document.getElementById('appointmentDetails').innerHTML = details;
                });
        });
    });

    // Search functionality
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Bulk actions
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            document.querySelectorAll('.appointment-checkbox').forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
    const selectAllBtn = document.getElementById('selectAll');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            document.querySelectorAll('.appointment-checkbox').forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }
    const deselectAllBtn = document.getElementById('deselectAll');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', function() {
            document.querySelectorAll('.appointment-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }
    const applyBulkActionBtn = document.getElementById('applyBulkAction');
    if (applyBulkActionBtn) {
        applyBulkActionBtn.addEventListener('click', function() {
            const action = document.getElementById('bulkAction').value;
            if (!action) return;
            const selectedIds = Array.from(document.querySelectorAll('.appointment-checkbox:checked'))
                .map(checkbox => checkbox.value);
            if (selectedIds.length === 0) {
                alert('Please select at least one appointment');
                return;
            }
            if (action === 'delete') {
                if (!confirm('Are you sure you want to delete the selected appointments?')) {
                    return;
                }
            }
            fetch('/admin/appointments/bulk-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    ids: selectedIds
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Error performing bulk action');
                }
            });
        });
    }
});

document.addEventListener('click', function(e) {
    console.log('[DEBUG] Global click event fired on:', e.target, 'class:', e.target.className, 'id:', e.target.id);
});

// DEBUG: Global change event logger
window.addEventListener('change', function(e) {
    console.log('[GLOBAL CHANGE] Event fired on:', e.target, 'class:', e.target.className, 'id:', e.target.id);
}); 