const express = require('express');
const router = express.Router();
const { createUser, getAllUsers, resetPassword } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('ADMIN'));

router.post('/users', createUser);
router.get('/users', getAllUsers);
router.post('/reset-password', resetPassword);

module.exports = router;
