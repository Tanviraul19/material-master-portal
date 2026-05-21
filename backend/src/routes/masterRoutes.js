const express = require('express');
const router = express.Router();
const mc = require('../controllers/masterController');
const { verifyToken } = require('../middleware/auth');

router.get('/material-groups', verifyToken, mc.getMaterialGroups);
router.get('/uom', verifyToken, mc.getUOM);
router.get('/uom/:code', verifyToken, mc.getUOMByCode);
router.get('/purchase-groups', verifyToken, mc.getPurchaseGroups);
router.get('/purchase-groups/:code', verifyToken, mc.getPurchaseGroupByCode);
router.get('/plants', verifyToken, mc.getPlants);
router.get('/storage-locations', verifyToken, mc.getStorageLocations);
router.get('/storage-locations/:plant/:sloc', verifyToken, mc.getStorageLocationByCode);
router.get('/stats', verifyToken, mc.getStats);

module.exports = router;
