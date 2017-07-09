var express = require('express');
var    http = require('http');
var    fs = require('fs');
var    path = require('path');
var busboy = require('connect-busboy');
var router = express.Router({mergeParams : true});
var csrf = require('csurf');
var Image =  require('../models/image.js');
var Question =  require('../models/question.js');
var cheerio = require('cheerio');
var unzip = require('unzip');
var number = require("../models/number.js");
var midw = require('../middleware/index');

var sym = ["`+`","`-`","`*`","`**`","`***`","`//`","`\\`","`xx`","`-:`","`@`","`o+`","`ox`","`o.`","`sum`","`prod`","`^^`",
"`^^^`","`vv`","`vvv`","`nn`","`nnn`","`uu`","`uuu`","`int`",
"`oint`","`del`","`grad`","`+-`","`O/`","`oo`","`aleph`",
"`/_`","`:.`","`|...|`","`|cdots|`","`vdots`","`ddots`","`|\ |`","`|quad|`","`diamond`","`square`","`|__`","`__|`","`|~`","`~|`",
"`CC`","`NN`","`QQ`","`RR`","`ZZ`","`=`","`!=`","`&lt;`","`&gt;`","`&lt;=`","`&gt;=`","`-&lt;`","`&gt;-`","`in`","`!in`","`sub`",
"`sup`","`sube`","`supe`","`-=`","`~=`","`~~`","`prop`","`alpha`","`beta`","`chi`","`delta`","`Delta`","`epsilon`","`varepsilon`",
"`eta`","`gamma`","`Gamma`","`iota`","`kappa`","`lambda`","`Lambda`","`mu`","`nu`","`omega`","`Omega`","`phi`","`Phi`","`varphi`",
"`pi`","`Pi`","`psi`","`Psi`","`rho`","`sigma`","`Sigma`","`tau`","`theta`","`Theta`","`vartheta`","`upsilon`","`xi`","`Xi`","`zeta`",
"`and`","`or`","`not`","`=&gt;`","`if`","`iff`","`AA`","`EE`","`_|_`",
"`TT`","`|--`","`|==`","`(`","`)`","`[`","`]`","`{`","`}`","`(:`","`:)`","`{:`","`:}`",
"`uarr`","`darr`","`rarr`","`-&gt;`","`|-&gt;`","`larr`","`harr`","`rArr`","`lArr`","`hArr`","`hat x`","`bar x`","`ul x`","`vec x`","`dot x`","`ddot x`"];

router.use(busboy()); 

function rem_ws(arr)
{
    var ret = [];
    for(x of arr)
        if(x.length === 1 && /^[a-zA-Z]/.test(x))
            ret.push(x);
    return ret;
}

var doit  = function(id,req,res)    // get requests
{
    switch(id)
    {
        case 'new': { // add new question
                Image.find({},function(err,images)
                {
                    if(err)
                        console.log(err);
                    else
                        res.render("question/new",{images:images,csrfToken : req.csrfToken()});
                });
               break; }
        case 'newhtml' : {
                res.render("question/newhtml",{csrfToken : req.csrfToken()});
                break;  }
        case 'qq' : {
                res.render("question/qq",{sym:sym});
                break;  }
        default : {
                Question.findById(id).exec(function(err,Q)
                { 
                    if(err){	req.flash("errorArr",err.message);	res.redirect("/question");	}
                    else
                    {
                        res.render('question/show',{Q:Q,csrfToken : req.csrfToken()});
                    }    
                });
            }
    }
};

var handle  = function(id,req,res)  // post requests
{
    switch(id)
    {
        case 'new' : {
            req.body.author = {
                id: req.session.user._id,
                username : req.session.user.username
            };
            req.body.answer = req.body.answer.split(' ').sort();
            Question.create(req.body ,function(err,campground)
            {
                if(err)
                {   req.flash("errorArr",err.message); }
                else
                {
                    console.log(req.body);
                    req.flash("successArr","New Question added!");
                    res.redirect("/question");          
                }
            });
               break;     } // end of case
        case 'newhtml': { // upload image
        var fstream,path,c=0;
        req.pipe(req.busboy);
        path = __dirname + '/../public/files/questions/';
        // access the questions type and neg from the form, after uploading and extracting questions from the files
        var questions_info = {};
        req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
            console.log(key+':'+value);
            questions_info[key] = value;
        });
        req.busboy.on('file', function (fieldname, file, filename)  // upload files
        {
            console.log("Uploading: " + filename);
            fstream = fs.createWriteStream(path + filename);
            file.pipe(fstream);
            fstream.on('close', function ()         // after file saved on disk
            {
                console.log('uploaded zip file');
                fs.createReadStream(path + filename).pipe(unzip.Extract({ path: path})).on('close',function()   
                {   //after  extract zip file
                    fs.unlink(path + filename); // delete zip file after extracting 
                    console.log("extracted zip and deleted zip file");
                    // get the image number counter from mongodb
                    number.find({},function(err,num)
                    {
                        //num[0].val = 0;   // do this only once, ever!
                        var M = [],ext;     // M -> map for mapping old image names with new, ext -> extension of that image
                        fol_name = filename.substr(0,filename.length-4)+"_files";
                        // map every image inside the images folder of the html, with its new value
                        fs.readdir(path+fol_name,function(err,list)
                        {   
                            if(err)console.log(err);
                            list.forEach(function(file)
                            {
                                ext = file.substr(file.length-4,4);
                                M[fol_name+'/'+file] = (num[0].val++)+ext; // map  old name with new name
                            });
                            console.log(M);

                            // rename all files to new names(actually moving them to '/public/files/questions/')
                            for(var i=0;i<list.length;i++)
                            {
                                console.log(path+fol_name+'/'+list[i]);
                                console.log(path+M[fol_name+'/'+list[i]]);
                                fs.renameSync(path+fol_name+'/'+list[i],path+M[fol_name+'/'+list[i]]);
                            }
                            console.log('moved files');
                            var html_name = filename.substr(0,filename.length-4)+'.html';
                            // parse html file, update the src attribute of each img tag to their new value
                            // then construct the array of questions -> 'ques'
                            fs.readFile(path+html_name, 'utf8',function(err, data)
                            {
                                var ques = [],ans = [],ops = [],ind = 0,flag = 0;
                                var temp = "",x;
                                $ = cheerio.load('' + data);
                            
                                var old;
                                $('img').each(function()
                                {
                                    old = $(this).attr('src');
                                    $(this).attr('src','/files/questions/'+M[old]);
                                });
                                var str;
                                console.log("parsing each line");
                                $("div > p").each(function(i,elem)
                                {   // single and double quotes, and greek letters don't display
                                    str = $(this).text().replace(/[^-+*/0-9a-z\s\.]/gi, '');
                                    console.log(str.length+"->"+str);
                                    if(str)
                                    {
                                        if(str === "Qno"+(ind+1)) // see if inner html is a question number
                                        {   // new question
                                            ques.push(new Array());
                                            ans.push(new Array());
                                            ops.push(new Array());
                                            ind++;
                                            flag=0;
                                        }
                                        // ASSUMPTION there is an Ano after every no,otherwise index won't be updated correctly.
                                        // observe the ind used for ques and ans, carefully.
                                        else if(str === "Ano"+(ind)) // see if inner html is an answer number
                                        {
                                            flag=1;
                                        }
                                        else if(str === "Ono"+(ind))
                                        {
                                            flag=2;
                                        }
                                        else
                                        {
                                            x = $(this).wrap('<p/>').parent().html();
                                            console.log(flag);
                                            switch(flag)
                                            {
                                                case 0: ques[ind-1].push(x); break;
                                                case 1: ans[ind-1].push(x); break;
                                                case 2: Array.prototype.push.apply(ops[ind-1],rem_ws($(this).wrap('<p/>').parent().text().split(""))); break;
                                            }
                                        }
                                    }
                                    else    // else push the full html(innerhtml and the tag itself) into the current question
                                    {       // it is done by wrapping the current element with p tag
                                            // and then unwrapping it (isn't defined, so no unwrap done here) after getting the parent's innerhtml
                                        x = $(this).wrap('<p/>').parent().html();
                                        console.log(flag);
                                        switch(flag)
                                        {
                                            case 0: ques[ind-1].push(x); break;
                                            case 1: ans[ind-1].push(x); break;
                                            case 2: Array.prototype.push.apply(ops[ind-1],rem_ws($(this).wrap('<p/>').parent().text().split(""))); break;
                                        }
                                    }
                                });
                                console.log("questions:"+ques.length);
                                console.log(ques);
                                console.log("answers:"+ans.length);
                                console.log(ans);
                                console.log("options:"+ops.length);
                                console.log(ops);
                                // save the new images counter value
                                num[0].save();  
                                console.log('saved num');
                                console.log(questions_info);
                                fs.rmdirSync(path + fol_name) // delete folder
                                fs.unlink(path + html_name); // delete html file 

                                var s="",obj=[];
                                // ASSUMPTION : ques and ans arrays have same length
                                for(var i=0;i<ques.length;i++)
                                {
                                    s = "";
                                    for(var j=0;j<ques[i].length;j++)
                                        s += ques[i][j];
                                    obj.push({ 'html' : s });
                                }
                                for(var i=0;i<ans.length;i++)
                                {
                                    s = "";
                                    for(var j=0;j<ans[i].length;j++)
                                        s += ans[i][j];
                                    obj[i].hint =  s;
                                    obj[i].answer = ops[i];
                                    obj[i].type = questions_info.type;
                                    obj[i].negative = questions_info.negative;
                                    obj[i].author = {
                                        id: req.session.user._id,
                                        username : req.session.user.username
                                    };
                                }
                                Question.create(obj,function(err,aa)
                                {
                                    console.log("questions stored into database!");
                                    req.flash("successArr","new questions added!");
                                    res.redirect('/');
                                });
                            });
                        });
                    });
                });  
            });
        });
        break;    } // end of case       
    }
};

router.get("/",midw.teacher,function(req,res)
{
    Question.find({},function(err,questions)
    {
        if(err)
            console.log(err);
        else
            res.render("question/index",{questions:questions,csrfToken : req.csrfToken()});
    });
});
router.get("/edit/:id",midw.checkOwnership(Question),function(req,res)
{   
    Question.findById(req.params.id).exec(function(err,Q)
    { 
        if(err){	req.flash("errorArr",err.message);	res.redirect("/question");	}
        else
        {
            Image.find({},function(err,images)
            {
                if(err)
                    console.log(err);
                else
                    res.render("question/edit",{Q:Q,images:images,csrfToken : req.csrfToken()});
            });
        }    
    });
});

router.get("/:id",midw.teacher,function(req,res)
{
    doit(req.params.id,req,res); 
});

router.post('/edit/:id',midw.checkOwnership(Question),function(req, res) {
    console.log(req.body);
    req.body.answer = req.body.answer.split(" ").sort();
    console.log(req.body);
    Question.findByIdAndUpdate(req.params.id,req.body,function(err,UQ)
    {
      if(err){	req.flash("errorArr",err.message);	res.redirect("/question");	}
      else
      {  // redirect somewhere
        req.flash("successArr","Question Updated!");
        res.redirect("/question");
      }
    });
});
var Anno =  require('../models/anno.js');
router.post('/:id',midw.teacher, function(req, res) {
   handle(req.params.id,req,res);
});
// DESTROY Route
router.delete("/:id",midw.checkOwnership(Question),function(req,res)
{
  Question.findByIdAndRemove(req.params.id,function(err)
  {
    req.flash("successArr","Question Deleted!");
    res.redirect("/question");
  });
});

module.exports = router;