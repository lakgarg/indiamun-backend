import express from 'express';
import env from 'dotenv';
import bodyParser from 'body-parser';
import router from './routes/routes.js';
import cors from 'cors';
import cron from 'node-cron';
import deleteExpiredOtps from './utils/deleteExpiredOTPs_shedule.js';
import session from 'express-session';
import passport from 'passport';

env.config();

const app = express();
const port = process.env.PORT || 8000; // Set default port to 8000
app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
    origin: ["http://localhost:3000", "https://indiamun.org","https://indiamun-main-website-e3160.firebaseapp.com/","https://indiamun-main-website-e3160.web.app/"],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true, // Allow credentials if needed
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); // Preflight response for all routes
app.use(express.urlencoded({ extended: true }));

// Configure session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-default-secret',
    resave: false,
    saveUninitialized: true,
}));


// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://indiamun.org");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    res.header("Access-Control-Allow-Credentials", "true"); // Allow credentials if needed
    next();
});

app.use(router);

// Schedule the deleteExpiredOtps function to run every day
cron.schedule('0 0 * * *', () => {
    deleteExpiredOtps();
});

// // Start the server
// app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
// });

export default app;