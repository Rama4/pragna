var express = require("express");
var router = express.Router({mergeParams : true});
var Image =  require('../models/image.js');
var User =  require('../models/user.js');
var Student =  require('../models/student.js');
var Teacher = require('../models/teacher');
var Question =  require('../models/question.js');
var Batch =  require('../models/batch.js');
var csrf = require('csurf');
var Active =  require('../models/active.js');
var Result =  require('../models/result.js');
var Batch = require('../models/batch');
var moment = require('moment-timezone');
var schedule = require('node-schedule');
var midw = require('../middleware/index');
//----------------------------------------------------------------------------------------
function create(req,res)
{
    Batch.create(req.body,function(err,batch)
    {
        if(err)  res.send(err);
        else{
            console.log("new batch created!");
            console.log(batch);
            req.flash("successArr","Batch created successfully!");
            res.redirect('/');
        }
    });
}
function add_students(req,res,callback)
{
    var batch = req.body.batches;
    var st = req.body.students;
    if(!st)
        st = [];
    else if(typeof st === 'string')
        st  = [st];
    Batch.findOne({name:batch},function(err,b)
    {
        if(err){res.send(err);callback(0);}else if(!b){res.send("not found!");callback(0);}
        else{
        var arr = b.students;
        Array.prototype.push.apply(st,arr);
        req.body.students = st;
        console.log("added students");
        callback(1); 
        }
    });
}
function edit(req,res)
{
    Batch.findByIdAndUpdate(req.params.id,req.body,function(err,t)
    {
        if(err){	req.flash("errorArr",err.message);	res.redirect("/");	}
        else{  // redirect somewhere
            console.log("batch updated!");
            console.log(t);
            req.flash("successArr","Batch Updated!");
            res.redirect("/batch");
        }
    });
}
//----------------------------------------------------------------------------------------
router.get('/new',midw.teacher,function(req,res)
{
    Batch.find({},function(err,batches)
    {
        if(err)  throw err;
        Teacher.find({}).populate('user').exec(function(err,teachs)
        {
            if(err)  throw err;
            Student.find({}).populate("user").exec(function(err,studs)
            {
                if(err)  throw err;
                var b_names = batches.map(function(ele){return ele.name;});
                var s_names = studs.map(function(ele){return ele.user.username});
                var t_names = teachs.map(function(ele){return ele.user.username});
                res.render('batch/new',{b_names:b_names,t_names:t_names,s_names:s_names,csrfToken : req.csrfToken()});
            });
        });      
    });
});
//----------------------------------------------------------------------------------------
router.get("/edit/:id",midw.checkOwnership(Batch),function(req,res)
{
  Batch.findById(req.params.id,function(err,t)
  {
      if(err||!t)res.send("error!");
      else
      Batch.find({},function(err,batches)
      {
        Teacher.find({}).populate('user').exec(function(err,teachs)
        {
            if(err)  throw err;
            Student.find({}).populate("user").exec(function(err,studs)
            {
                if(err)  throw err;
                var b_names = batches.map(function(ele){return ele.name;});
                var s_names = studs.map(function(ele){return ele.user.username});
                var t_names = teachs.map(function(ele){return ele.user.username});
                res.render('batch/edit',{t:t,b_names:b_names,t_names:t_names,s_names:s_names,csrfToken : req.csrfToken()});
            });
        });      
      });
    });
});
//----------------------------------------------------------------------------------------
router.get("/:id",midw.requireLogin,function(req,res)
{
  Batch.findOne({name:req.params.id},function(err,t)
  {
    if(err||!t)res.send("error! quiz not found!");
    else
      res.render("batch/show",{t:t,csrfToken : req.csrfToken()});
  }); 
});
//----------------------------------------------------------------------------------------
router.get('/',midw.requireLogin,function(req,res)
{
    Batch.find({}).populate('teachers.user').exec(function(err,batches)
    {
        if(err) throw err;
        res.render('batch/index',{batches:batches,csrfToken : req.csrfToken()});
    });
});
//----------------------------------------------------------------------------------------
router.post('/new',midw.teacher,function(req,res)
{
     req.body.author = {
      id: req.session.user._id,
      username : req.session.user.username
    };
    req.body.time = req.body.time.split(',');
    if(req.body.batches)
        add_students(req,res,function(code)
        {
            if(code!=0)
                create(req,res);
        });
    else
        create(req,res);    
});
//----------------------------------------------------------------------------------------
router.post('/edit/:id',midw.checkOwnership(Batch),function(req,res)
{
    req.body.time = req.body.time.split(',');
    if(req.body.batches)
        add_students(req,res,function(code)
        {
            if(code!=0)
                edit(req,res);
        });
    else
        edit(req,res); 
});
//----------------------------------------------------------------------------------------
router.delete("/:id",midw.checkOwnership(Batch),function(req,res)
{
  Batch.findByIdAndRemove(req.params.id,function(err)
  {
    req.flash("successArr","Batch Deleted!");
    res.redirect("/batch");
  });
});
//----------------------------------------------------------------------------------------
router.get("*",function(req,res)
{
  res.send("error: 404 page not found");
});
//----------------------------------------------------------------------------------------
module.exports = router;
//----------------------------------------------------------------------------------------