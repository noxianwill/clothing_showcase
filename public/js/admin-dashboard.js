// Handle appointment status change
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
            },
            error: function(xhr) {
                alert('Failed to update status. ' + (xhr.responseJSON?.error || 'Please try again.'));
            }
        });
    });
}); 