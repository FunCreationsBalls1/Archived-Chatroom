const express = require('express');
const { v4: uuidv4 } = require('uuid'); // UUID for unique session tokens
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const db = new sqlite3.Database(':memory:'); // Using in-memory DB for simplicity
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Serve emojis folder
app.use('/emojis', express.static(path.join(__dirname, 'Emojis')));

// Serve short videos folder with MIME type handling
app.use('/sv', (req, res, next) => {
    const filePath = path.join(__dirname, 'Sv', req.path);
    if (fs.existsSync(filePath) && req.path.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4'); // Explicitly set for MP4
    }
    next();
});

// Initialize Database
db.serialize(() => {
    db.run("CREATE TABLE users (username TEXT UNIQUE)");
    db.run("CREATE TABLE messages (username TEXT, text TEXT)");
    db.run("CREATE TABLE sessions (username TEXT, token TEXT UNIQUE)");
});

// Emoji and short video replacement function
function replaceMediaTags(text) {
    const emojiFolder = path.join(__dirname, 'Emojis');
    const svFolder = path.join(__dirname, 'Sv');
    const emojis = fs.readdirSync(emojiFolder);
    const videos = fs.readdirSync(svFolder);

    let replacedText = text;

    // Replace emojis
    emojis.forEach(file => {
        const emojiName = path.parse(file).name; // Get file name without extension
        const emojiTag = `:${emojiName}:`;
        if (replacedText.includes(emojiTag)) {
            replacedText = replacedText.replaceAll(
                emojiTag,
                `<img src="/emojis/${file}" alt="${emojiName}" style="width:20px; height:20px;">`
            );
        }
    });

    // Replace short videos
    videos.forEach(file => {
        if (path.extname(file) === '.mp4') { // Only allow .mp4 files
            const videoName = path.parse(file).name; // Get file name without extension
            const videoTag = `:${videoName}:`;
            if (replacedText.includes(videoTag)) {
                replacedText = replacedText.replaceAll(
                    videoTag,
                    `<video src="/sv/${file}" autoplay muted loop style="width:100px; height:100px;"></video>`
                );
            }
        }
    });

    return replacedText;
}

// Endpoint: Serve list of available emojis
app.get('/emojis', (req, res) => {
    const emojiFolder = path.join(__dirname, 'Emojis');
    fs.readdir(emojiFolder, (err, files) => {
        if (err) {
            console.error("Error reading emojis folder:", err);
            return res.status(500).json({ message: "Failed to load emojis." });
        }
        res.json({ emojis: files });
    });
});

// Endpoint: Serve list of available short videos
app.get('/sv', (req, res) => {
    const svFolder = path.join(__dirname, 'Sv');
    fs.readdir(svFolder, (err, files) => {
        if (err) {
            console.error("Error reading Sv folder:", err);
            return res.status(500).json({ message: "Failed to load videos." });
        }
        const supportedVideos = files.filter(file => path.extname(file) === '.mp4'); // Allow .mp4 only
        res.json({ sv: supportedVideos });
    });
});

// Route to set unique username and create session
app.post('/setUsername', (req, res) => {
    const username = req.body.username;
    if (!username || username.trim() === "") {
        return res.json({ success: false, message: "Invalid username." });
    }
    if (!username || username.trim() === "") {
        return res.json({ success: false, message: "Invalid username." });
    }
    const token = uuidv4();
    db.run("INSERT INTO users (username) VALUES (?)", [username], (err) => {
        if (err) {
            // Username is already taken
            return res.json({ success: false, message: "Username is taken." });
            return res.json({ success: false, message: "Username is taken." });
        }
        db.run("INSERT INTO sessions (username, token) VALUES (?, ?)", [username, token], () => {
            res.json({ success: true, token });
        });
    });
});

// Route to validate session token
app.post('/validateSession', (req, res) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.json({ success: false });
    }
    db.get("SELECT username FROM sessions WHERE token = ?", [token], (err, row) => {
        if (err || !row) {
            return res.json({ success: false });
        }
        res.json({ success: true, username: row.username });
    });
});

// Route to get all messages
app.get('/messages', (req, res) => {
    db.all("SELECT * FROM messages", [], (err, rows) => {
        if (err) throw err;
        const messages = rows.map(row => ({
            username: row.username,
            text: replaceMediaTags(row.text)
        }));
        res.json({ messages });
    });
});

// Route to send a message
app.post('/sendMessage', (req, res) => {
    const token = req.headers['authorization'];
    const { message } = req.body;
    db.get("SELECT username FROM sessions WHERE token = ?", [token], (err, row) => {
        if (err || !row) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const username = row.username;
        const processedMessage = replaceMediaTags(message);
        db.run("INSERT INTO messages (username, text) VALUES (?, ?)", [username, processedMessage], (err) => {
            if (err) throw err;
            res.sendStatus(200);
        });
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
