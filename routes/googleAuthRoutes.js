const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');
const router = express.Router();

// Setup Google Strategy
passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(null, false, { message: 'No email from Google' });

        // Find existing user by email only (must already be registered)
        const user = await User.findOne({ email }).populate('department', 'name');
        if (!user) {
            return done(null, false, { message: 'No account found with this Google email. Please register first.' });
        }

        // Update photo if not set
        if (!user.photo && profile.photos?.[0]?.value) {
            user.photo = profile.photos[0].value;
            await user.save({ validateBeforeSave: false });
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    try { const user = await User.findById(id); done(null, user); }
    catch (err) { done(err, null); }
});

// ── Initiate Google OAuth ─────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
}));

// ── Google OAuth Callback ─────────────────────────────────────────────────────
router.get('/google/callback',
    passport.authenticate('google', { session: false, failWithError: true }),
    (req, res) => {
        const user = req.user;
        const token = user.getSignedJwtToken();
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Redirect to frontend with token — employee only
        if (user.role === 'admin') {
            return res.redirect(`${frontendURL}/admin-login?error=Admins+cannot+use+Google+login`);
        }

        res.redirect(`${frontendURL}/auth/google/success?token=${token}&name=${encodeURIComponent(user.name)}&role=${user.role}&employeeId=${user.employeeId || ''}`);
    },
    // Error handler
    (err, req, res, next) => {
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
        const msg = err?.message || 'Google login failed';
        res.redirect(`${frontendURL}/?error=${encodeURIComponent(msg)}`);
    }
);

module.exports = router;
