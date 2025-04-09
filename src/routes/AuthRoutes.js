const express = require('express');
const router = express.Router();
const {signIn, signUp, verifyCode, resendVerificationCode, signUpSMS, resendVerificationCodeSMS} = require('../controllers/AuthController');

router.post('/signup', signUp);

router.post('/signupsms', signUpSMS)

router.post('/signin', signIn);

router.post('/verify', verifyCode);

router.post('/resend', resendVerificationCode);

router.post('/resendSMS', resendVerificationCodeSMS);

module.exports = router;
