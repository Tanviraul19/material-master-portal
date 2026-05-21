const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, isSuperAdmin, isITAdmin } = require('../middleware/auth');

router.post('/login', authController.login);

// Management Routes — IT Team is the only admin
router.post('/users', verifyToken, isITAdmin, authController.createUser);
router.get('/users', verifyToken, isITAdmin, authController.getAllUsers);
router.put('/users/:id', verifyToken, isITAdmin, authController.updateUser);
router.patch('/users/:id/reset-password', verifyToken, isITAdmin, authController.resetPassword);
router.patch('/users/:id/toggle-active', verifyToken, isITAdmin, authController.toggleUserActive);

module.exports = router;
