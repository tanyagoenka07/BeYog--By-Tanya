const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config(); // For using .env variables

const app = express();
const PORT = process.env.PORT || 3000;

// ====== MONGODB CONNECTION ======
mongoose.connect(
    process.env.MONGO_URI, // 🔴 PASTE YOUR MONGODB LINK IN .env FILE AS MONGO_URI=yourlink
    { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// ====== MONGOOSE USER MODEL ======
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});
const User = mongoose.model('User', userSchema);

// ====== MIDDLEWARE ======
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SECRET_KEY || 'mySuperSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000 }
}));

// ====== AUTH MIDDLEWARE ======
function ensureAuthenticated(req, res, next) {
    if (req.session.username) return next();
    res.redirect('/');
}

// ====== ROUTES ======
app.get('/', (req, res) => {
    const errorMessage = req.query.error === 'invalid' ? 'Invalid username or password' : '';
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/dietplan', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dietplan.html'));
});

app.get('/tutorials', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tutorials.html'));
});

app.get('/membership', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'membership.html'));
});

app.get('/about', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error during logout');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// ====== AUTH LOGIC ======
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            req.session.username = username;
            res.redirect(`/dashboard?username=${encodeURIComponent(username)}`);
        } else {
            res.redirect('/?error=invalid');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            res.status(400).send('User already exists');
        } else {
            const newUser = new User({ username, email, password });
            await newUser.save();
            res.redirect('/');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error registering user');
    }
});

// ====== START SERVER ======
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
