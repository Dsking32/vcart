const mongoose = require('mongoose'); // importing the mongoose module
const Schema = mongoose.Schema; // allows you access the schematic on how the db should look like

// defines what and how data should be saved in the database
const UserVerificationSchema = new Schema({
    userId: String,
    uniqueString: String,
    createdAt: Date,
    expiresAt: Date,
});

// storing the db in the User
const UserVerification = mongoose.model('UserVerification', UserVerificationSchema)

// this module allows you exports the db 
module.exports  = UserVerification;