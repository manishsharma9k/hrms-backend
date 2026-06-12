const express = require('express');
const {
    applyLeave, getMyLeaves,
    markAttendance, checkOut, getMyAttendance,
    getSalaryDetails, getEmployeesAtPlace
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const Holiday = require('../models/holidayModel');
const User = require('../models/userModel');

const router = express.Router();
router.use(protect);
router.use(authorize('employee'));

// ─── Leave ────────────────────────────────────────────────────────────────────
router.route('/leave').post(applyLeave).get(getMyLeaves);

// ─── Attendance ───────────────────────────────────────────────────────────────
router.route('/attendance').post(markAttendance).get(getMyAttendance);
router.route('/attendance/checkout').put(checkOut);

// ─── Place / Location ────────────────────────────────────────────────────────
router.route('/place').get(getEmployeesAtPlace);

// ─── Salary ───────────────────────────────────────────────────────────────────
router.route('/salary').get(getSalaryDetails);

// ─── Holidays ─────────────────────────────────────────────────────────────────
router.get('/holidays', async (req, res) => {
    try {
        const holidays = await Holiday.find({ status: 'Approved' }).sort('date');
        res.status(200).json({ success: true, data: holidays });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// ─── Profile (employee self-update) ──────────────────────────────────────────
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('department', 'name');
        res.status(200).json({ success: true, data: user });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

router.put('/profile', async (req, res) => {
    try {
        const { name, phone, designation, photo } = req.body;
        const fields = {};
        if (name && name.trim()) fields.name = name.trim();
        if (phone !== undefined) fields.phone = phone;
        if (designation !== undefined) fields.designation = designation;
        if (photo && photo.trim()) fields.photo = photo;
        const user = await User.findByIdAndUpdate(req.user.id, { $set: fields }, { new: true, runValidators: true }).populate('department', 'name');
        res.status(200).json({ success: true, data: user });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

module.exports = router;
