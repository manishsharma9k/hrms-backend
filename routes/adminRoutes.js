const express = require('express');
const {
    getEmployees, addEmployee, updateEmployee, deleteEmployee,
    getDepartments, addDepartment, updateDepartment, deleteDepartment,
    getAllLeaves, updateLeaveStatus,
    getHolidays, addHoliday, deleteHoliday, updateHolidayStatus,
    getDashboardStats, getEmployeeProfile, getEmployeeByEmployeeId,
    getCandidates, addCandidate, candidateAction, deleteCandidate
} = require('../controllers/adminController');
const { sendOfferLetter } = require('../controllers/offerLetterController');
const { protect, authorize } = require('../middleware/authMiddleware');
const Attendance = require('../models/attendanceModel');
const Notification = require('../models/notificationModel');

const router = express.Router();
router.use(protect);
router.use(authorize('admin', 'hr'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/stats', getDashboardStats);

// ─── Attendance ───────────────────────────────────────────────────────────────
router.get('/attendance', async (req, res) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const records = await Attendance.find({ date: { $gte: today, $lt: tomorrow } }).populate('employee', 'name photo department');
        res.status(200).json({ success: true, data: records });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

router.get('/attendance/all', async (req, res) => {
    try {
        const records = await Attendance.find().populate('employee', 'name photo department').sort('-date').limit(200);
        res.status(200).json({ success: true, data: records });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// Admin override: upsert attendance for any employee on any date
router.post('/attendance/override', async (req, res) => {
    try {
        const { employeeId, date, status } = req.body;
        if (!employeeId || !date || !status) return res.status(400).json({ success: false, error: 'employeeId, date and status are required' });
        const day = new Date(date); day.setHours(0, 0, 0, 0);
        const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
        const record = await Attendance.findOneAndUpdate(
            { employee: employeeId, date: { $gte: day, $lt: nextDay } },
            { employee: employeeId, date: day, status },
            { upsert: true, new: true, runValidators: true }
        );
        const User = require('../models/userModel');
        const emp = await User.findById(employeeId).select('name');
        const Notification = require('../models/notificationModel');
        const admins = await User.find({ role: { $in: ['admin', 'hr'] } }).select('_id');
        await Notification.insertMany(admins.map(a => ({ userId: a._id, message: `📋 Attendance overridden for ${emp?.name || 'employee'} on ${day.toLocaleDateString('en-IN')} → ${status}`, type: 'Attendance', link: '/admin/attendance' })));
        res.status(200).json({ success: true, data: record });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// ─── Employees ────────────────────────────────────────────────────────────────
router.route('/employees').get(getEmployees).post(addEmployee);
router.get('/employees/id/:employeeId', getEmployeeByEmployeeId);   // ← MUST be before /:id routes
router.route('/employees/:id').put(updateEmployee).delete(deleteEmployee);
router.route('/employees/:id/profile').get(getEmployeeProfile);

// ─── Departments ──────────────────────────────────────────────────────────────
router.route('/departments').get(getDepartments).post(addDepartment);
router.route('/departments/:id').put(updateDepartment).delete(deleteDepartment);

// ─── Leaves ───────────────────────────────────────────────────────────────────
router.route('/leaves').get(getAllLeaves);
router.route('/leaves/:id').put(updateLeaveStatus);

// ─── Holidays ─────────────────────────────────────────────────────────────────
router.route('/holidays').get(getHolidays).post(addHoliday);
router.route('/holidays/:id').put(updateHolidayStatus).delete(deleteHoliday);

// ─── Offer Letter ─────────────────────────────────────────────────────────────
router.post('/offer-letter', sendOfferLetter);

// ─── Recruitment ──────────────────────────────────────────────────────────────
router.route('/recruitment').get(getCandidates).post(addCandidate);
router.route('/recruitment/:id').get(async (req, res) => {
    try {
        const Recruitment = require('../models/recruitmentModel');
        const candidate = await Recruitment.findById(req.params.id);
        if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });
        res.status(200).json({ success: true, data: candidate });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}).put(async (req, res) => {
    try {
        const Recruitment = require('../models/recruitmentModel');
        const candidate = await Recruitment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });
        res.status(200).json({ success: true, data: candidate });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}).delete(deleteCandidate);
router.route('/recruitment/:id/action').put(candidateAction);

// ─── Notifications (admin-scoped) ─────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort('-createdAt').limit(50);
        res.status(200).json({ success: true, data: notifications });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// Admin: send notification to selected users or all employees
router.post('/notifications/send', async (req, res) => {
    try {
        const { message, type, link, userIds } = req.body;
        if (!message || !message.trim()) return res.status(400).json({ success: false, error: 'Message is required' });
        const User = require('../models/userModel');
        let targets = [];
        if (Array.isArray(userIds) && userIds.length > 0) {
            targets = await User.find({ _id: { $in: userIds } }).select('_id');
        } else {
            targets = await User.find({}).select('_id');
        }
        if (targets.length === 0) return res.status(400).json({ success: false, error: 'No target users found' });
        await Notification.insertMany(targets.map(t => ({ userId: t._id, message: message.trim(), type: type || 'General', link: link || '' })));
        res.status(200).json({ success: true, sent: targets.length });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

module.exports = router;
