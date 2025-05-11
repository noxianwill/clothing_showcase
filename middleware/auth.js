const bcrypt = require('bcryptjs');
const db = require('../config/database');

exports.isAuthenticated = (req, res, next) => {
    // Skip authentication for login page
    if (req.path === '/login') {
        return next();
    }
    
    if (req.session && req.session.user) {
        return next();
    }
    
    // Store the original URL to redirect back after login
    req.session.returnTo = req.originalUrl;
    res.redirect('/admin/login');
};

exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/admin/login');
        }

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/admin/login');
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        // Redirect to the original URL or dashboard
        const returnTo = req.session.returnTo || '/admin';
        delete req.session.returnTo;
        res.redirect(returnTo);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
}; 