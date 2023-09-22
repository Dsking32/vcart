const nodemailer = require('nodemailer');
const crypto = require('crypto');
// Import the dotenv package
require('dotenv').config();
const port = 3000;


//nodemailer transporter
const transporter = nodemailer.createTransport({
    service:"Gmail",
    auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
        clientId: process.env.OAUTH_CLIENTID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN
      },
});

function sendVerificationEmail(email, token, callback) {
  const emailcontent = {
    from: 'vucart.info@gmail.com',
    to: email,
    subject: 'Email Verification',
    text: `Click the following link to verify your email: http://localhost:${port}/verify?token=${token}`,
  };

  transporter.sendMail(emailcontent, (error, info) => {
    if (error) {
      console.error('Email sending failed:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

module.exports = {
  sendVerificationEmail,
};
