const express = require("express");
const {
  postNotes,
  getNotes,
  updateNote,
  removeNotes,
} = require("../controllers/notes");
const notesRouter = express.Router();

notesRouter
  .route("/")
  .get(getNotes)
  .post(postNotes)
  .put(updateNote)
  .delete(removeNotes);

module.exports = notesRouter;
