var mongoose = require("mongoose");
var questionschema = mongoose.Schema(
{
    'text'   : String,
    'images' : [String],
    'html'  : String,
    'negative' : String,
    'type'  : String,
    'answer' : [String],
    'hint' : String,
     'author' : {
        id : {
            type : mongoose.Schema.Types.ObjectId,
            ref: "User" //same as the 1st param in mongoose.model() used in userschema
          },
         username: String
    }
});
module.exports = mongoose.model("Question",questionschema);
