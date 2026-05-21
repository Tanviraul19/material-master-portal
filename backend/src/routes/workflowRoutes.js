const express = require('express');
const router = express.Router();
const wf = require('../controllers/workflowController');
const { verifyToken } = require('../middleware/auth');

router.get('/pending',                  verifyToken, wf.getPendingApprovals);
router.get('/all',                      verifyToken, wf.getAllRequests);
router.get('/notifications',            verifyToken, wf.getNotifications);
router.patch('/notifications/read',     verifyToken, wf.markNotificationsRead);
router.get('/:id/detail',              verifyToken, wf.getRequestDetail);
router.get('/:id/history',             verifyToken, wf.getHistory);
router.get('/:id/audit',               verifyToken, wf.getAuditLog);
router.post('/:id/approve',            verifyToken, wf.handleApproval);

module.exports = router;
