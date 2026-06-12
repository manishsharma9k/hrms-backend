const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Recruitment = require('../models/recruitmentModel');

// Ensure uploads folder exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, '..', 'uploads', 'resumes');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadsDir); },
    filename: function (req, file, cb) {
        const safe = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
        cb(null, safe);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// Public candidate apply endpoint
// Accepts fields: name, email, role, exp, location, phone, notes and optional file field 'cv'
router.post('/recruitment/apply', upload.single('cv'), async (req, res) => {
    try {
        const { name, email, role, exp, location, phone, notes } = req.body;
        if (!name || !role) return res.status(400).json({ success: false, error: 'Name and role are required' });
        const doc = { name, email: email || '', role, exp: exp || '', location: location || '', phone: phone || '', notes: notes || '' };
        if (req.file) {
            // store accessible URL path
            doc.cv = `/uploads/resumes/${req.file.filename}`;
        }
        const candidate = await Recruitment.create(doc);
        return res.status(201).json({ success: true, data: candidate });
    } catch (err) { return res.status(400).json({ success: false, error: err.message }); }
});

module.exports = router;
