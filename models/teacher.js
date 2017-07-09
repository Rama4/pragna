var mongoose = require("mongoose");
var teacherschema = mongoose.Schema(
{
     'user' :   {
        type : mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
    'phone' : String,
    'address' : String,
    'handling' : [String] 
});
module.exports = mongoose.model("Teacher",teacherschema);
