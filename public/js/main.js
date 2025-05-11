// Initialize tooltips
$(function () {
    $('[data-bs-toggle="tooltip"]').tooltip();
});

// Gallery image click handler
$('.gallery-item').click(function() {
    const imageUrl = $(this).find('img').attr('src');
    const modal = `
        <div class="modal fade" id="imageModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-body">
                        <img src="${imageUrl}" class="img-fluid">
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modal);
    $('#imageModal').modal('show');
    $('#imageModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
});

// Appointment form validation
$('#appointmentForm').submit(function(e) {
    e.preventDefault();
    const form = $(this);
    const submitButton = form.find('button[type="submit"]');
    
    submitButton.prop('disabled', true);
    
    $.ajax({
        url: form.attr('action'),
        method: 'POST',
        data: form.serialize(),
        success: function(response) {
            form[0].reset();
            $('#successMessage').removeClass('d-none');
            setTimeout(() => {
                $('#successMessage').addClass('d-none');
            }, 5000);
        },
        error: function(xhr) {
            alert('An error occurred. Please try again.');
        },
        complete: function() {
            submitButton.prop('disabled', false);
        }
    });
});

// Contact form validation
$('#contactForm').submit(function(e) {
    e.preventDefault();
    const form = $(this);
    const submitButton = form.find('button[type="submit"]');
    
    submitButton.prop('disabled', true);
    
    $.ajax({
        url: form.attr('action'),
        method: 'POST',
        data: form.serialize(),
        success: function(response) {
            form[0].reset();
            $('#successMessage').removeClass('d-none');
            setTimeout(() => {
                $('#successMessage').addClass('d-none');
            }, 5000);
        },
        error: function(xhr) {
            alert('An error occurred. Please try again.');
        },
        complete: function() {
            submitButton.prop('disabled', false);
        }
    });
}); 