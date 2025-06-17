const express = require('express');
const fs = require('fs');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'mySuperSecretKey', // Replace with your secure key
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000 } // Optional: Set session expiration (e.g., 10 minutes)
}));

// File path for the JSON database
const userDBPath = path.join(__dirname, 'data', 'users.json');

// Middleware to check if user is logged in
function ensureAuthenticated(req, res, next) {
    if (req.session.username) {
        return next(); // User is authenticated, allow them to proceed
    }
    res.redirect('/'); // If not authenticated, redirect to login page
}

// Routes

// Serve the login page
app.get('/', (req, res) => {
    const errorMessage = req.query.error === 'invalid' ? 'Invalid username or password' : '';
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Serve the signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

// Serve the dashboard page (secured route)
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    const username = req.session.username;
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Serve other pages (secured routes)
app.get('/dietplan', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dietplan.html'));
});

app.get('/tutorials', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tutorials.html'));
});

// Serve the membership page (secured route)
app.get('/membership', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'membership.html'));
});

// Serve the about page (secured route)
app.get('/about', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('An error occurred while logging out.');
        }
        res.clearCookie('connect.sid'); // Clears the session cookie
        res.redirect('/'); // Redirect to login page after logout
    });
});

// Handle login requests
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Read the user database
    fs.readFile(userDBPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading user database');
        }

        const users = JSON.parse(data);

        // Find the user
        const user = users.find(
            (user) => user.username === username && user.password === password
        );

        if (user) {
            // If user found, store session data and redirect to the dashboard
            req.session.username = username;
            res.redirect(`/dashboard?username=${encodeURIComponent(username)}`);
        } else {
            // If credentials are incorrect, redirect back to the login page with an error
            res.redirect('/?error=invalid');
        }
    });
});

// Handle signup requests
app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;

    // Read the user database
    fs.readFile(userDBPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading user database');
        }

        const users = JSON.parse(data);

        // Check if the username or email already exists
        const userExists = users.some(
            (user) => user.username === username || user.email === email
        );

        if (userExists) {
            res.status(400).send('User already exists');
        } else {
            // Add the new user
            users.push({ username, email, password });

            // Write back to the database
            fs.writeFile(userDBPath, JSON.stringify(users, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Error saving user');
                }

                res.redirect('/'); // Redirect to the login page after successful signup
            });
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
