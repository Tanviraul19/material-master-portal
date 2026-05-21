const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const users = await db.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found or account disabled' });
    }

    const user = users[0];
    const passwordIsValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordIsValid) {
      return res.status(401).json({ accessToken: null, message: 'Invalid Password!' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Update last login (SQLite uses ? placeholders)
    await db.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    res.status(200).json({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      accessToken: token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create User (Super Admin only)
exports.createUser = async (req, res) => {
  const { full_name, username, email, password, role, department } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (full_name, username, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)',
      [full_name, username, email, hashedPassword, role, department]
    );
    const [newUser] = await db.query('SELECT id, username, role FROM users WHERE email = ?', [email]);
    res.status(201).json(newUser);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'User already exists or database error.' });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await db.query('SELECT id, full_name, username, email, role, department, is_active, last_login FROM users ORDER BY id ASC');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user details
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, role, department, is_active } = req.body;
  try {
    await db.execute(
      'UPDATE users SET full_name = ?, role = ?, department = ?, is_active = ? WHERE id = ?',
      [full_name, role, department, is_active ? 1 : 0, id]
    );
    const [updated] = await db.query('SELECT id, full_name, role FROM users WHERE id = ?', [id]);
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle user active/inactive
exports.toggleUserActive = async (req, res) => {
  const { id } = req.params;
  try {
    const [user] = await db.query('SELECT id, is_active, role FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'IT Team') return res.status(403).json({ error: 'Cannot disable IT Team admin account' });
    const newActive = user.is_active ? 0 : 1;
    await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [newActive, id]);
    res.status(200).json({ message: newActive ? 'User enabled' : 'User disabled', is_active: newActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, id]);
    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
