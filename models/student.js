var mongoose = require("mongoose");
var User = require("../models/user");
var studentschema = mongoose.Schema(
{
     'user' :   {
        type : mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
    'class' : String,
    'school' : String,
    'phone' : String,
    'parentphone' : String,
    'parentemail' : String,
    'address' : String,
    'batches' : [ {
        type : String,
        ref: "Batch"
      }],
    'tests' :  [ {
        type : mongoose.Schema.Types.ObjectId,
        ref: "Test"
      } ],
    'assignments' :  [ {
        type : mongoose.Schema.Types.ObjectId,
        ref: "Assignment"
      } ],
    'quizzes' :  [ {
        type : mongoose.Schema.Types.ObjectId,
        ref: "Quiz"
      } ]
});
// this function searches the username of user in students collection
studentschema.statics.findusername = function (username, callback) {
  var query = this.findOne()

  User.findOne({'username': username}, function (err, user) {
    if(err||!user)return null;
    else
    query.where(
      {user: user._id}
    ).exec(callback);
  })
  return query
}

module.exports = mongoose.model("Student",studentschema);
