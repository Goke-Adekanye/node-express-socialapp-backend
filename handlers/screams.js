const { db } = require('../util/admin');


 //getting screams from database
exports.getAllScreams = (req, res) => {
    db
    .collection('screams')
    //order by which screams is shown
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
        let screams = []
        data.forEach(doc => {
            screams.push({
                //format to get data from API
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt,
                userImage: doc.data().userImage,

            })
        })
        return res.json(screams)
    })
    .catch((err) => console.log(err))

 };

 //posting a scream to database
 exports.postOneScream = (req, res) => {
    //displaying error message if scream-body is empty 
    if (req.body.body.trim() === '') {return res.status(400).json({body: 'body must not be empty'})}
   newScream = {
       body: req.body.body,
       userHandle: req.user.handle,
       userImage: req.user.imageUrl,
       createdAt: new Date().toISOString(),
       likeCount: 0,
       commentCount: 0
   }    

   db
   .collection('screams')
   .add(newScream)
   .then(doc => {
    const resScream = newScream;
    resScream.screamId = doc.id;
    res.json(resScream);
   })
   .catch((err) => {
       res.status(500).json({error: 'something went wrong'})
       console.error(err);
   })
}

// Fetch one scream(with its associated comments)
exports.getScream = (req, res) => {
    let screamData = {};
    //accessing the screams-collection and getting scream according to its Id-params
    db.doc(`/screams/${req.params.screamId}`).get()
      //getting doc snapshot
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Scream not found' });
        }
        //assigning scream-doc-data to screamData
        screamData = doc.data();
        screamData.screamId = doc.id;
        //accessing the commments-collection, where screamId-commented-on === scream(req.params.screamId)
        return db
          .collection('comments')
          //order by which comments appear
          .orderBy('createdAt', 'desc')
          .where('screamId', '==', req.params.screamId)
          .get();
      })
      //getting doc snapshot
      .then((data) => {
        screamData.comments = [];
        //for each snapshot, push comment into screamData.comments
        data.forEach((doc) => {
          screamData.comments.push(doc.data());
        });

        //return screamData(scream with comment(s))
        return res.json(screamData);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };

  //comment on a scream
  exports.commentOnScream = (req, res) => {
    //error check for Empty comment-section
    if (req.body.body.trim() === '') return res.status(404).json({comment: 'Must not be empty'})
  
    const newComment = {
      body: req.body.body,
      createdAt: new Date().toISOString(),
      screamId: req.params.screamId,
      userHandle: req.user.handle,
      userImage: req.user.imageUrl
    }
    console.log(newComment);
    //accessing the screams-collection and getting scream according to its Id-params
    db.doc(`/screams/${req.params.screamId}`)
    .get()
    //getting doc snapshot
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Scream not found' });
      }
      //else if doc-exist, update scream-commentCount +1 (since we are adding a newComment to the scream)
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    // add newComment to db-comment-collection
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    //return newComment(since we need it in the user-interface)
    .then(() => {
      res.json(newComment);
    })
    //error handler
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong' });
    });
    
  }

  //comment on a scream from userPage
  exports.commentOnScreamFromUserPage = (req, res) => {
    //error check for Empty comment-section
    if (req.body.body.trim() === '') return res.status(404).json({comment: 'Must not be empty'})
  
    const newComment = {
      body: req.body.body,
      createdAt: new Date().toISOString(),
      screamId: req.params.screamId,
      userHandle: req.user.handle,
      userImage: req.user.imageUrl
    }
    console.log(newComment);
    //accessing the screams-collection and getting scream according to its Id-params
    db.doc(`/screams/${req.params.screamId}`)
    .get()
    //getting doc snapshot
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Scream not found' });
      }
      //else if doc-exist, update scream-commentCount +1 (since we are adding a newComment to the scream)
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    // add newComment to db-comment-collection
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    //return newComment(since we need it in the user-interface)
    .then(() => {
      res.json(newComment);
    })
    //error handler
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong' });
    });
    
  }

// Like a scream
exports.likeScream = (req, res) => {
  //assigning likes-collection-with-queries to likeDocument
  const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);

  //assigning screams-collection to screamDocument
  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  //innitializing screamData-object
  let screamData;

  screamDocument
    .get()
    //getting scream-doc snapshot
    .then((doc) => {
      //if scream exist in screamDocument
      if (doc.exists) {
        //assign scream-properties to screamData + get the associating-likeDocument for the req-scream
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        //error handler if !scream.exist
        return res.status(404).json({ error: 'Scream not found' });
      }
    })
    //checking likes-collection-query to confirm if req.user.handle has not like scream, else add req.user.handle
    .then((data) => {
      //if query-isEmpty
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            screamId: req.params.screamId,
            userHandle: req.user.handle
          })
          //increment likeCount && update likeCount-prop of scream in db-screams-collection
          .then(() => {
            screamData.likeCount++;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            //return all changes to screamData(that is, new doc.data )
            return res.json(screamData);
          });
      } else {
        return res.status(400).json({ error: 'Scream already liked' });
      }
    })
    //error handler
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//unlike a scream
exports.unlikeScream = (req, res) => {
  //assigning likes-collection-with-queries to likeDocument
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);
  //assigning screams-collection to screamDocument
  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  //innitializing screamData-object
  let screamData;

  screamDocument
    .get()
    //getting scream-doc snapshot
    .then((doc) => {
      //if scream does exist in screamDocument
      if (doc.exists) {
        //assign scream-properties to screamData + get the associating-likeDocument for the req-scream
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        //error handler if !scream.exist
        return res.status(404).json({ error: 'Scream not found' });
      }
    })
    //checking likes-collection-query to confirm if req.user.handle has not like scream, else add req.user.handle
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'Scream not liked' });
      } else {
        //since req.user.handle have liked the scream, we need to delete that entry
        //--((`/likes/${data.docs[0].id}`): actual path of that document) from the db-like-collection
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
           //decrement likeCount && update likeCount-prop of scream in db-screams-collection
          .then(() => {
            screamData.likeCount--;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          //return all changes to screamData(that is, new doc.data )
          .then(() => {
            res.json(screamData);
          });
      }
    })
    //error handlers
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Delete a scream
exports.deleteScream = (req, res) => {
  //assigning screams-collection to document
  const document = db.doc(`/screams/${req.params.screamId}`);
  document
    .get()
    .then((doc) => {
      //if scream does exist in screamDocument
      if (!doc.exists) {
        return res.status(404).json({ error: 'Scream not found' });
      }
      //check to authorize deleteScream only for the person who posted the scream
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: 'Unauthorized' });
      } else {
        //delete scream with the particular req.params.screamId
        return document.delete();
      }
    })
    //sucess responce
    .then(() => {
      res.json({ message: 'Scream deleted successfully' });
    })
    //error handlers
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};