var mongoose = require("mongoose");
var numschema = mongoose.Schema(
{
    'val' : Number 
});
module.exports = mongoose.model("number",numschema);
