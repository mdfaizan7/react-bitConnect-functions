var admin = require("firebase-admin");

var serviceAccount = require("../ServiceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bitconnect-b7b67.firebaseio.com",
  storageBucket: "bitconnect-b7b67.appspot.com"
});

// admin.initializeApp();

const db = admin.firestore();

module.exports = { admin, db };
