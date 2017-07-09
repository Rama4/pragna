var mongoose = require("mongoose");
var annoschema = mongoose.Schema(
{
     'date' : String,
     'title' : String,
     'message' : String,
     'links' : [String],
      'author' : {
        id : {
            type : mongoose.Schema.Types.ObjectId,
            ref: "User" //same as the 1st param in mongoose.model() used in userschema
          },
         username: String
    }
});
module.exports = mongoose.model("Anno",annoschema);
