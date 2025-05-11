const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Middleware to ensure admin is authenticated
router.use(isAuthenticated);

// Dashboard Home
router.get('/', async (req, res) => {
    try {
        const [upcomingAppointments] = await db.query(`
            SELECT a.*, c.name as client_name, c.email as client_email, c.phone as client_phone
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            WHERE a.appointment_date >= CURDATE()
            AND a.status = 'pending'
            ORDER BY a.appointment_date ASC
            LIMIT 5
        `);

        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_appointments,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_appointments,
                SUM(CASE WHEN appointment_date >= CURDATE() AND appointment_date < DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as this_week_appointments
            FROM appointments
        `);

        res.render('admin/dashboard', { 
            title: 'Dashboard',
            layout: 'layouts/admin',
            upcomingAppointments,
            stats: stats[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

// Appointments Management
router.get('/appointments', async (req, res) => {
    try {
        const [appointments] = await db.query(`
            SELECT a.*, c.name as client_name, c.email as client_email, c.phone as client_phone
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            ORDER BY a.appointment_date DESC
        `);
        res.render('admin/appointments', { title: 'Appointments Management', layout: 'layouts/admin', appointments });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

// Update appointment status
router.post('/appointments/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Update status in DB
        await db.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);

        // If AJAX, send JSON
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, message: 'Appointment status updated successfully!' });
        }

        // Otherwise, redirect (for normal form posts)
        req.flash('success', 'Appointment status updated successfully!');
        res.redirect('/admin/appointments');
    } catch (error) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, error: 'Failed to update appointment status.' });
        }
        req.flash('error', 'Failed to update appointment status.');
        res.redirect('/admin/appointments');
    }
});

// Availability Management
router.get('/availability', async (req, res) => {
    try {
        const [availability] = await db.query('SELECT * FROM availability');
        const [blockedDates] = await db.query('SELECT * FROM blocked_dates');
        
        // Format availability data for the template
        const formattedAvailability = {};
        availability.forEach(item => {
            formattedAvailability[item.day_of_week] = item;
        });
        
        res.render('admin/availability', { 
            title: 'Availability Management',
            layout: 'layouts/admin',
            availability: formattedAvailability,
            blockedDates 
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

// Update availability
router.post('/availability', async (req, res) => {
    try {
        const availability = req.body.availability;
        console.log('Received availability POST:', JSON.stringify(availability));
        // Clear existing availability
        await db.query('DELETE FROM availability');
        // Insert new availability
        for (const day in availability) {
            const { is_available, start_time, end_time } = availability[day];
            console.log(`Day ${day}: is_available=${is_available}, start_time=${start_time}, end_time=${end_time}`);
            if (
                is_available &&
                start_time && end_time && start_time !== '' && end_time !== ''
            ) {
                console.log(`Inserting: day=${day}, start_time=${start_time}, end_time=${end_time}, is_available=${is_available}`);
                await db.query(
                    'INSERT INTO availability (day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?)',
                    [day, start_time, end_time, is_available]
                );
            } else {
                console.log(`Skipping day ${day} (not available or missing times)`);
            }
        }
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, message: 'Availability updated successfully!' });
        }
        req.flash('success', 'Availability updated successfully!');
        res.redirect('/admin/availability');
    } catch (error) {
        console.error('Error in /admin/availability:', error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

// Block dates
router.post('/block-dates', async (req, res) => {
    try {
        const { date, reason } = req.body;
        await db.query(
            'INSERT INTO blocked_dates (date, reason) VALUES (?, ?)',
            [date, reason]
        );
        req.flash('success', 'Date blocked successfully!');
        res.redirect('/admin/availability');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

// Delete blocked date
router.delete('/blocked-dates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM blocked_dates WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// Profile Settings
router.get('/profile', async (req, res) => {
    try {
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
        res.render('admin/profile', { title: 'Profile Settings', layout: 'layouts/admin', user: user[0] });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

// Update profile
router.post('/profile', async (req, res) => {
    try {
        const { username, email } = req.body;
        await db.query(
            'UPDATE users SET username = ?, email = ? WHERE id = ?',
            [username, email, req.session.user.id]
        );
        
        // Update session
        req.session.user.username = username;
        req.session.user.email = email;
        
        req.flash('success', 'Profile updated successfully!');
        res.redirect('/admin/profile');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

// Change password
router.post('/profile/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Verify current password
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
        const user = users[0];
        
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/admin/profile');
        }
        
        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.session.user.id]
        );
        
        req.flash('success', 'Password updated successfully!');
        res.redirect('/admin/profile');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Get appointments for calendar
router.get('/appointments/calendar', isAuthenticated, async (req, res) => {
    try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1); // Show appointments from one month ago
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3); // Show appointments up to three months ahead

        const [appointments] = await db.query(`
            SELECT 
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                c.name as client_name
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            WHERE a.appointment_date BETWEEN ? AND ?
            ORDER BY a.appointment_date, a.appointment_time
        `, [startDate, endDate]);

        const events = appointments.map(appointment => ({
            id: appointment.id,
            title: `${appointment.client_name} - ${appointment.reason}`,
            start: `${appointment.appointment_date}T${appointment.appointment_time}`,
            className: `status-${appointment.status}`,
            description: appointment.reason
        }));

        res.json(events);
    } catch (error) {
        console.error('Error fetching calendar appointments:', error);
        res.status(500).json({ error: 'Failed to fetch calendar appointments' });
    }
});

// Get single appointment details
router.get('/appointments/:id', isAuthenticated, async (req, res) => {
    try {
        const [appointments] = await db.query(`
            SELECT 
                a.*,
                c.name as client_name,
                c.email as client_email,
                c.phone as client_phone
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            WHERE a.id = ?
        `, [req.params.id]);

        if (appointments.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json(appointments[0]);
    } catch (error) {
        console.error('Error fetching appointment details:', error);
        res.status(500).json({ error: 'Failed to fetch appointment details' });
    }
});

// Single delete
router.delete('/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM appointments WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete appointment.' });
    }
});

// Bulk action (already exists, but ensure delete is handled)
router.post('/appointments/bulk-action', async (req, res) => {
    try {
        const { action, ids } = req.body;
        if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        if (action === 'delete') {
            await db.query('DELETE FROM appointments WHERE id IN (?)', [ids]);
            return res.json({ success: true });
        } else if (action === 'accept' || action === 'decline') {
            const newStatus = action === 'accept' ? 'accepted' : 'declined';
            await db.query('UPDATE appointments SET status = ? WHERE id IN (?)', [newStatus, ids]);
            return res.json({ success: true });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to perform bulk action' });
    }
});

// Get notifications
router.get('/notifications', isAuthenticated, async (req, res) => {
    try {
        // Get unread notifications
        const [notifications] = await db.query(`
            SELECT * FROM notifications 
            WHERE is_read = 0 
            ORDER BY created_at DESC
        `);

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.post('/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
        await db.query(`
            UPDATE notifications 
            SET is_read = 1 
            WHERE id = ?
        `, [req.params.id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.post('/notifications/read-all', isAuthenticated, async (req, res) => {
    try {
        await db.query(`
            UPDATE notifications 
            SET is_read = 1 
            WHERE is_read = 0
        `);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// Admin create appointment
router.post('/appointments', async (req, res) => {
    try {
        const { name, email, phone, appointment_date, appointment_time, reason, status } = req.body;
        // Create client if not exists
        const [clients] = await db.query(`
            INSERT INTO clients (name, email, phone)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)
        `, [name, email, phone]);
        const clientId = clients.insertId || (await db.query('SELECT id FROM clients WHERE email = ?', [email]))[0][0].id;
        // Check if slot is available
        const [existingAppointments] = await db.query(`
            SELECT * FROM appointments
            WHERE appointment_date = ? AND appointment_time = ?
        `, [appointment_date, appointment_time]);
        if (existingAppointments.length > 0) {
            return res.json({ success: false, error: 'This time slot is already booked' });
        }
        // Create appointment
        await db.query(`
            INSERT INTO appointments (client_id, appointment_date, appointment_time, reason, status)
            VALUES (?, ?, ?, ?, ?)
        `, [clientId, appointment_date, appointment_time, reason, status || 'pending']);
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding appointment:', error);
        res.json({ success: false, error: 'Failed to add appointment' });
    }
});

module.exports = router; 