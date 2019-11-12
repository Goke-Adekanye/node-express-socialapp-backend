const functions = require('firebase-functions');
const { db } = require('./util/admin');

//initializing express
const express = require('express');
const app = express();

//importing scream and user route
const { getAllScreams, postOneScream, getScream, commentOnScream, commentOnScreamFromUserPage, likeScream, unlikeScream, deleteScream } 
= require('./handlers/screams');
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser,getUserDetails, markNotificationsRead } 
= require('./handlers/users');

//importing FBAuth
const FBAuth = require('./util/FBAuth')

//cors innitializing
const cors = require('cors')
app.use(cors())


//scream route
 app.get('/screams', getAllScreams )
 app.post('/scream', FBAuth, postOneScream)
 app.get('/scream/:screamId', getScream ) //getting one scream(and its associated comments) through the screamId
 app.post('/scream/:screamId/comment', FBAuth, commentOnScream ) //posting comments
 app.post('/user/:handle/scream/:screamId/comment', FBAuth, commentOnScreamFromUserPage ) //posting comments from userPage
 app.get('/scream/:screamId/like', FBAuth, likeScream ) //like scream
 app.get('/scream/:screamId/unlike', FBAuth, unlikeScream ) //unlike scream
 app.delete('/scream/:screamId', FBAuth, deleteScream ) //delete scream

 //user route
 app.post('/signup', signup)
 app.post('/login', login)
 app.post('/user/image', FBAuth, uploadImage)
 app.post('/user', FBAuth, addUserDetails)
 app.get('/user', FBAuth, getAuthenticatedUser)
 app.get('/user/:handle', getUserDetails) //get any user details(profile)
 app.post('/notifications', FBAuth, markNotificationsRead) 



 //https://baseurl.com/api/
 exports.api = functions.region('us-central1').https.onRequest(app);

 //create Notification when scream is liked
 exports.createNotificationOnLike = functions
  .region('us-central1')
  .firestore.document('likes/{id}')
  //create doc-snapshot for created likes (as they are being created in the likes-collection)
  .onCreate((snapshot) => {
    //getting the corresponding scream that was liked from the screams-collection(cos we some data from it)
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
          //check to verify if the liked-scream exist && the likee !== the liker
          //--that is, you dont get notified when you like your own scream
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          //create notifications-collection, giving the notification the likeId
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            screamId: doc.id
          });
        }
      }) 
      .catch((err) => console.error(err));
  });

  //create Notification when scream is commented
 exports.createNotificationOnComment = functions
 .region('us-central1')
 .firestore.document('comments/{id}')
 //create doc-snapshot for created comments (as they are being created in the comments-collection)
 .onCreate((snapshot) => {
   //getting the corresponding scream that was commented from the screams-collection(cos we some data from it)
   return db
     .doc(`/screams/${snapshot.data().screamId}`)
     .get()
     .then((doc) => {
         //check to verify if the commented-scream exist && the commentee !== the commenter
         //--that is, you dont get notified when you comment your own scream
       if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
         //create notifications-collection, giving the notification the commentId
         return db.doc(`/notifications/${snapshot.id}`).set({
           createdAt: new Date().toISOString(),
           recipient: doc.data().userHandle,
           sender: snapshot.data().userHandle,
           type: 'comment',
           read: false,
           screamId: doc.id
         });
       }
     }) 
     //error handler
     .catch((err) => console.error(err));
 });

 //delete Notification when we unlike scream
 exports.deleteNotificationOnUnLike = functions
  .region('us-central1')
  .firestore.document('likes/{id}')
  //onDelete doc-snapshot for created like (in the likes-collection)
  .onDelete((snapshot) => {
    return db
       //delete notification for like as we unlike scream
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      //error handler
      .catch((err) =>  console.error(err));
  });

  //change scream-image whenever user updates screamUrl
  exports.onUserImageChange = functions
  .region('us-central1')
  //accessing the users-document and getting users by userId
  .firestore.document('/users/{userId}')
  //onUpdate listening to the users-collection
  //change: onUpdate-prop that has two doc-snapshot(snapshot b4 the change, snapshot after the change)
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    //check if user make changes to current image(that is, user changes profile-picture)
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log('image has changed');
      //.batch: firebase function use to update multiple documents
      const batch = db.batch();
      //in screams-collection, get all screams where scream-userHandle == handle-of-user-who-changed-userImage
      return db
        .collection('screams')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then((data) => {
          //forEach scream of "change.before.data().handle", batch.update their imageUrl
          data.forEach((doc) => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, { userImage: change.after.data().imageUrl });
          });
          return batch.commit(); 
        });
    } 
    //return if user does not make changes to imageUrl,
    else return true;
  });

  //delete comments, likes and notifications onScreamDelete
  exports.onScreamDelete = functions
  .region('us-central1')
  .firestore.document('/screams/{screamId}')
  //onDelete listening to the creams-collection
  //context: has the parameters we have in the uRL(that is, with context we can access URL parameters)
  .onDelete((snapshot, context) => {
    const screamId = context.params.screamId;
    //.batch: firebase function use to update multiple documents
    const batch = db.batch();
    //accessing the comments-collection, getting associated comments on deleted-scream, delete associated comments
    return db
      .collection('comments')
      .where('screamId', '==', screamId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        
    //accessing the likes-collection, getting associated likes on deleted-scream, delete associated likes
        return db
          .collection('likes')
          .where('screamId', '==', screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        
    //accessing the notifications-collection, getting associated notifications on deleted-scream, delete associated notifications
        return db
          .collection('notifications')
          .where('screamId', '==', screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });
