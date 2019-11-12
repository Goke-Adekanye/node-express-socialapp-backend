const { admin } = require('./admin');
const { db } = require('./admin');

//FBAuth: function that authenticate that only an authorized logged in user can access access route
module.exports = (req, res, next) => {
    let idToken;
    //checking if req has a header-authorization(consisting of the bearer-Token)
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        //assigning idToken to the second-value(token) of req.headers.authorization using java-function-split
        idToken = req.headers.authorization.split('Bearer ')[1];
    }
    else {
        //error-handler: if token not-found 
        console.error('no token found');
        return res.status(403).json({error: 'unauthorized'})
    }

    //verifying if token-found is issued by our application
    admin.auth().verifyIdToken(idToken)
    //decodedToken: holds data present in the token, which is the user data
    .then(decodedToken => {
        //assigning the user-data in the decodedToken(that is,token) to the req.user
        //--this is done so that wherever the req-object is being used, it has access to other-datas from the Token
        req.user = decodedToken;
        console.log(decodedToken);

        //getting the handle from database-collection-users, since the handle is not found in firebase-authentication system
        //db.collection: database request from collection-users
        return db.collection('users')
        //where userid === the current req.user.uid
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();
        
    })
    //promise that return the data-docs-array(a one-array returning the selected user-handle)
    .then((data) => {
        //assigning the selected user-handle to the req.user.handle object
       req.user.handle = data.docs[0].data().handle,
       req.user.imageUrl = data.docs[0].data().imageUrl;
       return next();
     })
     .catch((err) => {
       console.error('Error while verifying token ', err);
       return res.status(403).json(err);
     });
}
