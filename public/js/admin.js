// Initialize tooltips
$(function () {
    $('[data-bs-toggle="tooltip"]').tooltip();
});

// Availability form submission
$('#availabilityForm').submit(function(e) {
    e.preventDefault();
    const form = $(this);
    const submitButton = form.find('button[type="submit"]');
    
    // Enable all time fields before serializing
    form.find('.start-time, .end-time').prop('disabled', false);

    // Log serialized form data
    const serialized = form.serialize();
    console.log('[AVAILABILITY] Serialized form data:', serialized);

    submitButton.prop('disabled', true);
    
    $.ajax({
        url: form.attr('action'),
        method: 'POST',
        data: serialized,
        xhrFields: { withCredentials: true },
        success: function(response) {
            console.log('[AVAILABILITY] AJAX success:', response);
            form[0].reset();
            location.reload();
        },
        error: function(xhr) {
            console.error('[AVAILABILITY] AJAX error:', xhr);
            alert('An error occurred. Please try again.');
        },
        complete: function() {
            submitButton.prop('disabled', false);
        }
    });
});

// Block date form submission
$('#blockDateForm').submit(function(e) {
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
            location.reload();
        },
        error: function(xhr) {
            alert('An error occurred. Please try again.');
        },
        complete: function() {
            submitButton.prop('disabled', false);
        }
    });
});

// Profile form submission
$('#profileForm').submit(function(e) {
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
            location.reload();
        },
        error: function(xhr) {
            alert('An error occurred. Please try again.');
        },
        complete: function() {
            submitButton.prop('disabled', false);
        }
    });
}); 