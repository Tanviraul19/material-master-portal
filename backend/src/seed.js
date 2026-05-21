const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const seed = async () => {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    
    try {
        console.log('Seeding Super Admins...');
        
        // Clear old users if any (optional, but good for clean start)
        // await pool.query('DELETE FROM users');

        const query = `
            INSERT INTO users (full_name, username, email, password_hash, role, department)
            VALUES 
            ($1, $2, $3, $4, $5, $6),
            ($7, $8, $9, $10, $11, $12)
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
        `;

        const values = [
            'Saurabh', 'saurabh_admin', 'saurabh@enterprise.com', hash, 'Super Admin', 'Management',
            'Komal', 'komal_admin', 'komal@enterprise.com', hash, 'Super Admin', 'Management'
        ];

        await pool.query(query, values);
        console.log('✅ Super Admins seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
