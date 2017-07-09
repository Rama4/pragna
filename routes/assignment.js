var express = require("express");
var router = express.Router({mergeParams : true});
var Image =  require('../models/image.js');
var Question =  require('../models/question.js');
var Assignment =  require('../models/assignment.js');
var User =  require('../models/user.js');
var Student =  require('../models/student.js');
var Batch = require('../models/batch');
var Result =  require('../models/result.js');
var Active =  require('../models/active.js');
var moment = require('moment-timezone');
var csrf = require('csurf');
var schedule = require('node-schedule');
var midw = require('../middleware');
//-----------------------------------------------------------------------------
router.get("/",midw.requireLogin,function(req,res)
{
  Assignment.find({},function(err,as)
  {
    if(err||!as)res.send("error!");
    else
      res.render("assignment/index",{as:as,csrfToken : req.csrfToken()});
  });
    
});

router.get("/new",midw.teacher,midw.newPariksha,function(req,res)
{
  res.render("assignment/new",{batches:req.batches,questions:req.questions,csrfToken : req.csrfToken()});
});

router.get("/edit/:id",midw.checkOwnership(Assignment),midw.editPariksha(Assignment),function(req,res)
{
  res.render("assignment/edit",{t:req.t,batches:req.batches,questions:req.questions,qid:req.d,types:req.types,csrfToken : req.csrfToken()});
});

router.get("/running/:id",midw.student,midw.checkbatch(Assignment),function(req,res)
{
  Assignment.findOne({'name':req.params.id},function(err,assignment)
  {
      if(err||!assignment)  res.send("error!");
      else
      {
          if( moment() > moment(assignment.date)) 
              res.send("sorry! assignment inaccessible!");
          else
          {
              assignment.populate("questions",function(err,pass)
              {
                if(err)res.send(err);
                else
                {
                  var username  = req.user.username;
                  var ans = new Array(pass.questions.length);  // user's marked answers
                  for(var i=0;i<ans.length;i++)
                    ans[i] = ["$"];
                  Active.findOne({name:username,test:req.params.id},function(err,act)
                  {
                    if(err || !act)
                    {
                      console.log("not found, creating a new record.");
                      Active.create({name:username,test:assignment.name,ans:ans});
                      res.render("assignment/running",{assstart:false,assignment:pass,ans:ans,csrfToken : req.csrfToken()});
                    }
                    else
                    { 
                      for(var i=0;i<act.ans.length;i++)
                        ans[i] = act.ans[i].split(",");
                      console.log(ans);  
                      res.render("assignment/running",{assstart:true,assignment:pass,ans:ans,csrfToken : req.csrfToken()});
                    }
                  });
                }
              });
          }
        }
  });
});
    
router.get("/results/:id/:username",midw.requireLogin,function(req,res)
{
  midw.getResults(req,res,"Assignment",function(st)
  {
    var test_res = st.assignments[0].results[0];
    var ans = test_res.ans;
    var ANS = test_res.ANS;
    var ver = test_res.ver;
    //res.json(st);
    res.render("results",{stud:st,test:st.assignments[0],ans:ans,ANS:ANS,ver:ver});
  });
});

router.get("/:id",midw.requireLogin,function(req,res)
{
  Assignment.findOne({name:req.params.id},function(err,t)
  {
    if(err||!t)  res.send("error!");
    else
      res.render("assignment/show",{t:t,csrfToken : req.csrfToken()});
  });
    
});

router.post('/new',midw.teacher,function(req,res)
{
  var dat = moment(req.body.date);
  req.body.date = dat.toDate();
  req.body.author = {
      id: req.session.user._id,
      username : req.session.user.username
  }; 
  console.log(req.body);
  Assignment.create(req.body,function(err,as)
  {
    if(err)console.log(err);
    else
    {
      console.log('done');
      req.flash("successArr","new Assignment added successfully!");
      res.redirect('/assignment');
    } 
  });
});

router.post('/edit/:id',midw.checkOwnership(Assignment),function(req,res)
{
  var dat = moment(req.body.date);
  req.body.date = dat.toDate();
  console.log(req.body);
  Assignment.findByIdAndUpdate(req.params.id,req.body,function(err,t)
  {
    if(err){	req.flash("errorArr",err.message);	res.redirect("/");	}
    else
    {  // redirect somewhere
      req.flash("successArr","Assignment Updated!");
      res.redirect("/assignment");
    }
  });
});

router.post('/save/:id',midw.student,function(req,res)
{
  Assignment.findOne({'name':req.params.id},function(err,assignment)
  {
    if(err||!assignment)return res.send("error"+err);
   Active.findOne({name:req.body.name,test:req.params.id},function(err,act)
    {
      if(err||!act)console.log(err);
      else
      {
        act.ans = [];
        for(a of req.body.ans)
          act.ans.push(a.toString());
        act.save();
        console.log("saved the answers!");
      }
    });
  });
});

router.post("/result/:id",midw.student,midw.checkbatch(Assignment),function(req,res)
{
  var username = req.user.username;
  Active.findOneAndRemove({name:username,test:req.params.id},function()
  {
    console.log('removed active item');
    console.log(req.body);
   var tt = midw.calculate(Assignment,req.params.id,username,req.body.ans,function(ass_results,assignment)
   {
      console.log("ass results");
      console.log(ass_results);
      Result.create(ass_results,function(err,result)
      {
          // push result in that assignment's results array
          if(err)console.log(err);
          else
          {
              // TODO : assumption : student can take a assignment only once
              if(!assignment.results)
                assignment.results = [result];
              else
                assignment.results.push(result);
              assignment.save();
              // now save the results in student's tests
              Student.findusername(result.student_name,function(err,stud)
              {
                // TODO : according to assumption, pushing into array is the way
                if(err) console.log(err);
                if(!stud.assignments)
                  stud.assignments = [assignment];
                else
                  stud.assignments.push(assignment);
                stud.save();
                console.log("saved results");    
              });
          }
      });
   });
  });
});

//-------------------------------------------------------------------------
router.delete("/:id",midw.checkOwnership(Assignment),function(req,res)
{
  Assignment.findByIdAndRemove(req.params.id,function(err)
  {
    req.flash("successArr","Assignment Deleted!");
    res.redirect("/assignment");
  });
});

//*************************************************************************
router.get("*",function(req,res)
{
  res.send("error: 404 page not found");
});

module.exports = router;