const express = require('express');
const router = express.Router();
const { createRequest, getRequests, approveRequest } = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createRequest);
router.get('/', protect, getRequests);
router.post('/:id/approve', protect, approveRequest);

module.exports = router;
