//function getSreams: access to the database using the admin SDk
const admin = require('firebase-admin');
//to use the admin, we need to initialize the application
admin.initializeApp();

const db = admin.firestore();




module.exports = {admin, db};