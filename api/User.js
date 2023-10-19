const express = require('express');
const router = express.Router();
const User = require('./../models/user');
const UserVerification = require('./../models/userverification');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require("uuid");
const path = require("path");
require("dotenv").config();
const currentUrl = process.env.APP_URL;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error(error);
  } else {
    console.log("Ready for sending emails");
  }
});

// Helper function to send a verification email
const sendVerificationEmail = async (user, res) => {
  //const currentUrl = "http://localhost:3000/";
  const uniqueString = uuidv4() + user._id;

  try {
    const hashedUniqueString = await bcrypt.hash(uniqueString, 10);

    const newVerification = new UserVerification({
      userId: user._id,
      uniqueString: hashedUniqueString,
      createdAt: Date.now(),
      expiresAt: Date.now() + 21600000, // 6 hours
    });

    await newVerification.save();

    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: user.email,
      subject: "Verify your email",
      html: `<p>Verify your email address to complete the signup and login into your account.</p>
             <p>This link <b>expires in 6 hours</b>.</p>
             <p>Press <a href="${currentUrl}user/verify/${user._id}/${uniqueString}">here</a> to proceed</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({
      status: "PENDING",
      message: "Verification email sent"
    });
  } catch (error) {
    console.error('Error:', error);
    res.json({
      status: "FAILED",
      message: "An error occurred while sending the verification email"
    });
  }
};

router.post('/signup', async (req, res) => {
  try {
    const { name, email, dateOfBirth, phoneNumber, password, confirmPassword } = req.body;
    const trimmedFields = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      confirmPassword: confirmPassword.trim(),
      dateOfBirth: dateOfBirth.trim(),
      phoneNumber: phoneNumber.trim(),
    };

    const validations = [
      !trimmedFields.name && 'Please fill all required fields',
      !/^[a-zA-Z ]*$/.test(trimmedFields.name) && 'Invalid name entered',
      !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(trimmedFields.email) && 'Invalid email entered',
      !/^(\+234|0)[789]\d{9}$/.test(trimmedFields.phoneNumber) && 'Invalid phone number: must be a Nigerian registered number',
      !Date.parse(trimmedFields.dateOfBirth) && 'Invalid date entered',
      trimmedFields.password.length < 8 && 'Password is too short',
      trimmedFields.password !== trimmedFields.confirmPassword && 'Passwords do not match',
    ];

    const validationError = validations.find(validation => validation);
    if (validationError) {
      return res.json({ status: 'FAILED', message: validationError });
    }

    const phone = await User.findOne({ phoneNumber });
    if (phone) {
      return res.json({ status: 'FAILED', message: 'User with provided phone already exists' });
    }

    const existingUser = await User.findOne({ email: trimmedFields.email });
    if (existingUser) {
      return res.json({ status: 'FAILED', message: 'User with provided email already exists' });
    }

    const saltFactor = 10;
    const hashedPassword = await bcrypt.hash(trimmedFields.password, saltFactor);

    const newUser = new User({
      name: trimmedFields.name,
      email: trimmedFields.email,
      phoneNumber: trimmedFields.phoneNumber,
      password: hashedPassword,
      dateOfBirth: trimmedFields.dateOfBirth,
      verified: false,
    });

    const savedUser = await newUser.save();
    sendVerificationEmail(savedUser, res);
  } catch (error) {
    console.error('Error:', error);
    res.json({ status: 'FAILED', message: 'An error occurred during sign-up' });
  }
});

router.get('/verify/:userId/:uniqueString', async (req, res) => {
  const { userId, uniqueString } = req.params;

  try {
    const verificationRecord = await UserVerification.findOne({ userId });

    if (!verificationRecord) {
      return res.redirect('/user/verified?error=true&message=Account record does not exist or has already been verified. Please sign up or log in.');
    }

    const { expiresAt, uniqueString: hashedUniqueString } = verificationRecord;

    if (expiresAt < Date.now()) {
      await UserVerification.deleteOne({ userId });
      await User.deleteOne({ _id: userId });
      return res.redirect('/user/verified?error=true&message=Link has expired. Please sign up again.');
    }

    const passwordMatch = await bcrypt.compare(uniqueString, hashedUniqueString);

    if (passwordMatch) {
      await User.updateOne({ _id: userId }, { verified: true });
      await UserVerification.deleteOne({ userId });
      return res.sendFile(path.join(__dirname, "./../views/verified.html"));
    } else {
      return res.redirect('/user/verified?error=true&message=Invalid verification details passed. Check your inbox.');
    }
  } catch (error) {
    console.error('Error:', error);
    res.redirect('/user/verified?error=true&message=An error occurred while verifying the user.');
  }
});

router.get("/verified", (req, res) => {
  // Handle the verified route here
});



// signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return res.json({ status: "FAILED", message: "Please fill all fields" });
    }

    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.json({ status: "FAILED", message: "User does not exist" });
    }

    if (!user.verified) {
      return res.json({ status: "FAILED", message: "Email hasn't been verified yet, check your inbox" });
    }else {

      const passwordMatch = await bcrypt.compare(trimmedPassword, user.password);

      if (passwordMatch) {
        return res.json({
          status: "SUCCESSFUL",
          message: "Sign in successful",
          data: user,
        });
      } else {
        return res.json({ status: "FAILED", message: "Invalid password entered" });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    res.json({ status:"FAILED", message: "An error occurred during sign-in" });
  }
}
);


// Add this route below the other routes in your code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      return res.json({ status: "FAILED", message: "Please provide an email address" });
    }

    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.json({ status: "FAILED", message: "User with this email does not exist" });
    }

    // Generate a unique reset token, which will be sent via email
    const resetToken = uuidv4();

    // Save the reset token and its expiration time in the user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour

    await user.save();

    // Send an email to the user with the reset token
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: trimmedEmail,
      subject: "Password Reset",
      html: `<p>You have requested a password reset.</p>
             <p>Click <a href="${currentUrl}user/reset-password/${resetToken}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ status: "SUCCESSFUL", message: "Password reset email sent" });
  } catch (error) {
    console.error('Error:', error);
    res.json({ status: "FAILED", message: "An error occurred during the password reset process" });
  }
});


// Add a new route to handle the password reset link (similar to email verification)
router.get('/reset-password/:resetToken', async (req, res) => {
  const { resetToken } = req.params;

  try {
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.redirect('/user/verified?error=true&message=Invalid or expired password reset link.');
    }

    // If the user has chosen to generate a random password, set generateRandom to true in the query string
    const generateRandom = req.query.generateRandom === 'true';

    if (generateRandom) {
      // Generate a random password
      const newPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password in the database and clear the reset token
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Send a notification email to the user about the password change
      const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: user.email,
        subject: "Password Reset Successful",
        text: "Your password has been successfully reset. Your new password is: " + newPassword,
      };

      await transporter.sendMail(mailOptions);

      // Redirect the user to a password reset success page
      return res.sendFile(path.join(__dirname, "./../views/password-reset-success.html"));
    } else {
      // If the user wants to set their own password, provide them with a form or link to set their new password
      // You can implement this as needed for your application.
      // For example, you might create a form where the user can enter their new password.
      // Once the user enters their new password, hash it and update it in the database, then clear the reset token.

      // You can redirect the user to a page where they can set their own password here.
      // Replace the line below with your implementation.
      return res.sendFile(path.join(__dirname, "./../views/set-own-password.html"));
    }
  } catch (error) {
    console.error('Error:', error);
    res.redirect('/user/verified?error=true&message=An error occurred during the password reset process.');
  }
});




module.exports = router;
