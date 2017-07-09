var mongoose = require("mongoose");
var batchschema = mongoose.Schema(
{
     'name' : String,
     'time' : [String],   // class start time
     'duration' : Number, // duration of class, in minutes
     'teachers' : [ {
        type : String,
        ref: "Teacher"
      } ],
     'students' : [ {
        type : String,
        ref: "Student",
        unique : true,
        dropDups: true
      } ],
      'author' : {
        id : {
            type : mongoose.Schema.Types.ObjectId,
            ref: "User" //same as the 1st param in mongoose.model() used in userschema
          },
         username: String
      }
});
module.exports = mongoose.model("Batch",batchschema);
