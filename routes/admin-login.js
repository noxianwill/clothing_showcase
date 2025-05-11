const express = require('express');
const router = express.Router();
const { login } = require('../middleware/auth');

// Login page
router.get('/login', (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session && req.session.user) {
        return res.redirect('/admin');
    }
    res.render('admin/login', { 
        title: 'Admin Login',
        layout: false // Don't use any layout for login page
    });
});

// Handle login
router.post('/login', login, (req, res) => {
    res.redirect('/admin');
});

module.exports = router; 