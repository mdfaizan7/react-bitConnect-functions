const { admin, db } = require("./admin");

// FOR PROTECTED ROUTES
module.exports = (req, res, next) => {
  let IdToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    IdToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  admin
    .auth()
    .verifyIdToken(IdToken)
    .then(decodedToken => {
      req.user = decodedToken;
      console.log(decodedToken);
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
      req.user.handle = data.docs[0].data().handle;
      req.user.imageURL = data.docs[0].data().imageURL;
      return next();
    })
    .catch(err => {
      console.error("Error while verifying token", err);
      return res.satus(403).json({ err });
    });
};
