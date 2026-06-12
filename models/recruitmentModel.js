const mongoose = require('mongoose');

const RecruitmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, default: '' },
    role: { type: String, required: true },
    exp: { type: String, default: '' },
    location: { type: String, default: '' },
    phone: { type: String, default: '' },
    stage: {
        type: String,
        enum: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'],
        default: 'Applied'
    },
    interviewDate: { type: Date },
    interviewMode: { type: String, enum: ['Online', 'In-Person', ''], default: '' },
    notes: { type: String, default: '' },
    cv: { type: String, default: '' },
    actionLog: [{
        action: String,
        by: { type: mongoose.Schema.ObjectId, ref: 'User' },
        byName: String,
        at: { type: Date, default: Date.now },
        note: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Recruitment', RecruitmentSchema);
