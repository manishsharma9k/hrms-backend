const express = require('express');
const router = express.Router();
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const Recruitment = require('../models/recruitmentModel');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

const uploadBufferToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder, resource_type: 'auto' }, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

// Public candidate apply endpoint
// Accepts fields: name, email, role, exp, location, phone, notes and optional file field 'cv'
router.post('/recruitment/apply', upload.single('cv'), async (req, res) => {
    try {
        const { name, email, role, exp, location, phone, notes } = req.body;
        if (!name || !role) return res.status(400).json({ success: false, error: 'Name and role are required' });
        const doc = { name, email: email || '', role, exp: exp || '', location: location || '', phone: phone || '', notes: notes || '' };
        if (req.file) {
            const uploadResult = await uploadBufferToCloudinary(req.file.buffer, 'hrms/resumes');
            doc.cv = uploadResult.secure_url || uploadResult.url || '';
        }
        const candidate = await Recruitment.create(doc);
        return res.status(201).json({ success: true, data: candidate });
    } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
