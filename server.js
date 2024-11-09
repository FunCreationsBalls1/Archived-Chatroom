const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:'); // Using in-memory DB for simplicity
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

db.serialize(() => {
    db.run("CREATE TABLE users (username TEXT UNIQUE)");
    db.run("CREATE TABLE messages (username TEXT, text TEXT)");
});

app.post('/setUsername', (req, res) => {
    const username = req.body.username;
    db.run("INSERT INTO users (username) VALUES (?)", [username], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

app.get('/messages', (req, res) => {
    db.all("SELECT * FROM messages", [], (err, rows) => {
        res.json({ messages: rows });
    });
});

app.post('/sendMessage', (req, res) => {
    const { username, message } = req.body;
    db.run("INSERT INTO messages (username, text) VALUES (?, ?)", [username, message], (err) => {
        if (err) throw err;
        res.sendStatus(200);
    });
});

app.listen(port, () => {
    console.log(`Chat server listening at http://localhost:${port}`);
});
