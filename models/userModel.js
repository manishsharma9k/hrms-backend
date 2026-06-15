const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['employee', 'admin', 'hr'],
        default: 'employee'
    },
    department: {
        type: mongoose.Schema.ObjectId,
        ref: 'Department'
    },
    salary: {
        type: Number,
        default: 0
    },
    photo: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    designation: {
        type: String,
        default: ''
    },
    technology: {
        type: String,
        default: ''
    },
    dateJoined: {
        type: Date,
        default: Date.now
    },
    employeeId: {
        type: String,
        unique: true,
        sparse: true,
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true });

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
    // Ensure a unique employeeId exists for employees
    if (!this.employeeId) {
        // Configurable format via env vars:
        // EMP_PREFIX (default 'EMP'), EMP_YEAR (true/false, default true), EMP_RANDOM_BYTES (default 3)
        const prefix = (process.env.EMP_PREFIX || 'EMP').toString();
        const includeYear = (process.env.EMP_YEAR || 'true').toString().toLowerCase() === 'true';
        const randBytes = parseInt(process.env.EMP_RANDOM_BYTES || '3', 10) || 3;
        const year = includeYear ? new Date().getFullYear() : '';
        const randomHex = crypto.randomBytes(randBytes).toString('hex').toUpperCase();
        this.employeeId = `${prefix}${year}${randomHex}`;
    }

    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expire (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

module.exports = mongoose.model('User', UserSchema);
