var express = require("express");
var router = express.Router({mergeParams : true});
var Anno =  require('../models/anno.js');
var csrf = require('csurf');
var midw = require('../middleware/index');

router.get("/",midw.requireLogin,function(req,res)
{
  Anno.find({},function(err,an)
  {
    if(err)console.log(err);
    else
      res.render("anno/index",{an:an,csrfToken : req.csrfToken()});
  });
    
});
router.get("/new",midw.teacher,function(req,res)
{
            res.render("anno/new",{csrfToken : req.csrfToken()});
});

router.get("/edit/:id",midw.checkOwnership(Anno),function(req,res)
{
  Anno.findById(req.params.id,function(err,t)
  {
      if(err)
          console.log(err);
      else
          res.render("anno/edit",{t:t,csrfToken : req.csrfToken()});
  });
});


router.get("/:id",midw.requireLogin,function(req,res)
{
  Anno.findById(req.params.id,function(err,t)
  {
    if(err)console.log(err);
    else
      res.render("anno/show",{t:t,csrfToken : req.csrfToken()});
  });
    
});
router.post('/new',midw.teacher,function(req,res)
{
  
  req.body.date = new Date().toDateString(),
  req.body.author = {
      id: req.session.user._id,
      username : req.session.user.username
  };
  Anno.create(req.body,function(err,as)
  {
    if(err)console.log(err);
    else
    {
      console.log('done');
      req.flash("successArr","new Announcement added successfully!");
      res.redirect('/announcement');
    } 
  });
});

router.post('/edit/:id',midw.checkOwnership(Anno),function(req,res)
{
  console.log(req.body);
   Anno.findByIdAndUpdate(req.params.id,req.body,function(err,t)
    {
      if(err){	req.flash("errorArr",err.message);	res.redirect("/");	}
      else
      {  // redirect somewhere
        req.flash("successArr","Announcement Updated!");
        res.redirect("/announcement");
      }
    });
});

//-------------------------------------------------------------------------
router.delete("/:id",midw.checkOwnership(Anno),function(req,res)
{
  Anno.findByIdAndRemove(req.params.id,function(err)
  {
    req.flash("successArr","Announcement Deleted!");
    res.redirect("/announcement");
  });
});

//*************************************************************************
router.get("*",function(req,res)
{
  res.send("error: 404 page not found");
});

module.exports = router;