require('./config/db'); // allows us access the database 

const app = require('express')(); // creating connection to web 
const port = 3000; // establish port number 

// allows you access the folder in api/user t
const UserRouter = require('./api/User');

// for accepting post form data
const bodyParser = require('express').json; 
app.use(bodyParser()); 


// allows us to use the router we just created
app.use('/user', UserRouter)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

//MONGODB_URI: mongodb+srv://user123:1111@cluster0.jkrqznm.mongodb.net/?retryWrites=true&w=majority

//MONGODB_URI: mongodb+srv://dsking:1234@cluster0.l9nglnu.mongodb.net/?retryWrites=true&w=majority