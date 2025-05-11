const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createAdmin() {
    try {
        const username = 'admin';
        const email = 'admin@example.com';
        const password = 'admin123'; // You should change this after first login
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert the admin user
        await db.query(`
            INSERT INTO users (username, email, password)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                username = VALUES(username),
                email = VALUES(email),
                password = VALUES(password)
        `, [username, email, hashedPassword]);
        
        console.log('Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('\nIMPORTANT: Please change the password after first login!');
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        process.exit();
    }
}

createAdmin(); 