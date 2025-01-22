import express from 'express';
import sign from './sign.js';
import home from './home.js';
import affiliation from './affiliation.js';


const router = express.Router();
router.use('/sign', sign);
router.use('/affiliation', affiliation);
router.use('/', home);


export default router;