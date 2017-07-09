var express = require("express");
var router = express.Router({mergeParams : true});
var midw = require("../middleware/index.js");
var bp = require('body-parser');
var mongoose = require("mongoose");
var sessions = require("client-sessions");
var bcrypt = require('bcryptjs');
var csrf = require('csurf');
var fs  = require('fs');
var async = require('async');
var crypto = require('crypto');

var Anno = require('../models/anno');
var User = require('../models/user');
var Image = require('../models/image');
var Student = require('../models/student');
var Teacher = require('../models/teacher');
var Parent = require('../models/parent');
var midw = require('../middleware/index');

// Require the module and set default options  
// You may use almost any option available in nodemailer,  
// but if you need fine tuning I'd recommend to consider using nodemailer directly. 
var send = require('gmail-send')({
  user: 'rama41296@gmail.com',               // Your GMail account used to send emails 
  pass: process.env.GMAIL_PASS,             // Application-specific password 
  to:   'rnarasimhan4@gmail.com',               // Send back to yourself;  
                                        // you also may set array of recipients:  
                                        // [ 'user1@gmail.com', 'user2@gmail.com' ] 
  // from:   '"User" <user@gmail.com>'  // from: by default equals to user 
  // replyTo:'user@gmail.com'           // replyTo: by default undefined 
  subject: 'Hello',
  text:    'Hello World!'
  // html:    '<b>html text text</b>' 
});

//-------------------------------------------------------------------------------------
function dfs(dir, done)
{
    var results;
    fs.readdir(dir, function(err, list)
    {
        results  = new Array(list.length);
        if (err) return done(err);
        var i = 0;
        (function next()
        {
            var file= list[i],ff;
            if (!file)
                return done(null, results); 
            results[i] = file;
            ff = dir + '/' + file;
            fs.stat(ff, function(err, stat)
            {                
                if (stat && stat.isDirectory())
                {
                    results[i] = new Array(2);
                    results[i][0] = file;
                    results[i][1] = new Array();
                    dfs(ff, function(err, res)
                    {
                        results[i][1] = res;
                        ++i;
                        next();
                    });
                }
                else
                { 
                    ++i;
                    next();
                }
            });
        })();
    });
}

function gen_token(done)
{
    crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
    });
}

function set_expiry(token, done)
{
    User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
            req.flash('errorArr', 'No account with that email address exists.');
            return res.redirect('/');
        }

        user.token = token;
        user.expire = Date.now() + 48*60*60*1000; // 2 days
        user.save(function(err) { done(err, token, user); });
    });
}

function remove_user_data(user,callback)
{
    /*
    remove authored tests,quizzes,assignments
    remove user object

    */
    var code = 200;
    callback(code);

}
//------------------------------------------------------------------------------------
var foo  = function(id,req,res)
{
    switch(id)
    {
        case 'about': { // about
            res.render('about');
            break;
                }
        case 'register' : {// register route
            res.render('auth/register',{csrfToken : req.csrfToken()});
            break;
            }
        case 'login' : { // login
            res.render("auth/login",{csrfToken : req.csrfToken()});
            break;
        }
        case 'forgot' : {
            res.render("auth/forgot");
            break;
        }
        case 'settings' : { // login
            res.render("auth/settings",{csrfToken : req.csrfToken()});
            break;
        }
                
        default : {
            res.send('404 page not found!');
        }   
    }    
};

router.get("/",function(req,res)
{
    Anno.find({},function(err,an)
    {
        res.render("landing",{an:an});
    });
    
});

router.get("/verify",midw.loginOnly,function(req,res)
{
    if(req.user.token === 'done')
    {
        req.flash("errorArr",'you have already verified!');
        res.redirect('back');
    }
    else
        res.render('verify',{csrfToken : req.csrfToken()});
});

router.get('/verify/:token', function(req, res) 
{   
    User.findOne({ token: req.params.token, expire: { $gt: Date.now() } }, function(err, user)
    {
        if (!user) {
            req.flash('errorArr', 'verification token is invalid or has expired.');
            return res.redirect('back');
        }
        user.token = 'done';
        user.expire = undefined;
        user.save(function(err)
        {
            console.log("sending verified email");
            send({                         
                subject: 'Pragna IITJEE coaching account verified',   // Override value set as default
                html: '<p>You have successfully verified your Pragna IITJEE account: '+user.username+'</p>'+
                        '<p>If you did not do this, please contact us.</p>',
                to: user.email                  
                }, function (err,result) {
                    console.log('mail send(): err:', err, '; res:', result);
                    req.flash('successArr', 'Your Account has been verified successfully');
                    return res.redirect("/");        
                });
            
        });
    });
});

router.get("/profile/:id",midw.requireLogin,function(req,res)
{
    User.findOne({username:req.params.id},function(err,user)
    {
        //console.log(user);
        if(err|| !user)
            res.send("User Not Found!");
        else
            {
                switch(user.type)
                {
                    case "student" : {
                        // find student and populate test,assignment and quiz results
                        // we only need that particular student's results, not anyone else
                        Student.findOne({'user':user}).populate("user").populate({
                            path: 'tests',
                            populate : {
                                            path : 'results',
                                            // return results that match current student name
                                            match: { student_name: user.username},
                                            model : 'Result'
                                    }
                        }).populate({
                            path: 'quizzes',
                            populate : {
                                            path : 'results',
                                            // return results that match current student name
                                            match: { student_name: user.username},
                                            model : 'Result'
                                    }
                        }).populate({
                            path: 'assignments',
                            populate : {
                                            path : 'results',
                                            // return results that match current student name
                                            match: { student_name: user.username},
                                            model : 'Result'
                                    }
                        }).exec(function(err,stud)
                        {
                            if(err)console.log(err);
                            else
                            {
                                //res.json(stud);
                                res.render("student",{stud:stud,csrfToken : req.csrfToken()});
                            }
                        });
                        break; }
                    case "teacher" : {
                        Teacher.findOne({'user':user}).populate("user").exec(function(err,teacher)
                        {
                            if(err)console.log(err);
                            else  res.render("teacher",{teacher:teacher,csrfToken : req.csrfToken()});
                        });
                        break; }
                    case "parent" : {
                        Parent.findOne({'user':user}) .populate({
                            path: 'wards',
                            populate : {
                                            path : 'user',
                                            model : 'User'
                                    }
                        }).populate("user").exec(function(err,par)
                        {
                            if(err)console.log(err);
                            else
                            Student.find({}).populate("user").exec(function(err,studs)
                            {
                                if(err)console.log(err);
                                else  res.render("parent",{par:par,studs:studs,csrfToken : req.csrfToken()});
                            });
                        });
                        break; }
                }
            }
    });
});

router.get("/logout",function(req,res)
{
    req.session.reset();
    req.flash("successArr","You Are Logged Out Now!")
    res.redirect('/');
});

// CHANGE PASSWORD
router.get("/change-password", midw.loginOnly ,function(req,res)
{
  res.render('change-password',{csrfToken : req.csrfToken()});
});

// FORGOT PASSWORD
router.get("/forgot",function(req,res)
{
 res.render("forgot",{csrfToken : req.csrfToken()});
});
// RESET PASSWORD
router.get('/reset/:token', function(req, res) {
  User.findOne({ token: req.params.token, expire: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('errorArr', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {
      user: req.user,
      token : req.params.token,
      csrfToken : req.csrfToken()
    });
  });
});

router.get('/file',midw.teacher,function(req,res)
{
    var path =__dirname + '/../public/files/';
    dfs(path,function(err,results)
    {
        //res.send(results);
        res.render('file',{F:results,csrfToken : req.csrfToken()});
    });
});

router.get('/profiles',midw.requireLogin,function(req,res)
{
    Teacher.find({}).populate("user").exec(function(err,teachs)
    {
        Student.find({}).populate("user").exec(function(err,studs)
        {
            Parent.find({}).populate("user").exec(function(err,pars)
            {
                console.log(pars);
                res.render("profiles",{teachs:teachs,studs:studs,pars:pars});
            });
        });
    });
});

// about route
router.get("/:id",function(req,res)
{
    foo(req.params.id,req,res);
});

router.post("/edit/:id",midw.requireLogin,function(req,res)
{
    User.findOne({"username":req.params.id},function(err,user)
    {
        if(err)res.send("user does not exist!");
        else
        switch(user.type)
        {
            case "student" : {
                Student.findOneAndUpdate({'user':user},req.body,function(err,stud)
                {
                    if(err)console.log(err);
                    else  res.redirect("/profile/"+req.params.id);
                });
                break; }
            case "teacher" : {
                Teacher.findOneAndUpdate({'user':user},req.body,function(err,stud)
                {
                    if(err)console.log(err);
                    else  res.redirect("/profile/"+req.params.id);
                });
                break; }
            case "parent" : {
                Parent.findOneAndUpdate({'user':user},req.body,function(err,stud)
                {
                    if(err)console.log(err);
                    else  res.redirect("/profile/"+req.params.id);
                });
                break; }
        }
    });
});

router.post("/register",function(req,res)
{
    // register
    async.waterfall([
    function(done){
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) 
        {    // Store hash in your password DB. 
            var ss = {
                'username' : req.body.username,
                'email' : req.body.email,
                'password' : hash,
                'type' : req.body.type
            };          
            User.create(ss,function(err,user)
            {
                if(err)
                {
                    if(err.code === 11000)  // duplicate item
                        req.flash("errorArr","Username or email already taken!");
                    else
                        req.flash("errorArr",err.message);
                    return res.redirect('/register');
                }
                else
                {
                    console.log('registered successfully');
                    // create a new teacher/student/parent
                    switch(req.body.type)
                    {
                        case "student" : {
                            Student.create({'user':user},function(err,stud)
                            {
                                if(err)console.log(err);
                                else    done(err);
                            });
                            break; }
                        case "teacher" : {
                            Teacher.create({'user':user},function(err,stud)
                            {
                                if(err)console.log(err);
                                else    done(err);
                            });
                            break; }
                        case "parent" : {
                            Parent.create({'user':user},function(err,stud)
                            {
                                if(err)console.log(err);
                                else    done(err);
                            });
                            break; }
                    }
                }
            });
        });
    });
    },
    function(done) {
        console.log("generating token");
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
        console.log("token generated");
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('errorArr', 'No account with that email address exists.');
          return res.redirect('/');
        }

        user.token = token;
        user.expire = Date.now() + (48*60*60*1000); // 2 days
        user.save(function(err) { done(err, token, user); });
        
      });
    },
    function(token, user, done) 
    {
        console.log("user saved");
        send({                         
        subject: 'verification of Pragna IITJEE coaching account',   // Override value set as default
        html: '<p>You are receiving this because you (or someone else) have registered in our Pragna IITJEE website.</p>'+
      			'<p>Please click on the following link to verify your user account:</p>'+
      					'<a href="http://'+req.headers.host+'/verify/'+token+'">Click to verify</a><br>'+
      					'<p>If you did not request this, please ignore this email.</p>',
        to: user.email                  
        }, function (err,res) {
            console.log('mail send(): err:', err, '; res:', res);
            
        });
        req.flash('successArr', 'An e-mail has been sent to ' + user.email + ' with verification link.');
        res.redirect('/');  
    }
  ], function(err) {
   // if (err) return next(err);
  });


});

router.post('/verify', function(req, res, next) {
  async.waterfall([
    gen_token,
    set,
    function(token, user, done) 
    {
     send({                         
        subject: 'verification of Pragna IITJEE coaching account',   // Override value set as default
        html: '<p>You are receiving this because you (or someone else) have registered in our Pragna IITJEE website.</p>'+
      			'<p>Please click on the following link to verify your user account:</p>'+
      					'<a href="http://'+req.headers.host+'/verify/'+token+'">Click to verify</a><br>'+
      					'<p>If you did not request this, please ignore this email.</p>',
        to: user.email                  
        }, function (err,res) {
            console.log('mail send(): err:', err, '; res:', res);
            
        });
        req.flash('successArr', 'An e-mail has been sent to ' + user.email + ' with verification link.');
        res.redirect('/');  
    }
  ], function(err) {
    if (err) return next(err);
  });
});


router.post('/forgot', function(req, res, next) {
  async.waterfall([
    gen_token,
    set_expiry,
    function(token, user, done) 
    {
     send({                         
        subject: 'Reset password for Pragna IITJEE coaching account',   // Override value set as default
        html: '<p>You are receiving this because you have forgotten your password for your Pragna IITJEE account.</p>'+
      			'<p>Please click on the following link to reset password:</p>'+
      					'<a href="http://'+req.headers.host+'/reset/'+token+'">Click to reset</a><br>'+
      					'<p>If you did not request this, please ignore this email.</p>',
        to: user.email                  
        }, function (err,res) {
            console.log('mail send(): err:', err, '; res:', res);
            
        });
        req.flash('successArr', 'An e-mail has been sent to ' + user.email + ' with verification link.');
        res.redirect('/');  
    }
  ], function(err) {
    if (err) return next(err);
  });
});

router.post('/reset/:token', function(req, res) 
{
  async.waterfall([
    function(done) {
      User.findOne({ token: req.params.token, expire: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('errorArr', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password  == req.body.confirm)
        { // if both passwords match, then store new password, else redirect
            var salt = bcrypt.genSaltSync(10);
            user.password = bcrypt.hashSync(req.body.password,salt);
            user.token="done";
            user.save();
            req.flash("successArr","Password Changed Successfully!");
            res.redirect("/");
        }
        else
        { 
          req.flash("errorArr","Password was not changed because they did not match");
          res.redirect('/');  
        }
      });
    },
    function(user, done) 
    {
        send({                         
        subject: 'Password reset for Pragna IITJEE coaching account',   // Override value set as default
        html: '<p>You are receiving this because you (or someone else) have Reset the password of your Pragna IITJEE website.</p>'+
      			'<p>If you did not request this, please contact us.</p>',
        to: user.email                  
        }, function (err,res) {
            console.log('mail send(): err:', err, '; res:', res);
            
        });
        req.flash('successArr', 'An e-mail has been sent to ' + user.email + ' with password reset link.');
        res.redirect('/');                 
    }
  ], function(err) {
  });
});

router.post("/login",function(req,res)
{      
    // login
    User.findOne({'email' : req.body.email},function(err,user)
    {
        if(!user)
        {
            console.log('user does not exist');
            req.flash("errorArr","user does not exist!");
            res.redirect("/login");
        }
        else
        {
            bcrypt.compare(req.body.password, user.password, function(err,ya)
            {
                if(ya === true)
                {
                    req.session.user = user;
                    console.log('login success');
                    req.flash("successArr","Hi "+user.username+"!");
                    res.redirect('/');
                }
                else
                {
                    req.flash("errorArr","wrong password!");
                    res.redirect("/login");
                }
            });
        }
    });
});

router.post("/change-password",function(req,res)
{
       User.findById(req.user._id).exec(function(err,user)
        {
            if(err)
            {   req.flash("errorArr",err.message);  res.redirect("/");    }
            else if(!user)
            {   req.flash("errorArr","User not found");  res.redirect("/");    }
            else
            {
            if(req.body.password  == req.body.confirm)
                { // if both passwords match, then store new password, else redirect
                    var salt = bcrypt.genSaltSync(10);
                    user.password = bcrypt.hashSync(req.body.password,salt);
                    user.token="done";
                    user.save();
                    send({                         
                        subject: 'Password changed',   // Override value set as default
                        html: '<p>You have successfully changed your password for Pragna IITJEE account.</p>'+
                                '<p>If you did not do this, please contact us.</p>',
                        to: user.email                  
                        }, function (err,res) {
                            console.log('mail send(): err:', err, '; res:', res);
                            
                        });
                    req.flash("successArr","Password Changed Successfully!");
                    res.redirect("/");         
                }
                else
                { 
                    req.flash("errorArr","Password was not changed because they did not match");
                    return res.redirect('/');  
                }
            }
        });
});

router.post('/unregister/:id',function(req,res)
{
   User.findById(req.params.id,function(err,user)
    {
        if(!user)
        {
            console.log('user does not exist');
            req.flash("errorArr","user does not exist!");
            res.redirect("/login");
        }
        else
        {
            bcrypt.compare(req.body.password, user.password, function(err,ya)
            {
                if(ya === true)
                {
                    remove_user_data(user,function(code)
                    {   // delete req.session.user; and req.user?
                        console.log("deactivated user code:"+code);
                        req.flash("successArr","Good Bye, "+user.username+"!");
                        res.redirect('/');
                    }); 
                }
                else
                {
                    req.flash("errorArr","wrong password! User not deleted!");
                    res.redirect("/settings");
                }
            });
        }
    }); 
});

//*************************************************************************
router.get("*",function(req,res)
{
  res.send("error: 404 page not found");
});

module.exports = router;