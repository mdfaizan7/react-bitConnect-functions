const functions = require("firebase-functions");
const { db } = require("./util/admin");
const app = require("express")();

const FBAuth = require("./util/FBAuth");

const {
  getAllScreams,
  postOneScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream
} = require("./handlers/screams");

const {
  signUp,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead
} = require("./handlers/users");

// SCREAMS ROUTES
app.get("/screams", getAllScreams); // get all screams
app.post("/scream", FBAuth, postOneScream); // post a scream
app.get("/scream/:screamId", getScream); // fetch a scream
app.post("/scream/:screamId/comment", FBAuth, commentOnScream); // comment on a scream + increment the scream count
app.get("/scream/:screamId/like", FBAuth, likeScream); // like a scream
app.get("/scream/:screamId/unlike", FBAuth, unlikeScream); // unlike a scream
app.delete("/scream/:screamId", FBAuth, deleteScream); // delete a scream
// TODOS: DELETE A COMMENT
// TODOS: EDIT A SCREAM
// TODOS: EDIT A COMMENT

// USERS ROUTES
app.post("/signup", signUp); // signup route
app.post("/login", login); // login route
app.post("/user/image", FBAuth, uploadImage); // user image route
app.post("/user", FBAuth, addUserDetails); // user-deatils route
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

// CREATE NOTIFICATION FOR LIKE
exports.createNotificationsOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate(snapshot => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            screamId: doc.id,
            type: "like",
            read: false
          });
        }
      })
      .catch(err => {
        console.error(err);
      });
  });

// CREATE NOTIFICATION FOR COMMENT
exports.createNotificationsOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate(snapshot => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            screamId: doc.id,
            type: "comment",
            read: false
          });
        }
      })
      .catch(err => {
        console.error(err);
        return;
      });
  });

// DELETE NOTIFICATION ON DISLIKE
exports.deleteNotificationOnUnlike = functions.firestore
  .document("likes/{id}")
  .onDelete(snapshot => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .then(() => {
        return;
      })
      .catch(err => {
        console.error(err);
        return;
      });
  });

exports.onUserImageChange = functions.firestore
  .document(`/users/{userId}`)
  .onUpdate(change => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageURL !== change.after.data().imageURL) {
      {
        console.log("imag");
        let batch = db.batch();
        return db
          .collection("screams")
          .where("userHandle", "==", change.before.data().handle)
          .get()
          .then(data => {
            data.forEach(doc => {
              const scream = db.doc(`/screams/${doc.id}`);
              batch.update(scream, {
                imageURL: change.after.data().imageURL
              });
            });
            return batch.commit();
          });
      }
    } else return true;
  });

exports.onScreamDelete = functions.firestore
  .document("/screams/{screamId}")
  .onDelete((snapshot, context) => {
    const screamId = context.params.screamId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("screamId", "==", screamId)
      .get()
      .then(data => {
        data.forEach(doc => batch.delete(db.doc(`/comments/${doc.id}`)));
        return db
          .collection("likes")
          .where("screamId", "==", screamId)
          .get();
      })
      .then(data => {
        data.forEach(doc => batch.delete(db.doc(`/likes/${doc.id}`)));
        return db
          .collection("notifications")
          .where("screamId", "==", screamId)
          .get(); 
      })
      .then(data => {
        data.forEach(doc => batch.delete(db.doc(`/notifications/${doc.id}`)));
        return batch.commit();
      })
      .catch(err => console.error(err));
  });
