const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a department name'],
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    hodName: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    contactEmail: {
        type: String,
        default: ''
    },
    budget: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Department', DepartmentSchema);
