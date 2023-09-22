const express = require('express');
const bodyParser = require('body-parser');
const emailVerification = require('./emailVerification'); // Importing email verification module
const crypto = require('crypto'); // Import crypto module
const app = express();
const port = 3000;

// Array to store customer details
const Users = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('signup', { Users });
});

// In case of an invalid URL
app.get('*', (req, res) => {
  res.status(404);
  res.send('Oops, invalid URL');
});

app.post('/user-signup', (req, res) => {
  const { firstName, lastName, emailaddress, phoneNumber, DOB, pwd, pwd2 } = req.body;

  // Basic validation to ensure no empty spaces are submitted
  if (!firstName || !lastName || !emailaddress || !phoneNumber || !pwd || !pwd2) {
    return res.status(400).send('All fields are required');
  }

  // Generate a unique verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Add the verificationToken property to the user object
  const newUser = {
    firstName, lastName, emailaddress, phoneNumber, DOB, pwd, pwd2, verificationToken, 
    isVerified: false, 
  };

  // Send a verification email using the emailVerification module
  emailVerification.sendVerificationEmail(emailaddress, verificationToken, (error, info) => {
    if (error) {
      return res.status(500).send('Email sending failed');
    }

    Users.push(newUser); // Push the newUser object to Users array
    console.log('Form submitted successfully');
    res.redirect('/verify');
  });
});


//verification status
app.get('/verify', (req, res) => {
  const { token } = req.query;

  // Find the user with the matching verification token
  const user = Users.find((u) => u.verificationToken === token);

  if (!user) {
    return res.status(404).send('Invalid or expired token');
  };
  // Update the user's status to indicate email verification
  user.isVerified = true;
  res.send('Email verification successful. You can now log in.');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


