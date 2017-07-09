var mongoose = require("mongoose");
var quizschema = mongoose.Schema(
{
    'name'   : String,
    'negative' : String,
    'type'  : String,
    'duration' : String,
    'correct' : Number,
    'incorrect' : Number,
    'author' : {
        id : {
            type : mongoose.Schema.Types.ObjectId,
            ref: "User" //same as the 1st param in mongoose.model() used in userschema
          },
         username: String
    },
    'questions' :   [ {
        type : mongoose.Schema.Types.ObjectId,
        ref: "Question"
      }],
    'results' :   [ {
        type : mongoose.Schema.Types.ObjectId,
        ref: "Result"
      }],
    'batches' :   [ {
        type : String,
        ref: "Batch"
      }]
});
module.exports = mongoose.model("Quiz",quizschema);
