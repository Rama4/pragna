
var express = require('express');
var    http = require('http');
var    fs = require('fs');
var    path = require('path');
var busboy = require('connect-busboy');
var router = express.Router({mergeParams : true});
var Image =  require('../models/image.js');
var csrf = require('csurf');
var midw = require('../middleware/index');

var Flickr = require("flickrapi"),
    flickrOptions = {
      api_key: "API key that you get from Flickr",
      secret: "API key secret that you get from Flickr"
    };

Flickr.authenticate(flickrOptions, function(error, flickr) {
  // we can now use "flickr" as our API object
});


router.use(busboy()); 

var doit  = function(id,req,res)    // get requests
{
    
    switch(id)
    {
        case 'new': { // add new image
                        res.render('image/new',{csrfToken : req.csrfToken()});               
               break; }
        default : {
                res.send("page not found!");
            }
    }
};

var handle  = function(id,req,res)  // post requests
{
    switch(id)
    {
        case 'new': { // upload image
        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename)
        {
            console.log("Uploading: " + filename);
            fstream = fs.createWriteStream(__dirname + '/../public/files/' + filename);
            file.pipe(fstream);
            fstream.on('close', function () {
              console.log('uploaded');
                var obj = {
                     'name' : filename,
                     'path' : 'files/'+filename,
                     'author' :  {id: req.session.user._id,
                                    username : req.session.user.username}
                    };
                Image.create(obj,function(err,img)
                {
                    if(err)
                    {   req.flash("errorArr",err.message); }
                    else
                    {
                        console.log("uploaded");
                    }
                });
            });
        });
        console.log("redirecting..");
        req.flash("successArr","New images uploaded successfully!");
        res.redirect("/");
        break;    } // end of case
        
    }
};

router.get("/",midw.teacher,function(req,res)
{
    Image.find({},function(err,allimages)
    {
        if(err)
            console.log(err);
        else
            res.render("image/index",{allimages:allimages,csrfToken : req.csrfToken()});  
    });
});

router.get("/:id",midw.teacher,function(req,res)
{
    doit(req.params.id,req,res); 
});


router.post('/:id',midw.teacher, function(req, res) {
   handle(req.params.id,req,res);
});
// DESTROY Route
router.delete("/:id",midw.checkOwnership(Image),function(req,res)
{
  Image.findById(req.params.id,function(err,img)
  {
    if(err)
    {
         req.flash("errorArr",err.message); res.redirect("/");
    }        
    else
    {   
        fs.unlink(__dirname + '/../public/'+img.path); // delete file in server
        img.remove();                                           // delete file from database
        req.flash("successArr","image Deleted!");
        res.redirect("/image");
    }
  });
});

module.exports = router;