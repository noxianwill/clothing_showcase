const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Homepage
router.get('/', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories LIMIT 4');
        res.render('public/home', { title: 'Home', categories });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { title: 'Error', error: 'Internal Server Error' });
    }
});

// Gallery
router.get('/gallery', async (req, res) => {
    try {
        const category = req.query.category;
        const [categories] = await db.query('SELECT * FROM categories');
        let query = `
            SELECT ci.*, c.name as category_name 
            FROM clothing_items ci
            JOIN categories c ON ci.category_id = c.id
        `;
        
        if (category) {
            query += ' WHERE ci.category_id = ?';
            const [items] = await db.query(query, [category]);
            res.render('public/gallery', { title: 'Gallery', categories, items, category });
        } else {
            const [items] = await db.query(query);
            res.render('public/gallery', { title: 'Gallery', categories, items, category: null });
        }
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { title: 'Error', error: 'Internal Server Error' });
    }
});

// Appointment Booking
router.get('/book-appointment', async (req, res) => {
    try {
        const [blockedDates] = await db.query('SELECT date FROM blocked_dates');
        res.render('public/book-appointment', { title: 'Book Appointment', blockedDates });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { title: 'Error', error: 'Internal Server Error' });
    }
});

router.post('/appointments', async (req, res) => {
    try {
        const { name, email, phone, reason, appointment_date, appointment_time } = req.body;
        
        // Validate appointment date and time
        const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}`);
        if (appointmentDateTime < new Date()) {
            return res.status(400).json({ error: 'Appointment date and time must be in the future' });
        }

        // Check if the time slot is available
        const [existingAppointments] = await db.query(`
            SELECT * FROM appointments 
            WHERE appointment_date = ? AND appointment_time = ?
        `, [appointment_date, appointment_time]);

        if (existingAppointments.length > 0) {
            return res.status(400).json({ error: 'This time slot is already booked' });
        }

        // Create client if not exists
        const [clients] = await db.query(`
            INSERT INTO clients (name, email, phone) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)
        `, [name, email, phone]);

        const clientId = clients.insertId || (await db.query('SELECT id FROM clients WHERE email = ?', [email]))[0][0].id;

        // Create appointment
        await db.query(`
            INSERT INTO appointments (client_id, appointment_date, appointment_time, reason, status) 
            VALUES (?, ?, ?, ?, 'pending')
        `, [clientId, appointment_date, appointment_time, reason]);

        // Create notification
        await db.query(`
            INSERT INTO notifications (message) 
            VALUES (?)
        `, [`New appointment request from ${name} for ${appointment_date} at ${appointment_time}`]);

        res.json({ success: true, message: 'Appointment booked successfully!' });
    } catch (error) {
        console.error('Error booking appointment:', error);
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// Contact Page
router.get('/contact', (req, res) => {
    try {
        res.render('public/contact', { title: 'Contact' });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { title: 'Error', error: 'Internal Server Error' });
    }
});

router.post('/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        // Here you would typically send an email
        req.flash('success', 'Message sent successfully!');
        res.redirect('/contact');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

// About Page
router.get('/about', (req, res) => {
    try {
        res.render('public/about', { title: 'About' });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { title: 'Error', error: 'Internal Server Error' });
    }
});

// Get available slots for booking
router.get('/appointments/available-slots', async (req, res) => {
    try {
        // Get availability (working hours)
        const [availability] = await db.query('SELECT * FROM availability WHERE is_available = 1');
        // Get blocked dates
        const [blockedDates] = await db.query('SELECT date FROM blocked_dates');
        // Get already booked appointments
        const [appointments] = await db.query('SELECT appointment_date, appointment_time FROM appointments');

        // Prepare blocked date set
        const blockedSet = new Set(blockedDates.map(d => d.date.toISOString().slice(0, 10)));
        // Prepare booked slots set
        const bookedSet = new Set(appointments.map(a => `${a.appointment_date.toISOString().slice(0, 10)}T${a.appointment_time}`));

        // Generate available slots for the next 30 days
        const slots = [];
        const now = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() + i);
            const dayOfWeek = date.getDay();
            const dateStr = date.toISOString().slice(0, 10);
            if (blockedSet.has(dateStr)) continue;
            const avail = availability.find(a => a.day_of_week === dayOfWeek);
            if (!avail) continue;
            // Generate time slots (every 30 min)
            let start = avail.start_time;
            let end = avail.end_time;
            let [sh, sm] = start.split(':').map(Number);
            let [eh, em] = end.split(':').map(Number);
            let t = new Date(dateStr + 'T' + start);
            let tEnd = new Date(dateStr + 'T' + end);
            while (t < tEnd) {
                const slotStr = t.toISOString().slice(0, 16);
                if (!bookedSet.has(slotStr)) {
                    slots.push({ date: dateStr, time: t.toTimeString().slice(0,5) });
                }
                t.setMinutes(t.getMinutes() + 30);
            }
        }
        res.json({ slots });
    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ error: 'Failed to fetch available slots' });
    }
});

module.exports = router; 