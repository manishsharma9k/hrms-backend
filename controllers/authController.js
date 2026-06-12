const User = require('../models/userModel');
const Department = require('../models/departmentModel');
const { ensureDefaultDepartments } = require('../utils/defaultDepartments');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// @desc    Get departments for registration
// @route   GET /api/auth/departments
// @access  Public
exports.getPublicDepartments = async (req, res, next) => {
    try {
        await ensureDefaultDepartments(Department);
        const departments = await Department.find().select('name _id');
        res.status(200).json({ success: true, data: departments });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Register a new admin
// @route   POST /api/auth/admin/register
// @access  Protected by secret key
exports.registerAdmin = async (req, res, next) => {
    try {
        const { name, email, password, adminSecret, photo } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Name, email and password are required' });
        }
        const validSecret = (process.env.ADMIN_SECRET || 'hrms@admin2026').trim();
        const providedSecret = (adminSecret || '').trim();
        if (!providedSecret || providedSecret !== validSecret) {
            return res.status(403).json({ success: false, error: 'Invalid admin secret key' });
        }
        const user = await User.create({ name, email, password, role: 'admin', photo: photo || '' });
        sendTokenResponse(user, 201, res);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, error: 'Email already exists.' });
        }
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role, department, technology, photo } = req.body;

        // department string (name) aa sakta hai ya ObjectId — dono handle karo
        let deptId = null;
        if (department) {
            const mongoose = require('mongoose');
            const isObjectId = mongoose.Types.ObjectId.isValid(department) && String(new mongoose.Types.ObjectId(department)) === department;
            if (isObjectId) {
                deptId = department;
            } else {
                // name se department dhundho
                const found = await Department.findOne({ name: { $regex: new RegExp(`^${department}$`, 'i') } });
                if (found) {
                    deptId = found._id;
                } else {
                    const newDept = await Department.create({ name: department });
                    deptId = newDept._id;
                }
            }
        }

        const user = await User.create({ name, email, password, role: role || 'employee', department: deptId, technology, photo: photo || '' });

        if (role === 'employee' || !role) {
            const Notification = require('../models/notificationModel');
            const admins = await User.find({ role: { $in: ['admin', 'hr'] } }).select('_id email name');

            // In-app notification
            if (admins.length > 0) {
                await Notification.insertMany(admins.map(a => ({
                    userId: a._id,
                    message: `🆕 New employee registered: ${name} (${email})`,
                    type: 'Employee',
                    link: '/admin/employees'
                })));
            }

            // Email notification to all admins
            const adminEmails = admins.map(a => a.email).filter(Boolean);
            if (adminEmails.length > 0) {
                try {
                    const populatedUser = await User.findById(user._id).populate('department', 'name');
                    const deptName = populatedUser?.department?.name || 'Not Assigned';
                    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:30px;color:#1e293b}
.wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 36px;color:#fff}
.header h1{font-size:20px;font-weight:800;margin:0}
.header p{font-size:13px;opacity:.8;margin:4px 0 0}
.badge{display:inline-block;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;margin-top:10px;letter-spacing:.5px}
.body{padding:28px 36px}
.alert{background:#EEF2FF;border:1px solid #C7D2FE;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px}
.alert-icon{font-size:32px;flex-shrink:0}
.alert h2{font-size:16px;font-weight:700;color:#3730a3;margin:0 0 3px}
.alert p{font-size:13px;color:#4338ca;margin:0}
.card{background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:20px}
.card-header{background:#f1f5f9;padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0}
.row{display:flex;padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px}
.row:last-child{border-bottom:none}
.lbl{color:#64748b;font-weight:500;min-width:150px;flex-shrink:0}
.val{color:#0f172a;font-weight:700}
.btn{display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
.footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 36px;text-align:center;font-size:11px;color:#94a3b8}
</style>
</head><body>
<div class="wrapper">
  <div class="header">
    <h1>&#128226; New Employee Registered</h1>
    <p>A new employee has joined your organization</p>
    <span class="badge">ACTION REQUIRED</span>
  </div>
  <div class="body">
    <div class="alert">
      <div class="alert-icon">&#128100;</div>
      <div>
        <h2>${name} has registered</h2>
        <p>Registered on ${today} at ${time}</p>
      </div>
    </div>
    <div class="card">
      <div class="card-header">Employee Details</div>
      <div class="row"><span class="lbl">Full Name</span><span class="val">${name}</span></div>
      <div class="row"><span class="lbl">Email Address</span><span class="val">${email}</span></div>
      <div class="row"><span class="lbl">Employee ID</span><span class="val" style="font-family:monospace">${user.employeeId || 'Auto-generated'}</span></div>
      <div class="row"><span class="lbl">Department</span><span class="val">${deptName}</span></div>
      <div class="row"><span class="lbl">Technology</span><span class="val">${technology || 'Not specified'}</span></div>
      <div class="row"><span class="lbl">Registered On</span><span class="val">${today} at ${time}</span></div>
    </div>
    <p style="font-size:13px;color:#64748b;margin-bottom:20px;line-height:1.6">Please review this employee profile, assign salary and complete the onboarding process from the Admin Panel.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/employees" class="btn">View in Admin Panel &#8594;</a>
  </div>
  <div class="footer">
    <p>HRMS Portal | Admin Notification | ${today}</p>
    <p style="margin-top:4px">This is an automated notification. Do not reply to this email.</p>
  </div>
</div>
</body></html>`;

                    await createTransporter().sendMail({
                        from: `"${process.env.SMTP_FROM_NAME || 'HRMS Portal'}" <${process.env.SMTP_FROM_EMAIL}>`,
                        to: adminEmails.join(', '),
                        subject: `New Employee Registered: ${name} | HRMS Portal`,
                        html
                    });
                } catch (mailErr) {
                    console.error('Admin notification email failed:', mailErr.message);
                }
            }
        }

        sendTokenResponse(user, 201, res);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, error: 'Email already exists. Please use a different email or log in.' });
        }
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide an email and password' });
        }
        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials' });
        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate('department');
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
    res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
    res.status(200).json({ success: true, data: {} });
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();
    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') options.secure = true;
    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId || null,
            technology: user.technology || null
        }
    });
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json({ success: false, error: 'There is no user with that email' });
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/resetpassword/${resetToken}`;
        console.log(`\n\n======================================`);
        console.log(`🔑 PASSWORD RESET LINK:`);
        console.log(`${resetUrl}`);
        console.log(`======================================\n\n`);
        res.status(200).json({ success: true, data: 'Email sent (check backend console for link)' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Email could not be sent' });
    }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
    try {
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
        const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        res.status(200).json({ success: true, data: 'Password updated successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update profile (name, phone, designation, department, photo)
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { photo, phone, designation, department, name } = req.body;
        const fields = {};
        if (name && name.trim()) fields.name = name.trim();
        if (phone !== undefined) fields.phone = phone;
        if (designation !== undefined) fields.designation = designation;
        if (department !== undefined) fields.department = department || null;
        if (photo && photo.trim()) fields.photo = photo;
        const updated = await User.findByIdAndUpdate(req.user.id, { $set: fields }, { new: true, runValidators: true }).populate('department', 'name');
        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Change password
// @route   PUT /api/auth/changepassword
// @access  Private
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Please provide current and new password' });
        const user = await User.findById(req.user.id).select('+password');
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        user.password = newPassword;
        await user.save();
        res.status(200).json({ success: true, data: 'Password updated successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
