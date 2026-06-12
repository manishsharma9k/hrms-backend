const Notification = require('../models/notificationModel');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort('-createdAt').limit(50);
        res.status(200).json({ success: true, count: notifications.length, data: notifications });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });
        if (notification.userId.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });
        notification.isRead = true;
        await notification.save();
        res.status(200).json({ success: true, data: notification });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.deleteAll = async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user.id });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
