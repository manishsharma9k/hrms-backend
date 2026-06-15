const User = require('../models/userModel');
const Department = require('../models/departmentModel');
const Leave = require('../models/leaveModel');
const Notification = require('../models/notificationModel');
const Holiday = require('../models/holidayModel');
const Attendance = require('../models/attendanceModel');
const Recruitment = require('../models/recruitmentModel');
const { ensureDefaultDepartments } = require('../utils/defaultDepartments');
const resolveDepartmentId = require('../utils/resolveDepartmentId');

// Helper: notify all admins + hr
const notifyAdmins = async (message, type, link = '') => {
    const admins = await User.find({ role: { $in: ['admin', 'hr'] } }).select('_id');
    await Notification.insertMany(admins.map(a => ({ userId: a._id, message, type, link })));
};

// ─── Employees ───────────────────────────────────────────────────────────────

exports.getEmployees = async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' }).populate('department', 'name').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: employees.length, data: employees });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.addEmployee = async (req, res) => {
    try {
        const { name, email, password, department, salary, technology } = req.body;
        const deptId = await resolveDepartmentId(department);
        const employee = await User.create({ name, email, password, role: 'employee', department: deptId, salary, technology });
        await notifyAdmins(`👤 New employee added: ${name}`, 'Employee', '/admin/employees');
        res.status(201).json({ success: true, data: employee });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ success: false, error: 'An employee with this email already exists.' });
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        let employee = await User.findById(req.params.id);
        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
        if (req.body.password) delete req.body.password;
        if (req.body.department !== undefined) {
            req.body.department = await resolveDepartmentId(req.body.department);
        }
        employee = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        await notifyAdmins(`✏️ Employee profile updated: ${employee.name}`, 'Employee', '/admin/employees');
        res.status(200).json({ success: true, data: employee });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id);
        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
        const name = employee.name;
        await employee.deleteOne();
        await notifyAdmins(`🗑️ Employee removed: ${name}`, 'Employee', '/admin/employees');
        res.status(200).json({ success: true, data: {} });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// ─── Departments ─────────────────────────────────────────────────────────────

exports.getDepartments = async (req, res) => {
    try {
        await ensureDefaultDepartments(Department);
        const departments = await Department.find();
        res.status(200).json({ success: true, count: departments.length, data: departments });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.addDepartment = async (req, res) => {
    try {
        const department = await Department.create(req.body);
        await notifyAdmins(`🏢 New department created: ${department.name}`, 'Department', '/admin/departments');
        res.status(201).json({ success: true, data: department });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.updateDepartment = async (req, res) => {
    try {
        const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!department) return res.status(404).json({ success: false, error: 'Department not found' });
        await notifyAdmins(`✏️ Department updated: ${department.name}`, 'Department', '/admin/departments');
        res.status(200).json({ success: true, data: department });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) return res.status(404).json({ success: false, error: 'Department not found' });
        const name = department.name;
        await department.deleteOne();
        await notifyAdmins(`🗑️ Department deleted: ${name}`, 'Department', '/admin/departments');
        res.status(200).json({ success: true, data: {} });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// ─── Leaves ──────────────────────────────────────────────────────────────────

exports.getAllLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find().populate('employee', 'name email');
        res.status(200).json({ success: true, count: leaves.length, data: leaves });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.updateLeaveStatus = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        if (!['Pending', 'Approved', 'Rejected'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
        if (status === 'Rejected' && !rejectionReason?.trim()) return res.status(400).json({ success: false, error: 'Rejection reason is required' });

        const updateData = { status };
        if (status === 'Rejected') updateData.rejectionReason = rejectionReason.trim();

        const leave = await Leave.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('employee', 'name email');
        if (!leave) return res.status(404).json({ success: false, error: 'Leave request not found' });

        // In-app notification to employee
        const notifMsg = status === 'Rejected'
            ? `Your leave request was rejected by ${req.user.name}. Reason: ${rejectionReason.trim()}`
            : `Your leave request has been ${status} by ${req.user.name}`;
        await Notification.create({ userId: leave.employee._id, message: notifMsg, type: 'Leave', link: '/employee/leaves' });

        // Notify all admins/hr
        const icon = status === 'Approved' ? '✅' : '❌';
        await notifyAdmins(`${icon} Leave ${status.toLowerCase()} for ${leave.employee.name}`, 'Leave', '/admin/leaves');

        // Send email to employee
        if (leave.employee.email) {
            try {
                const nodemailer = require('nodemailer');
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT),
                    secure: false,
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                });

                const startDate = new Date(leave.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                const endDate = new Date(leave.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1;
                const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                const isApproved = status === 'Approved';
                const statusColor = isApproved ? '#10B981' : '#EF4444';
                const statusBg = isApproved ? '#D1FAE5' : '#FEE2E2';

                const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:30px;color:#1e293b}
.wrapper{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;color:#fff;text-align:center}
.header h1{font-size:22px;font-weight:800}
.header p{font-size:13px;opacity:0.8;margin-top:4px}
.status-badge{display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.35);border-radius:20px;padding:5px 18px;font-size:12px;font-weight:700;margin-top:10px;letter-spacing:0.5px}
.body{padding:32px 40px}
.greeting{font-size:15px;margin-bottom:18px;line-height:1.7}
.status-box{text-align:center;padding:20px;background:${statusBg};border-radius:10px;margin:20px 0;border:1px solid ${statusColor}30}
.status-box .icon{font-size:36px;margin-bottom:8px}
.status-box h2{font-size:20px;font-weight:800;color:${statusColor}}
.status-box p{font-size:13px;color:#475569;margin-top:6px}
.details-card{background:#f8fafc;border-radius:10px;padding:20px 24px;margin:20px 0;border:1px solid #e2e8f0}
.details-card h3{font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px}
.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
.detail-row:last-child{border-bottom:none}
.detail-row label{color:#64748b;font-weight:500}
.detail-row span{color:#0f172a;font-weight:700}
.message-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:16px 0;font-size:13px;color:#92400e;line-height:1.6}
.footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;font-size:11px;color:#94a3b8}
</style></head><body>
<div class="wrapper">
  <div class="header">
    <h1>HRMS Portal</h1>
    <p>Leave Request Update</p>
    <span class="status-badge">LEAVE ${status.toUpperCase()}</span>
  </div>
  <div class="body">
    <p class="greeting">Dear <strong>${leave.employee.name}</strong>,</p>
    <div class="status-box">
      <div class="icon">${isApproved ? '✅' : '❌'}</div>
      <h2>Leave ${status}</h2>
      <p>Your leave request has been <strong>${status.toLowerCase()}</strong> by <strong>${req.user.name}</strong>.</p>
    </div>
    <div class="details-card">
      <h3>Leave Details</h3>
      <div class="detail-row"><label>Employee</label><span>${leave.employee.name}</span></div>
      <div class="detail-row"><label>From Date</label><span>${startDate}</span></div>
      <div class="detail-row"><label>To Date</label><span>${endDate}</span></div>
      <div class="detail-row"><label>Duration</label><span>${days} day${days > 1 ? 's' : ''}</span></div>
      <div class="detail-row"><label>Reason</label><span>${leave.reason || '—'}</span></div>
      <div class="detail-row"><label>Status</label><span style="color:${statusColor}">${status}</span></div>
      <div class="detail-row"><label>Processed By</label><span>${req.user.name}</span></div>
      <div class="detail-row"><label>Processed On</label><span>${today}</span></div>
      ${!isApproved && rejectionReason ? `<div class="detail-row"><label>Rejection Reason</label><span style="color:#EF4444">${rejectionReason}</span></div>` : ''}
    </div>
    ${isApproved
        ? `<div class="message-box">📌 Please ensure your work is handed over before your leave begins. Enjoy your time off!</div>`
        : `<div class="message-box">📌 If you have any questions regarding this decision, please contact your HR manager.</div>`
    }
    <p style="font-size:13px;color:#64748b;margin-top:16px;line-height:1.7">You can view your leave status anytime by logging into the <strong>HRMS Portal</strong>.</p>
  </div>
  <div class="footer">
    <p>HRMS Portal | HR Department | ${today}</p>
    <p style="margin-top:4px">This is an automated notification. Please do not reply to this email.</p>
  </div>
</div>
</body></html>`;

                await transporter.sendMail({
                    from: `"${process.env.SMTP_FROM_NAME || 'HRMS Portal'}" <${process.env.SMTP_FROM_EMAIL}>`,
                    to: leave.employee.email,
                    subject: `Leave ${status} — ${startDate} to ${endDate} | HRMS Portal`,
                    html
                });
            } catch (mailErr) {
                console.error('Leave email failed:', mailErr.message);
            }
        }

        res.status(200).json({ success: true, data: leave });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// ─── Employee Profile ─────────────────────────────────────────────────────────

exports.getEmployeeProfile = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id).populate('department', 'name');
        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
        const attendance = await Attendance.find({ employee: req.params.id }).sort('-date');
        const presentDays = attendance.filter(a => a.status === 'Present').length;
        const absentDays = attendance.filter(a => a.status === 'Absent').length;
        const leaveDays = attendance.filter(a => a.status === 'On Leave').length;
        const leaves = await Leave.find({ employee: req.params.id }).sort('-createdAt');
        res.status(200).json({ success: true, data: { employee, attendance, presentDays, absentDays, leaveDays, totalDays: attendance.length, leaves } });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.getEmployeeByEmployeeId = async (req, res) => {
    try {
        const query = req.params.employeeId;
        // Search by employeeId field OR by name (case-insensitive)
        const employee = await User.findOne({
            role: 'employee',
            $or: [
                { employeeId: query },
                { name: { $regex: query, $options: 'i' } }
            ]
        }).populate('department', 'name');

        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

        const attendance = await Attendance.find({ employee: employee._id }).sort('-date');
        const presentDays = attendance.filter(a => a.status === 'Present').length;
        const absentDays  = attendance.filter(a => a.status === 'Absent').length;
        const leaveDays   = attendance.filter(a => a.status === 'On Leave').length;
        const leaves      = await Leave.find({ employee: employee._id }).sort('-createdAt');

        res.status(200).json({ success: true, data: { employee, attendance, presentDays, absentDays, leaveDays, totalDays: attendance.length, leaves } });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// ─── Holidays ─────────────────────────────────────────────────────────────────

exports.getHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find().sort('date');
        res.status(200).json({ success: true, count: holidays.length, data: holidays });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.addHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.create({ ...req.body, status: 'Approved' });
        await notifyAdmins(`🎉 New holiday added: ${holiday.name} on ${new Date(holiday.date).toLocaleDateString('en-IN')}`, 'Holiday', '/admin/holidays');
        res.status(201).json({ success: true, data: holiday });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.updateHolidayStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Approved', 'Rejected', 'Pending'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
        const holiday = await Holiday.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!holiday) return res.status(404).json({ success: false, error: 'Holiday not found' });
        await notifyAdmins(`📅 Holiday "${holiday.name}" marked as ${status}`, 'Holiday', '/admin/holidays');
        res.status(200).json({ success: true, data: holiday });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findById(req.params.id);
        if (!holiday) return res.status(404).json({ success: false, error: 'Holiday not found' });
        const name = holiday.name;
        await holiday.deleteOne();
        await notifyAdmins(`🗑️ Holiday removed: ${name}`, 'Holiday', '/admin/holidays');
        res.status(200).json({ success: true, data: {} });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// ─── Recruitment ──────────────────────────────────────────────────────────────

exports.getCandidates = async (req, res) => {
    try {
        const candidates = await Recruitment.find().sort('-createdAt');
        res.status(200).json({ success: true, data: candidates });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.addCandidate = async (req, res) => {
    try {
        const candidate = await Recruitment.create(req.body);
        await notifyAdmins(`💼 New candidate added: ${candidate.name} for ${candidate.role}`, 'Recruitment', '/admin/recruitment');
        res.status(201).json({ success: true, data: candidate });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.candidateAction = async (req, res) => {
    try {
        const { action, stage, interviewDate, interviewMode, notes } = req.body;
        const update = {};
        if (stage) update.stage = stage;
        if (interviewDate !== undefined) update.interviewDate = interviewDate || null;
        if (interviewMode !== undefined) update.interviewMode = interviewMode;
        if (notes !== undefined) update.notes = notes;

        const logEntry = {
            action: action || (stage ? `Moved to ${stage}` : 'Updated'),
            by: req.user._id,
            byName: req.user.name,
            at: new Date(),
            note: notes || ''
        };

        const candidate = await Recruitment.findByIdAndUpdate(
            req.params.id,
            { ...update, $push: { actionLog: logEntry } },
            { new: true, runValidators: true }
        );
        if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });

        const actionLabel = stage ? `moved to ${stage}` : (action || 'updated');
        await notifyAdmins(`🔄 Candidate ${candidate.name} ${actionLabel} by ${req.user.name}`, 'Recruitment', '/admin/recruitment');

        res.status(200).json({ success: true, data: candidate });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.deleteCandidate = async (req, res) => {
    try {
        const candidate = await Recruitment.findById(req.params.id);
        if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });
        const name = candidate.name;
        await candidate.deleteOne();
        await notifyAdmins(`🗑️ Candidate removed: ${name}`, 'Recruitment', '/admin/recruitment');
        res.status(200).json({ success: true, data: {} });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

        const [employees, departments, leaves, todayAttendance, allEmployees] = await Promise.all([
            User.countDocuments({ role: 'employee' }),
            Department.countDocuments(),
            Leave.find().populate('employee', 'name email'),
            Attendance.find({ date: { $gte: today, $lt: tomorrow } }),
            User.find({ role: 'employee' }).select('salary _id')
        ]);

        // Compute earned salary: sum of (presentDays this month / 26) * grossSalary per employee
        const monthAttendance = await Attendance.find({
            date: { $gte: monthStart, $lte: monthEnd },
            status: 'Present'
        });
        const presentByEmp = {};
        monthAttendance.forEach(a => {
            const id = a.employee.toString();
            presentByEmp[id] = (presentByEmp[id] || 0) + 1;
        });
        const totalEarnedSalary = allEmployees.reduce((sum, emp) => {
            const days = presentByEmp[emp._id.toString()] || 0;
            return sum + Math.round(((emp.salary || 0) / 26) * days);
        }, 0);

        const totalGrossSalary = allEmployees.reduce((s, e) => s + (e.salary || 0), 0);

        const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
        const presentToday = todayAttendance.filter(a => a.status === 'Present').length;
        const absentToday = employees - presentToday;

        res.status(200).json({
            success: true,
            data: {
                employees, departments, pendingLeaves,
                totalSalary: totalGrossSalary,
                totalEarnedSalary,
                presentToday, absentToday,
                leaves: leaves.slice(-10).reverse()
            }
        });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};
