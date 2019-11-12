const { admin, db } = require('../util/admin');

//importing firebaseConfig
const firebaseConfig = require('../util/firebaseConfig');
//initializing firebase
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

//validators
const { validateSignupdata, validateLogindata, reduceUserDetails } = require('../util/validators')




//signup route
exports.signup = (req, res) => {
    const newUser = {
            email: req.body.email,
            password: req.body.password,
            confirmPassword: req.body.confirmPassword,
            handle: req.body.handle

    }

    //TODO: validate data 1 (check if signup-inputs are valid)
   const {valid, errors} = validateSignupdata(newUser)
   if (!valid) return res.status(400).json(errors)

   //giving the default image to newly registered user
   const noImg = 'no-img.png'


    //TODO: validate data 2(check if handle exist inside database)
    let userId, token;
    //db.doc..: get handle of the submitted-user
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        //return error if doc(that is, handle) exist
        if(doc.exists) {
            return res.status(400).json({handle: 'this handle is already taken'})
        }
        else {
            //else create account for user
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
        }
    })
    //get Id Token
    .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken()
    })
   
    .then(idToken => {
       token = idToken;
       //creating user Credential to be uploaded to the user-database
       const userCredentials = {
           handle: newUser.handle,
           email: newUser.email,
           createdAt: new Date().toISOString(),
           imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
           userId
       }
       //upload newUser credentials into the users-database taking the newUser-handle as the id
       return db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    .then(() => {
        //post IdToken upon account creation
       return res.status(201).json({ token })
    })
    //Error handler
    .catch(err => {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
           return res.status(400).json({email: 'Email already in use'})
        }
        else {
        return res.status(500).json({ general: 'Something went wrong, pls try again' })
        }
    })
}

//login route
exports.login = (req, res) => {
    //declaring login requirements
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    //TODO: validate data (check if login-inputs are valid)
   const {valid, errors} = validateLogindata(user)
   if (!valid) return res.status(400).json(errors)

    //else if there is no error
    //Authenticate user login
   firebase.auth().signInWithEmailAndPassword(user.email, user.password)
   .then((data) => {
     return data.user.getIdToken();
   })
   .then((token) => {
       //post IdToken upon account login
     return res.json({ token });
   })
   //Error handler
   .catch(err => {
       console.error(err);
     //auth/wrong-password
     if (err.code === 'auth/wrong-password') {
     return res.status(403).json({ general: 'Wrong credentials, please try again' });
     }
     else return res.status(500).json({error: err.code})
   })
}

//Add user details
exports.addUserDetails = (req, res) => {
  //assigning the validated-userDetails to new userDetails
  let userDetails = reduceUserDetails(req.body);
  //access users-db-collection/req.user.handle
  db.doc(`/users/${req.user.handle}`)
  //update the req.user.handle-details with data from userDetails
  .update(userDetails)
  .then(() => {
    return res.json({ message: 'Details added successfully' });
  })
  //error handler
  .catch((err) => {
    console.error(err);
    return res.status(500).json({ error: err.code });
  });

}

// Get any user's details
exports.getUserDetails = (req, res) => {
  //initializing userData as an empty object
  let userData = {};
  //access users-db-collection and get req.params.handle(that is, the handle of user we wish to get its details)
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then((doc) => {
      //if doc.exists, assign user-details to userData.user 
      if (doc.exists) {
        userData.user = doc.data();
        //accessing the screams-collection and getting screams posted by the user whose details is to be retrieved
        return db
          .collection('screams')
          .where('userHandle', '==', req.params.handle)
          .orderBy('createdAt', 'desc')
          .get();
      }
      else {
        return res.status(404).json({ errror: 'User not found' });
      }
    })
    //display req.params.handle's screams-props
    .then((data) => {
      userData.screams = [];
      data.forEach((doc) => {
        userData.screams.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          screamId: doc.id
        });
      });
      //return all userData-contents(that is, display req.params.handle's details + screams)
      return res.json(userData);
    })
    //error handlers
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Get own-user detail
exports.getAuthenticatedUser = (req, res) => {
  //declaring as empty object the user-data to be gotten from the database
  let userData = {};
  //accessing the users-collection and getting the actual user by its handle
  db.doc(`/users/${req.user.handle}`).get()
  .then((doc) => {
      if (doc.exists) {
        //No 1: if user-exist, assign its data to userData.credentials
        userData.credentials = doc.data();
        //No 2: getting the likes-collection for poster of scream
        return db.collection('likes').where('userHandle', '==', req.user.handle).get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      //No 3: getting the notification-collection for poster of scream
      return db
      .collection('notifications')
      .where('recipient', '==', req.user.handle)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
  })
  .then((data) => {
    userData.notifications = [];
    //forEach notification, push notification-props into userData.notifications
    data.forEach((doc) => {
      userData.notifications.push({
        recipient: doc.data().recipient,
        sender: doc.data().sender,
        createdAt: doc.data().createdAt,
        screamId: doc.data().screamId,
        type: doc.data().type,
        read: doc.data().read,
        notificationId: doc.id
      });
    })
      //return all userData-contents when we get own-user details(profile page)
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
}

// Upload a profile image for user
exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
  
    const busboy = new BusBoy({ headers: req.headers });
  
    let imageToBeUploaded = {};
    let imageFileName;
  
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(fieldname, file, filename, encoding, mimetype);
      //returning error response if file uploaded is of unsupported format
      if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
        return res.status(400).json({ error: 'Wrong file type submitted' });
      }
      //getting the extension of the image file
      //splitting the string of image-filename by dot, for exammple - my.image.png => ['my', 'image', 'png'] and accessing the last string, that is, the fileExtension
      const imageExtension = filename.split('.')[filename.split('.').length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(Math.random() * 1000000000000 ).toString()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      //file-system library that actually creates the file
      file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', () => {
        //uploading the newly created file
      admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype
            }
          }
        })
        //the above upload-function returns a promise 
        .then(() => {
            //constructing the imageUrl to be added to the user
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
          //adding the imageUrl to the user-doc, that is, updating the user-doc with the imageUrl-field
          return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
          return res.json({ message: 'image uploaded successfully' });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: 'something went wrong' });
        });
    });
    busboy.end(req.rawBody);
  };

  //Mark Notifications as read
  exports.markNotificationsRead = (req, res) => {
    //.batch: firebase function use to update multiple documents
    let batch = db.batch();
    //forEach notifications, update its read-state from false to true
    req.body.forEach((notificationId) => {
      const notification = db.doc(`/notifications/${notificationId}`);
      batch.update(notification, { read: true });
    });
    batch.commit()
      .then(() => {
        return res.json({ message: 'Notifications marked read' });
      })
      //error handler
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };