const multer = require("multer");
const path = require("path");

module.exports = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, "public/");
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const imgName =
        file.originalname.replace(ext, "").replace(" ", "_").toLowerCase() +
        Date.now() +
        ext;
      cb(null, imgName);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!/.jpg|.jpeg|.png/.test(file.mimetype)) {
      cb("file type is not allowed", false);
      return;
    }
    cb(null, true);
  },
});
