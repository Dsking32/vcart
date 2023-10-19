const mongoose = require('mongoose'); // importing the mongoose module
const Schema = mongoose.Schema; // allows you access the schematic on how the db should look like

// defines what and how data should be saved in the database
const UserSchema = new Schema({
    name: String,
    email: String,
    dateOfBirth: Date,
    phoneNumber: String,
    password: String,
    confirmPassword: String,
    verified: Boolean


});

// storing the db in the User
const User = mongoose.model('User', UserSchema)

// this module allows you exports the db 
module.exports  = User;