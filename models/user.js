var mongoose = require("mongoose");
var userschema = mongoose.Schema(
{
    'username' : String,
    'password' : String,
    'email'    : {type:String,unique:true},
    'type'     : String,
    'token'    : String, 
    'expire'   : String
});
module.exports = mongoose.model("User",userschema);
// 