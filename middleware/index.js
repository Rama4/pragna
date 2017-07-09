var Image =  require('../models/image.js');
var Question =  require('../models/question.js');
var Test =  require('../models/test.js');
var Assignment =  require('../models/assignment.js');
var Quiz =  require('../models/quiz.js');
var User =  require('../models/user.js');
var Student =  require('../models/student.js');
var Batch =  require('../models/batch');
var Anno =  require('../models/anno');
var mo = {};


var getColl = [];
getColl["Image"] = Image;
getColl["Question"] = Question;
getColl["Test"] = Test;
getColl["Quiz"] = Quiz;
getColl["Assignment"] = Assignment;
getColl["Anno"] = Anno;

// this function checks owership of the current user for a particular collection object(passed as a string name)
// alternatively, we can pass the collection object as well, then no need of getColl[]
mo.checkOwnership = function(collection)  
{   
    return function(req,res,next)
    {   
       mo.requireLogin(req,res,function()
        {
   
            collection.findById(req.params.id, function(err, obj)
            {
                if(err||!obj)
                {
                    req.flash("errorArr","error occurred!");
                    res.redirect("back");
                }
                else if(obj.author.id.equals(req.user._id))
                    next();
                else
                {
                    req.flash("errorArr","User Does Not Own It!");
                    res.redirect("back");
                }
            });   
        });
    }
};

mo.checkbatch = function(collection)  
{   
    return function(req,res,next)
    {   
        mo.requireLogin(req,res,function()
        {
            collection.findOne({name:req.params.id}, function(err, obj)
            {
                if(err)return res.send(err);
                if(!obj)
                {
                    req.flash("errorArr","error:404 test not found");
                    return res.redirect("back");
                }
                var flag=0,batch,c=0;
                for (var i = 0; i <obj.batches.length ; i++) {
                    (function(cntr) {
                        batch = obj.batches[cntr];
                        Batch.findOne({name:batch},function(err,bat)
                        {
                            if(err)return  res.send(err);
                            if(!bat.students) return res.status(404).send("error: 404 student not found!");
                            if(bat.students.indexOf(req.user.username)>-1)
                            {  next();}
                            else { c++;}
                            if(c === obj.batches.length)
                            {   
                                req.flash("errorArr","User does not belong to that batch!");
                                res.redirect("back");
                            }
                        });
                    })(i);
                }
            });   
        });
    }
};

mo.teacher = function(req,res,next)
{
   mo.requireLogin(req,res,function()
    {
        if(req.session.user.type === 'teacher')
            next();
        else
        {
            req.flash("errorArr","You don't have the necessary permissions!");
            res.redirect("back");
        }       
    });
};

// student permission => subset of teacher permission,except taking tests,etc
mo.studentAndTeacher = function(req,res,next)
{
    mo.requireLogin(req,res,function()
    {
        // student permitted => teacher permitted too
        if(req.session.user.type === 'teacher' || req.session.user.type === 'student')
            next();
        else
        {
            req.flash("errorArr","You don't have the necessary permissions!");
            res.redirect("back");
        }       
    });
};

mo.student = function(req,res,next)
{
    mo.requireLogin(req,res,function()
    {
        // student permitted => teacher permitted too
        if(req.session.user.type === 'student')
            next();
        else
        {
            req.flash("errorArr","You don't have the necessary permissions!");
            res.redirect("back");
        }       
    });
};

mo.parents = function(req,res,next)
{
    mo.requireLogin(req,res,function()
    {
        // parent permitted => student permitted => teacher permitted too
        if(req.session.user.type === 'teacher' || req.session.user.type === 'student' || req.session.user.type === 'parent')
            next();
        else
        {
            req.flash("errorArr","You don't have the necessary permissions!");
            res.redirect("back");
        }       
    });
};

// login check(no verified user check)
mo.loginOnly = function(req,res,next)
{
    if(!req.user)
    {
        req.flash("errorArr","You need to be logged in to do that");
        res.redirect("/login");
    }
    else
        next();
};
// both login and verified user check
mo.requireLogin = function(req,res,next)
{
    if(!req.user)
    {
        req.flash("errorArr","You need to be logged in to do that");
        res.redirect("/login");
    }
    else
        User.findOne({username:req.user.username,token:'done'},function(err,user)
        {
            if(err)res.send(err);
            else if(!user){req.flash('errorArr','User not verified yet'); res.redirect('/');  }
            else next();
        });
};


mo.newPariksha = function(req,res,next)
{
    Question.aggregate(
   [
     { $group : { _id : "$type", questions: { $push: "$$ROOT" } } }
   ],function(err,questions)
  {
      if(err)return res.send(err); if(!questions) return res.status(404).send({"error":"questions not found!"});   
        Batch.find({},function(err,batches)
        {
          if(err) res.send(err);
          else if(!batches || !batches.length)res.status(404).send('Error : No batches found!<br>There needs to be atleast 1 batch to do this.');
          else{ 
            batches = batches.map(function(ele){return ele.name});
            var f_questions = questions.map(function(ele){return ele.questions});
            for(var i=0;i<f_questions.length;i++)
              for(var j=0;j<f_questions[i].length;j++)
              {     delete f_questions[i][j].html;  delete f_questions[i][j].hint; delete f_questions[i][j].answer;    }
            req.batches = batches;
            req.questions = f_questions;
            next();
        }
        });
  });
};

//this is an example of a middleware taking other arguments than default(req,res,next)
mo.editPariksha =  function(collection){
return function(req, res, next)
{
    collection.findById(req.params.id,function(err,t)
    {   // error handling done in middleware
        Question.aggregate(
        [
            { $group : { _id : "$type", questions: { $push: "$$ROOT" } } }
        ],function(err,questions)
        {
            if(err)return res.send(err); if(!questions) return res.status(404).send({"error":"questions not found!"});   
            else
            Batch.find({},function(err,batches)
            {
                if(err) res.send(err);
                else if(!batches || !batches.length)res.status(404).send('Error : No batches found!<br>There needs to be atleast 1 batch to do this.');
                else{ 
                batches = batches.map(function(ele){return ele.name});
                var i;
                
                for(var i=0;questions.length;i++)
                    if(questions[i]._id === t.type)
                        break;
                var types = questions.map(function(ele){return ele._id;});
                // array of question  ids, grouped by question type
                questions = questions.map(function(ele){return (function(nana){return nana.map(function(na){return na._id;});})(ele.questions);});
                
                req.t = t;
                req.batches = batches;
                req.questions = questions;
                req.d = i;
                req.types = types;
                next();
                }
            });
        });         
    });
};
};

mo.calculate = function (collection,testname,student_name,ans,callback)
{
  var results =[];
  // get test from database 
  collection.findOne({name:testname}).populate("questions").exec(function(err,test)
   {
    if(err||!test)
    {   console.log("error in calculation!");}
    else{
    var tname  = test.name;
    var ANS = [],score=0,k=0,temp1,temp2,ver=[];
    // ver -> store verdict for each question
    if(test.type === "Single Option Correct")
      for(var i=0;i<ans.length;i++)
      {
          ANS.push(test.questions[i].answer);
          if(ans[i][0] === "$")
          {  
            ver.push('Not Attempted');
          }
          else if(ans[i][0] === ANS[i][0])
          {
            score += test.correct;
            ver.push("Correct");
          }
          else
          { 
            score += test.incorrect;
            ver.push("Wrong");
          }
      }
    else if(test.type === "One Or More Options Correct")
      for(var i=0;i<ans.length;i++)
      {
          ANS.push(new Array());
          ANS[i] = test.questions[i].answer;
          if(ans[i][0] === "$")
          {  
            ver.push("Not Attempted");
            continue;
          }
          k=0;
          temp1 = ANS[i].sort();
          temp2 = ans[i];
          if(temp1.length == temp2.length)
            for(var j=0;j<temp1.length;j++)
              if(temp1[j] === temp2[j])
                ++k;
          if(k == temp1.length)
          {
            score += test.correct;
            ver.push("Correct");
          }
          else
          { 
            score += test.incorrect;
            ver.push("Wrong");
          }
      }
    else
      console.log("this type of test correction not yet defined");
    callback({student_name:student_name,date:new Date(),ANS:ANS,ans:ans,score:score,ver:ver},test);
    } //end: else if test found
  });
};

function getpath(collection)
{
    switch(collection)
    {
        case "Test"  : return "tests";
        case "Quiz"  : return "quizzes";
        case "Assignment"  : return "assignments";
        default : return "none";
    }
}

function gettests(stud,collection)
{
    switch(collection)
    {
        case "Test"  : return stud.tests;
        case "Quiz"  : return stud.quizzes;
        case "Assignment"  : return stud.assignments;
        default : return null;
    }
}

mo.getResults = function(req,res,collection,callback)
{
    var testname  = req.params.id;
    var username  = req.params.username;
    var path = getpath(collection);
    var qpath = path+".questions";
    var rpath = path+".results";
    var Coll = getColl[collection];
    User.findOne({username:username},function(err,user)
    {
    if(err||!user)res.send("user not found!");
    else
        Student.findOne({user:user},function(err,st1)
        {
        if(err||!st1)res.send("student not found!");
        else
            Student.populate(st1, { path: 'user', model: 'User'}, function(err, stu)
            {
            if (err||!stu)res.send("error occurred");
            else
                Coll.findOne({name:testname},function(err,test)
                {
                if(err||!test)res.send("test not found!");
                else
                    Student.populate( stu , {
                    path: path,
                    match: { name: testname}
                    },
                    function(err,stud) 
                    {
                    if(err||!(gettests(stud,collection).length))res.send("Test not taken by Student!");
                    else 
                        Student.populate(stud,
                        [{
                            path : rpath,
                            // return results that match current student name
                            match: { student_name: username},
                            model : 'Result'
                        },
                        {
                        path : qpath,
                        model : "Question"
                        }],
                        function(err,st)
                        {
                        if(err) res.send(err);
                        else    callback(st);
                    });                  
                });
                });
            });          
        });
    });
};


module.exports = mo;
