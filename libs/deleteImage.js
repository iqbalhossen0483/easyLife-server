const fs = require("fs");

async function deleteImage(fileName) {
  try {
    if (fileName) fs.unlinkSync("public/" + fileName);
  } catch (error) {
    console.log(error);
  }
}

module.exports = { deleteImage };
