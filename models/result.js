var mongoose = require("mongoose");
var resultschema = mongoose.Schema(
{
    'student_name'   : String,
    'ans' : [String],
    'score' : Number,
    'ANS'  : [String],
    'ver' : [String],   // optional
    'date' : Date
});
module.exports = mongoose.model("Result",resultschema);
