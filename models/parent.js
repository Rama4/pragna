var mongoose = require("mongoose");
var parentschema = mongoose.Schema(
{
     'user' :   {
        type : mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
    'phone' : String,
    'address' : String,
    'wards' :   [ {
        type : mongoose.Schema.Types.ObjectId,
        ref: "Student"
      }]
});
module.exports = mongoose.model("Parent",parentschema);
