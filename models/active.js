var mongoose = require("mongoose");
var aschema = mongoose.Schema(
{
    name : String,  // user name
    time : Date,      // for quiz, this time = deadline
    test : String,    // test name
    ans : [String],    // saved answers
    type : Number, // type of test(assignment,quiz or test)
    over : Boolean
});
module.exports = mongoose.model("Active",aschema);
