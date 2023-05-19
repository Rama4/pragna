//NPM package modules
//==========================
var exp = require("express");
var app = exp();
var mongoose = require("mongoose");
var bp = require("body-parser");
var flash = require("connect-flash");
var methodoverride = require("method-override");
var sessions = require("client-sessions");
var bcrypt = require('bcryptjs');
var csrf = require('csurf');
//models
var User = require("./models/user");
//exported Routes    
var indexroutes = require("./routes/index");
var questionroutes = require("./routes/question");
var testroutes = require("./routes/test");
var quizroutes = require("./routes/quiz");
var assroutes = require("./routes/assignment");
var anoroutes = require("./routes/anno");
var imageroutes = require("./routes/image");
var batchroutes = require("./routes/batch");
var eval = require("./eval.js");
//============================================================

//Add mongoose and connect our DB
// environment variable for database url (safety purpose : to prevent users from deleting others' data )
var url = process.env.DATABASEURL || 'mongodb://127.0.0.1/pragnadb';
// the following line is because mpromise is deprecated
mongoose.Promise = global.Promise;
mongoose.connect(url);
console.log(url);

//Express Settings
//============================================================
app.use(bp.urlencoded({extended:true}));

//serve contents of the home page
app.set("view engine","ejs");
app.use(exp.static('public'));
app.use(methodoverride("_method"));   // new
app.use(flash());

app.use(sessions({
  cookieName: 'session', // cookie name dictates the key name added to the request object 
  secret: 'kjabefiljabsvibrsvibszdviljbdsifbvidzbvlzjnvkizh', // should be a large unguessable string 
  duration: 5 * 60 * 60 * 1000, // how long the session will stay valid in ms 
  activeDuration: 10 * 60 * 1000 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds 
}));

app.use(csrf()); // must be declared after sessions, otherwise "misconfigured csrf" error


const port = process.env.PORT || 5000;
const ip = process.env.IP || 'localhost';
const domain = `http://${ip}:${port}`;
const client_domain = `http://${ip}:3000`;

// allow cors from client
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", `${client_domain}`); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

//============================================================

//Middleware Settings
//============================================================
//  global variables
app.use(function(req , res , next)
{
  res.locals.currentuser = req.user;
  res.locals.errorArr = req.flash("errorArr");
  res.locals.successArr = req.flash("successArr");
  if(req.session && req.session.user)
        User.findOne({'email':req.session.user.email},function(err,user)
        {
            if(user)
            {
                req.user = user;
                delete req.user.password;
                req.session.user = user;
                res.locals.currentuser = user;
            }
            next();
        });
    else
        next();
});
//============================================================

//Use imports from routes folder
//============================================================
//with this we don't need to append /campgrounds into following paths i.e /campgrounds/new or /campgrounds/:id
//app.use("/campgrounds/:id/comments",commentroutes);
app.use("/image",imageroutes);
app.use("/test",testroutes);
app.use("/quiz",quizroutes);
app.use("/assignment",assroutes);
app.use("/question",questionroutes);
app.use("/announcement",anoroutes);
app.use("/batch",batchroutes);
app.use("/",indexroutes);

//============================================================

app.listen(port,ip,function()
{
    console.log("server started! evaluating any test, quiz or assignment results...");
    console.log(`server running at: ${domain}`);
    eval.evaluate(); 

});
module.exports = app;
