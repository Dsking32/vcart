const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const ejs = require('ejs');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Configure SQLite database
const db = new sqlite3.Database('users.db');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Create a users table if it doesn't exist
db.run(
  'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)'
);


// Serve the sign-up page
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Handle sign-up form submission
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  // Check if the username already exists
  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, row) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Internal Server Error');
      }

      if (row) {
        // Username already exists, provide an error message
        res.send('Username already exists. Please choose another username.');
      } else {
        // Hash the password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        db.run(
          'INSERT INTO users (username, password) VALUES (?, ?)',
          [username, hashedPassword],
          (insertErr) => {
            if (insertErr) {
              console.error(insertErr.message);
              return res.status(500).send('Internal Server Error');
            }

            res.send('Sign-up successful! You can now <a href="/login">Log In</a>.');
          }
        );
      }
    }
  );
});

// Serve the login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Handle login form submission
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, row) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Internal Server Error');
      }

      if (row) {
        // Verify the hashed password
        const passwordMatch = await bcrypt.compare(password, row.password);
        if (passwordMatch) {
          res.send('Login successful!');
        } else {
          res.send('Login failed. Please try again or <a href="/signup">Sign Up</a>.');
        }
      } else {
        res.send('User not found. Please try again or <a href="/signup">Sign Up</a>.');
      }
    }
  );
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});