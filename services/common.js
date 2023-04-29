const fs = require("fs");

async function deleteImage(fileName) {
  try {
    fs.unlinkSync("public/" + fileName);
  } catch (error) {
    console.log(error);
    throw error;
  }
}
module.exports = { deleteImage };
