const Leave = require('../models/leaveModel');
const Attendance = require('../models/attendanceModel');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

// @desc    Apply for leave
// @route   POST /api/employee/leave
// @access  Private/Employee
exports.applyLeave = async (req, res, next) => {
    try {
        const { startDate, endDate, reason } = req.body;
        
        const leave = await Leave.create({
            employee: req.user.id,
            startDate,
            endDate,
            reason
        });

        // Notify Admins & HR
        const admins = await User.find({ role: { $in: ['admin', 'hr'] } }).select('_id email');
        if (admins.length > 0) {
            await Notification.insertMany(admins.map(a => ({
                userId: a._id,
                message: `📋 New leave request from ${req.user.name}`,
                type: 'Leave',
                link: '/admin/leaves'
            })));

            const adminEmails = admins.filter(a => a.email).map(a => a.email);
            if (adminEmails.length > 0) {
                try {
                    const nodemailer = require('nodemailer');
                    const transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST,
                        port: Number(process.env.SMTP_PORT),
                        secure: false,
                        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                    });
                    const startDateFmt = new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                    const endDateFmt = new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                    const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#1e293b;padding:24px} .card{max-width:640px;margin:0 auto;background:#fff;padding:28px;border-radius:16px;box-shadow:0 20px 60px rgba(15,23,42,0.08)}.header{margin-bottom:24px}.header h1{font-size:22px;color:#0f172a}.header p{margin-top:8px;color:#64748b;font-size:14px}.detail{margin:18px 0 0;font-size:14px;color:#334155;line-height:1.8}.detail strong{color:#0f172a}.footer{margin-top:24px;font-size:12px;color:#94a3b8;}</style></head><body><div class="card"><div class="header"><h1>New Leave Request</h1><p>${req.user.name} has submitted a new leave request.</p></div><div class="detail"><p><strong>Employee:</strong> ${req.user.name}</p><p><strong>Email:</strong> ${req.user.email || 'N/A'}</p><p><strong>Leave Dates:</strong> ${startDateFmt} to ${endDateFmt}</p><p><strong>Duration:</strong> ${Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1} day(s)</p><p><strong>Reason:</strong> ${reason || '—'}</p><p><strong>Link:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/leaves">View request in admin panel</a></p></div><div class="footer">HRMS Portal</div></div></body></html>`;
                    await transporter.sendMail({
                        from: `"${process.env.SMTP_FROM_NAME || 'HRMS Portal'}" <${process.env.SMTP_FROM_EMAIL}>`,
                        to: adminEmails.join(','),
                        subject: `Leave Request: ${req.user.name}`,
                        html: emailHtml
                    });
                } catch (emailErr) {
                    console.error('Admin leave request email failed:', emailErr.message);
                }
            }
        }

        res.status(201).json({ success: true, data: leave });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get my leave requests
// @route   GET /api/employee/leave
// @access  Private/Employee
exports.getMyLeaves = async (req, res, next) => {
    try {
        const leaves = await Leave.find({ employee: req.user.id });
        res.status(200).json({ success: true, count: leaves.length, data: leaves });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Mark attendance
// @route   POST /api/employee/attendance
// @access  Private/Employee
exports.markAttendance = async (req, res, next) => {
    try {
        const { status, location } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingAttendance = await Attendance.findOne({
            employee: req.user.id,
            date: { $gte: today }
        });
        if (existingAttendance) {
            return res.status(400).json({ success: false, error: 'Attendance already marked for today' });
        }
        const now = new Date();
        const attendance = await Attendance.create({
            employee: req.user.id,
            status,
            date: now,
            checkIn: now,
            location: location || {}
        });
        res.status(201).json({ success: true, data: attendance });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Check out
// @route   PUT /api/employee/attendance/checkout
// @access  Private/Employee
exports.checkOut = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await Attendance.findOne({
            employee: req.user.id,
            date: { $gte: today }
        });
        if (!attendance) return res.status(404).json({ success: false, error: 'No attendance found for today' });
        if (attendance.checkOut) return res.status(400).json({ success: false, error: 'Already checked out' });
        attendance.checkOut = new Date();
        await attendance.save();
        res.status(200).json({ success: true, data: attendance });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get my attendance
// @route   GET /api/employee/attendance
// @access  Private/Employee
exports.getMyAttendance = async (req, res, next) => {
    try {
        const attendance = await Attendance.find({ employee: req.user.id }).sort('-date');
        res.status(200).json({ success: true, count: attendance.length, data: attendance });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get salary details
// @route   GET /api/employee/salary
// @access  Private/Employee
exports.getSalaryDetails = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('salary name email department').populate('department', 'name');

        // Current month boundaries
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const allAttendance   = await Attendance.find({ employee: req.user.id });
        const monthAttendance = await Attendance.find({ employee: req.user.id, date: { $gte: monthStart, $lte: monthEnd } });

        const presentDays  = monthAttendance.filter(a => a.status === 'Present').length;
        const absentDays   = monthAttendance.filter(a => a.status === 'Absent').length;
        const leaveDays    = monthAttendance.filter(a => a.status === 'On Leave').length;

        // Working days elapsed so far this month (Mon–Sat, excluding Sundays)
        const today = now.getDate();
        let workingDaysElapsed = 0;
        for (let d = 1; d <= today; d++) {
            const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
            if (day !== 0) workingDaysElapsed++; // exclude Sunday
        }

        // Per-day salary based on 26 working days/month
        const perDay = (user.salary || 0) / 26;
        const earnedSalary = Math.round(perDay * presentDays);

        res.status(200).json({
            success: true,
            data: {
                salary: user.salary,
                name: user.name,
                email: user.email,
                department: user.department,
                presentDays,
                absentDays,
                leaveDays,
                totalDays: allAttendance.length,
                monthDays: monthAttendance.length,
                workingDaysElapsed,
                earnedSalary,
                perDay: Math.round(perDay)
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get attendances / employees at a place (today)
// @route   GET /api/employee/place
// @access  Private/Employee
exports.getEmployeesAtPlace = async (req, res, next) => {
    try {
        const { address } = req.query;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const match = { date: { $gte: today } };
        if (address && address.trim()) match['location.address'] = { $regex: address.trim(), $options: 'i' };

        const attendances = await Attendance.find(match).populate('employee', 'name email photo').sort('location.address');

        res.status(200).json({ success: true, count: attendances.length, data: attendances });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
