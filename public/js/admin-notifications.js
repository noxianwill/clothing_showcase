// Notification system
function updateNotifications() {
    fetch('/admin/notifications')
        .then(response => response.json())
        .then(notifications => {
            const badge = document.getElementById('notificationBadge');
            const list = document.getElementById('notificationsList');
            if (!badge || !list) return; // Prevent error if elements are missing
            // Update badge
            badge.textContent = notifications.length;
            badge.style.display = notifications.length > 0 ? 'block' : 'none';
            // Clear existing notifications (except header and mark all)
            while (list.children.length > 3) {
                list.removeChild(list.lastChild);
            }
            // Add new notifications
            notifications.forEach(notification => {
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.className = 'dropdown-item';
                link.href = '/admin/appointments';
                link.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <span>${notification.message}</span>
                        <small class="text-muted">${new Date(notification.created_at).toLocaleTimeString()}</small>
                    </div>
                `;
                link.addEventListener('click', () => markAsRead(notification.id));
                item.appendChild(link);
                list.insertBefore(item, list.children[2]);
            });
        });
}

function markAsRead(id) {
    fetch(`/admin/notifications/${id}/read`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(() => {
        updateNotifications();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const markAllReadBtn = document.getElementById('markAllRead');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fetch('/admin/notifications/read-all', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(() => {
                updateNotifications();
            });
        });
    }
    // Update notifications every 30 seconds
    updateNotifications();
    setInterval(updateNotifications, 30000);
}); 