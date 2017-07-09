var express = require("express");
var router = express.Router({mergeParams : true});
var Image =  require('../models/image.js');
var User =  require('../models/user.js');
var Student =  require('../models/student.js');
var Batch = require('../models/batch');
var Question =  require('../models/question.js');
var Test =  require('../models/test.js');
var Result =  require('../models/result.js');
var Active =  require('../models/active.js');
var csrf = require('csurf');
var moment = require('moment-timezone');
var schedule = require('node-schedule');
var midw = require('../middleware');
//-----------------------------------------------------------------------------
/*
note : in all functions, req.params.id -> usually test name
but sometimes, it is test._id (explicitly specified)
*/

//-----------------------------------------------------------------------------
save_results = function(username,testname,ans,callback)
{
   var tt = midw.calculate(Test,testname,username,ans,function(test_results,test)
   {
      console.log("test results");
      console.log(test_results);
      Result.create(test_results,function(err,result)
      {   // push result in that test's results array
          if(err)
            console.log(err);
          else
          {
              // TODO : assumption : student can take a test only once
              if(!test.results)
                test.results = [result];
              else
                test.results.push(result);
              test.save();
              // now save the results in student's tests
              Student.findusername(result.student_name,function(err,stud)
              { // TODO : according to assumption, pushing into array is the way
                if(err) console.log(err);
                if(!stud.tests)
                  stud.tests = [test];
                else
                  stud.tests.push(test);
                stud.save();
                console.log("saved results");
                Active.findOneAndRemove({name:result.student_name,test:test.name},function(err,rrr)
                {
                  if(err)console.log(err);
                  else  callback();
                });
              });
          }
      });
   });
};
//-----------------------------------------------------------------------------
router.get("/",midw.requireLogin,function(req,res)
{
  Test.find({},function(err,tests)
  {
    if(err)console.log(err);
    else
      res.render("test/index",{tests:tests,csrfToken : req.csrfToken()});
  });
    
});

router.get("/new",midw.teacher,midw.newPariksha,function(req,res)
{
  res.render("test/new",{batches:req.batches,questions:req.questions,csrfToken : req.csrfToken()});
});

router.get("/edit/:id",midw.checkOwnership(Test),midw.editPariksha(Test),function(req,res)
{
  res.render("test/edit",{t:req.t,batches:req.batches,questions:req.questions,qid:req.d,types:req.types,csrfToken : req.csrfToken()});
});

router.get("/start/:id",midw.student,midw.checkbatch(Test),function(req,res)
{ 
  Test.findOne({'name':req.params.id},function(err,test)
  {
      if(err||!test)
        res.send("error!");
      else
      {
         // console.log(moment());
         // console.log(moment(test.date).add(test.duration,'minutes'));
          // check if test already over 
          if(moment() > (moment(test.date).add(test.duration,'minutes'))) 
          { 
            //console.log("sorry! test is over!");
            res.send("sorry! test is over!");
          }
          else
          {
              var message;
              if(moment() < moment(test.date))
              {  // send countdown timer value
                  message = "test not yet started, please click start when the timer finishes.";
              }
              else
              {   // send test started message
                  message = "test already started, please click start to begin.";
              }
              res.render('test/dashboard',{test:test,message:message,time:test.date});
          }
      }
  });
});

router.get("/running/:id",midw.student,midw.checkbatch(Test),function(req,res)
{
  Test.findOne({'name':req.params.id},function(err,test)
  {
      if(err)return res.send(err);
      if(!test)return   res.status(404).send("test not found!");
      else
      {   // check if test already over 
          if( moment() < (moment(test.date)) || moment() > (moment(test.date).add(test.duration,'minutes')) ) 
            res.send("sorry! test inaccessible!");
          else
          {
              test.populate("questions",function(err,ptest)
              {
                if(err)res.send(err);
                else
                {
                  var username  = req.user.username;
                  var ans = new Array(ptest.questions.length);  // user's marked answers
                  for(var i=0;i<ans.length;i++)
                    ans[i] = ['$'];
                  Active.findOne({name:username,test:req.params.id},function(err,act)
                  {
                    if(err)return res.send(err);
                    if(!act)
                    { // if active item not exist, create new one, with over:false
                      console.log("not found, creating a new record."); 
                      Active.create({name:username,time:test.date,test:test.name,ans:ans,over:false});
                    }
                    else
                    {
                      if(act.over === true)
                      { // user cannot access test, once he/she has finished it
                        // i.e. If they clicked 'quit test' before it got over, and tried to access the link again, it would be forbidden
                        console.log("Forbidden: Accessing finished test again!");
                        return res.status(403).send("<h3>Forbidden: Accessing finished test again!</h3>");
                      }
                      for(var i=0;i<act.ans.length;i++)
                        ans[i] = act.ans[i].split(",");
                    }
                    console.log("ans=");
                    console.log(ans);
                    //results calc will happen on nearest minute, if duration is a float, else 1 min later
                    var time = parseInt(test.duration)+1;
                    console.log((moment(test.date).add(time,'minutes')));
                    schedule.scheduleJob(moment(test.date).add(time,'minutes').toDate(),function()
                    {
                      Active.findOne({name:username,test:test.name},function(err,dact)
                      {
                        if(err||!dact)   res.send("error!");
                        else
                        {
                          for(var i=0;i<dact.ans.length;i++)
                            dact.ans[i] = dact.ans[i].split(',');
                          console.log("calculating score and saving results");
                          save_results(username,test.name,dact.ans,function()
                          {
                              console.log("removed active item");
                              console.log("results calculated and stored!");
                          }); 
                        }
                      });
                    });  
                    res.render("test/running",{test:ptest,ans:ans,csrfToken : req.csrfToken()});
                  });
                }
              });
          }
      }
  });
});
    
router.get("/results/:id/:username",midw.requireLogin,function(req,res)
{
  midw.getResults(req,res,"Test",function(st)
  {
    var test_res = st.tests[0].results[0];
    var ans = test_res.ans;
    var ANS = test_res.ANS;
    var ver = test_res.ver;
    //res.json(st);
    res.render("results",{stud:st,test:st.tests[0],ans:ans,ANS:ANS,ver:ver});
  });
});

router.get("/:id",midw.requireLogin,function(req,res)
{
  Test.findOne({name:req.params.id},function(err,t)
  {
    if(err||!t)res.send("test not found!");
    else
      res.render("test/show",{t:t,csrfToken : req.csrfToken()});
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
  Test.create(req.body,function(err,test)
  {
    if(err)console.log(err);
    else
    {
      console.log('done');
      req.flash("successArr","new test added successfully!");
      res.redirect('/test');
    } 
  });
});

router.post('/edit/:id',midw.checkOwnership(Test),function(req,res) // test._id
{
  var dat = moment(req.body.date);
  req.body.date = dat.toDate();
  console.log(req.body);
   Test.findByIdAndUpdate(req.params.id,req.body,function(err,t)
    {
      if(err){	req.flash("errorArr",err.message);	res.redirect("/");	}
      else
      {  // redirect somewhere
        req.flash("successArr","Test Updated!");
        res.redirect("/test");
      }
    });
});

router.post('/save/:id',midw.student,function(req,res)
{
  console.log("Saving answers..");
  Test.findOne({'name':req.params.id},function(err,test)
  {
    if(err||!test){ res.status(400); res.json({error:"error! test not found!"}); }
    Active.findOne({name:req.body.name,test:req.params.id},function(err,act)
    {
      if(err||!act)console.log("active item not found!");
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

// when post req come to end-test:
/*
bad timing error
mark over:true in active item
calculate marks and update results,test and student data
if inside test timing
  don't show answers
else => at test over
  show answers
  

*/
router.post('/end-test',function(req,res)
{
  if(moment() < moment(test.date) || moment() > (moment(test.date).add(test.duration,'/minutes')) )
   return console.log("bad timing!");

   // if they finish before test ended don't show the answers
  else if(moment() < (moment(test.date).add(test.duration,'minutes')))
  {

  }
  else // finish at test end
  {

  }
});
//-------------------------------------------------------------------------
router.delete("/:id",midw.checkOwnership(Test),function(req,res)
{
  Test.findByIdAndRemove(req.params.id,function(err)
  {
    req.flash("successArr","Test Deleted!");
    res.redirect("/test");
  });
});


// var time = new Date();
// console.log(time);
// time-=60*1000;
// console.log(time);
// schedule.scheduleJob(time,function()
// {
//   console.log("done");
// });

//*************************************************************************
router.get("*",function(req,res)
{

  res.send("error: 404 page not found");
});

module.exports = router;