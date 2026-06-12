const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['National', 'Regional', 'Company', 'Optional'], default: 'Company' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' }
}, { timestamps: true });

module.exports = mongoose.model('Holiday', HolidaySchema);
