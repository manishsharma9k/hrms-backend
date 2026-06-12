const express = require('express');
const { getNotifications, markAsRead, markAllRead, deleteAll } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.route('/').get(getNotifications).delete(deleteAll);
router.route('/read-all').put(markAllRead);
router.route('/:id/read').put(markAsRead);

module.exports = router;
