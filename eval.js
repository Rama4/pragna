var Test = require("./models/test.js");
var Assignment = require("./models/assignment.js");
var Quiz = require("./models/quiz.js");
var Active = require("./models/active.js");



exports.evaluate = function()
{
    var now = new Date();
    Active.find({time:{$lt : now}},function(err,actives)
    {
        if(err)console.log(err);
        else if(!actives||!actives.length)console.log("no pending evaluations!");
        else
        {
            var M = [Assignment,Quiz,Test],E = ["assignment","quiz","test"],db;
            for(var c=0;c<actives.length;c++)
                (function(i)
                {
                    db = M[actives[i].type]||Test;
                    db.findOne({name:actives[i].test},function(err,test)
                    {
                        if(err)console.log(err);
                        else if(!test){console.log("error: "+E[actives[i].type]+" not found");}
                        else
                        {

                        }
                    })
                })(c);
        }
    });

}
