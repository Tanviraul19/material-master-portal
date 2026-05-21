const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { verifyToken } = require('../middleware/auth');

router.post('/',                    verifyToken, requestController.createRequest);
router.get('/',                     verifyToken, requestController.getRequests);
router.get('/check-duplicate',      verifyToken, requestController.checkDuplicate);
router.put('/:id/resubmit',         verifyToken, requestController.resubmitRequest);

module.exports = router;
