const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(':memory:'); // Using in-memory DB for simplicity
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database
db.serialize(() => {
    db.run("CREATE TABLE users (username TEXT UNIQUE)");
    db.run("CREATE TABLE messages (username TEXT, text TEXT)");
});

// Route to set unique username
app.post('/setUsername', (req, res) => {
    const username = req.body.username;
    if (!username || username.trim() === "") {
        return res.json({ success: false, message: "Invalid username." });
    }
    db.run("INSERT INTO users (username) VALUES (?)", [username], (err) => {
        if (err) {
            // Username is already taken
            return res.json({ success: false, message: "Username is taken." });
        }
        res.json({ success: true });
    });
});

// Route to get all messages
app.get('/messages', (req, res) => {
    db.all("SELECT * FROM messages", [], (err, rows) => {
        if (err) throw err;
        res.json({ messages: rows });
    });
});

// Route to send a message
app.post('/sendMessage', (req, res) => {
    const { username, message } = req.body;
    db.run("INSERT INTO messages (username, text) VALUES (?, ?)", [username, message], (err) => {
        if (err) throw err;
        res.sendStatus(200);
    });
});

// Root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Chat server is running at http://localhost:${port}`);
});
