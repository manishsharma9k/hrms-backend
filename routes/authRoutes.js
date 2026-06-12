const express = require('express');
const {
    register, login, getMe, logout,
    getPublicDepartments, registerAdmin,
    forgotPassword, resetPassword,
    updateProfile, changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const Holiday = require('../models/holidayModel');

const router = express.Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.post('/register', register);
router.post('/admin/register', registerAdmin);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/departments', getPublicDepartments);

// ─── Protected ────────────────────────────────────────────────────────────────
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.put('/updateprofile', protect, updateProfile);
router.put('/changepassword', protect, changePassword);

// ─── Holidays (public read for calendar) ─────────────────────────────────────
router.get('/holidays', protect, async (req, res) => {
    try {
        const holidays = await Holiday.find().sort('date');
        res.status(200).json({ success: true, data: holidays });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

module.exports = router;
