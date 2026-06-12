const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'On Leave'],
        required: true
    },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    location: {
        lat: { type: String, default: null },
        lng: { type: String, default: null },
        address: { type: String, default: null }
    }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
