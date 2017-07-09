var mongoose = require("mongoose");
var imageschema = mongoose.Schema(
{
    'name' : String,
    'path' : String,
     'author' : {
        id : {
            type : mongoose.Schema.Types.ObjectId,
            ref: "User" //same as the 1st param in mongoose.model() used in userschema
          },
         username: String
    },
});
module.exports = mongoose.model("Image",imageschema);
