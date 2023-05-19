var express = require("express");
var router = express.Router({mergeParams : true});
var Image =  require('../models/image.js');
var User =  require('../models/user.js');
var Student =  require('../models/student.js');
var Batch = require('../models/batch');
var Question =  require('../models/question.js');
var Quiz =  require('../models/quiz.js');
var csrf = require('csurf');
var Active =  require('../models/active.js');
var Result =  require('../models/result.js');
var moment = require('moment-timezone');
var schedule = require('node-schedule');
var midw = require('../middleware');
//-------------------------------------------------------------------------------------------------
router.get("/",midw.requireLogin,function(req,res)
{
  Quiz.find({},function(err,qs)
  {
    if(err||!qs)res.send("error!");
    else
      res.render("quiz/index",{qs:qs,csrfToken : req.csrfToken()});
  });
    
});

router.get("/new",midw.teacher,midw.newPariksha,function(req,res)
{
  res.render("quiz/new",{batches:req.batches,questions:req.questions,csrfToken : req.csrfToken()});
});

router.get("/edit/:id",midw.checkOwnership(Quiz),midw.editPariksha(Quiz),function(req,res)
{
  res.render("quiz/edit",{t:req.t,batches:req.batches,questions:req.questions,qid:req.d,types:req.types,csrfToken : req.csrfToken()});
});

router.get("/start/:id",midw.student,midw.checkbatch(Quiz),function(req,res)
{ 
  Quiz.findOne({'name':req.params.id},function(err,quiz)
  {
      if(err||!quiz)res.send("error!");
      else
      {
          var username  = req.user.username;
          var ans;
          // if quiz already started, check for timeout
          Active.findOne({name:username,test:req.params.id},function(err,act)
          {
            if(act)
            {
                // check if quiz already over 
                if(moment() > moment(act.time))
                {
                    req.flash("errorArr","sorry! quiz is over!");
                    res.redirect("/quiz");
                }
                else
                {
                    res.redirect('/quiz/running/'+req.params.id);
                }
            }
            else
            { // not yet started
                    var message = "click start when you are ready";
                    res.render('quiz/dashboard',{quiz:quiz,message:message,time:quiz.date});
            }
        });  
      }
  });
});

router.get("/running/:id",midw.student,midw.checkbatch(Quiz),function(req,res)
{   
  Quiz.findOne({'name':req.params.id},function(err,quiz)
  {
      if(err || !quiz) res.send("quiz not found!");
      else
      {
          var username  = req.user.username;
          var ans;
          Active.findOne({name:username,test:req.params.id},function(err,act)
          {
            if(err || !act)
            {
              console.log("not found, creating a new record.");
              quiz.populate("questions",function(err,q)
              {
                if(err)res.send(err);
                else
                {
                  ans = new Array(q.questions.length);  // user's marked answers
                  for(var i=0;i<ans.length;i++)
                    ans[i] = [""];
                  var time = moment().add(q.duration,'minutes').toDate();
                  Active.create({name:username,time:time,test:q.name,ans:ans},function()
                  {
                      schedule.scheduleJob(time,function()
                      {
                        Active.findOneAndRemove({name:username,test:q.name},function(err,rrr)
                          {
                            if(err)console.log(err);
                            else  console.log("removed active item");
                          });
                      });
                  });    
                  res.render("quiz/running",{quizstart:false,time:time,quiz:q,ans:ans,csrfToken : req.csrfToken()});
                }
              });
            }
            else
            {
                // check if quiz already over 
                if(moment() > moment(act.time))// act.time = deadline, for quizzes
                {
                    req.flash("errorArr","sorry! quiz is over!");
                    res.redirect("/");
                }
                else
                {
                  for(var i=0;i<act.ans.length;i++)
                    ans[i] = act.ans[i].split(",");
                  console.log("fetched ans from db:"+ans);  
                  quiz.populate("questions",function(err,q)
                  {
                    if(err)res.send(err);
                    else
                    {
                      console.log("resuming test");
                      res.render("quiz/running",{quizstart:true,time:act.time,quiz:q,ans:ans,csrfToken : req.csrfToken()});
                    }
                  });
                }
            }
        });  
      }
  });
});

router.get("/:id",midw.requireLogin,function(req,res)
{
  Quiz.findOne({name:req.params.id},function(err,t)
  {
    if(err||!t)res.send("error! quiz not found!");
    else
      res.render("quiz/show",{t:t,csrfToken : req.csrfToken()});
  });
    
});

router.get("/results/:id/:username",midw.requireLogin,function(req,res)
{
  midw.getResults(req,res,"Quiz",function(st)
  {
    var test_res = st.quizzes[0].results[0];
    var ans = test_res.ans;
    var ANS = test_res.ANS;
    var ver = test_res.ver;
    //res.json(st);
    res.render("results",{stud:st,test:st.quizzes[0],ans:ans,ANS:ANS,ver:ver});
  });
});


router.post('/new',midw.teacher,function(req,res)
{
  req.body.author = {
      id: req.session.user._id,
      username : req.session.user.username
  };
  console.log(req.body);
  Quiz.create(req.body,function(err,quiz)
  {
    if(err)console.log(err);
    else
    {
      console.log('done');
      req.flash("successArr","new quiz added successfully!");
      res.redirect('/quiz');
    } 
  });
});

router.post('/edit/:id',midw.checkOwnership(Quiz),function(req,res)
{
  console.log(req.body);
   Quiz.findByIdAndUpdate(req.params.id,req.body,function(err,t)
    {
      if(err){	req.flash("errorArr",err.message);	res.redirect("/");	}
      else
      {  // redirect somewhere
        req.flash("successArr","Quiz Updated!");
        res.redirect("/quiz");
      }
    });
});

router.post('/save/:id',midw.student,function(req,res)
{
  console.log("received ans save post req");
  console.log(req.body);
  Quiz.findOne({'name':req.params.id},function(err,quiz)
  { 
    if(err||!quiz){ res.status(400); res.json({error:"error! quiz not found!"}); }
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

router.post("/result/:id",midw.student,midw.checkbatch(Quiz),function(req,res)
{
   console.log(req.body);
   var results = midw.calculate(Quiz,req.params.id,req.user.username,req.body.ans,function(results,quiz)
   {
      console.log("results");
      console.log(results);
      
      Result.create(results,function(err,result)
      {
          // push result in that quiz's results array
          if(err)console.log(err);
          else
          {
              // TODO : assumption : student can take a quiz only once
              if(!quiz.results)
                quiz.results = [result];
              else
                quiz.results.push(result);
              quiz.save();
              // now save the results in student's tests
              Student.findusername(result.student_name,function(err,stud)
              {
                // TODO : according to assumption, pushing into array is the way
                if(err) console.log(err);
                if(!stud.quizzes)
                  stud.quizzes = [quiz];
                else
                  stud.quizzes.push(quiz);
                stud.save();
                // finally send results to running quiz
                //res.json(results);     
              });
          }
      });
   });
});

//-------------------------------------------------------------------------
router.delete("/:id",midw.checkOwnership(Quiz),function(req,res)
{
  Quiz.findByIdAndRemove(req.params.id,function(err)
  {
    req.flash("successArr","Quiz Deleted!");
    res.redirect("/quiz");
  });
});

//*************************************************************************
router.get("*",function(req,res)
{
  res.send("error: 404 page not found");
});

module.exports = router;