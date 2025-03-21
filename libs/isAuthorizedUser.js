const isAuthorizedUser = (req, res, next) => {
  if (/\.jpg|\.png|\.jpeg/.test(req.url)) {
    next();
  } else {
    const database = req.headers.database;
    if (!database) {
      console.log(req.url);
      next("Access Denied");
    }
    req.query.db = database;
    next();
  }
};

module.exports = { isAuthorizedUser };
