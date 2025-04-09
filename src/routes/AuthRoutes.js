const express = require('express');
const router = express.Router();
const {signIn, signUp, verifyCode, resendVerificationCode, signUpSMS, resendVerificationCodeSMS, signInEmail, signInSMS} = require('../controllers/AuthController');

router.post('/signup', signUp);

router.post('/signupsms', signUpSMS)

router.post('/signinEmail', signInEmail);

router.post('/signinSMS', signInSMS);


router.post('/verify', verifyCode);

router.post('/resend', resendVerificationCode);

router.post('/resendSMS', resendVerificationCodeSMS);

module.exports = router;
