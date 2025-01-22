import express from 'express';
import { getFees, sendOtp,verifyAffOtp, verifyPayment , verify_certificate} from '../controllers/affiliation.js';

const router = express.Router();

router.post('/getfees', getFees);
router.post('/sendotp', sendOtp);
router.post('/verifyotp', verifyAffOtp);
router.post('/verify_payment', verifyPayment);
router.post('/verify_certificate', verify_certificate);

export default router;