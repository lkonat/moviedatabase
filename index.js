// Add any outside files here...
var express = require('express');
var expressValidator = require('express-validator');
var formidable = require('formidable');
var mysql = require('mysql');
var fs = require('fs');
var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:"main"});
var mysql = require('mysql');

app.engine("handlebars",handlebars.engine);
app.set("view engine","handlebars");
app.set('port', process.env.PORT || 4000);
app.use(express.static(__dirname +'/public'));

app.use( function( req, res, next){
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  next();
 });

app.use(require('body-parser').urlencoded({extended:true}));
app.use(expressValidator());

/* DB Connection
 * USE connect(function(con){}); inside POST to call DB
*/
function connect(cb){
  var con = mysql.createConnection({
      host : 'fkonat.it.pointpark.edu',
      user : 'lunamista',
      password : 'lunamista123',
      database : 'lunadb'
  });
  con.connect(function(err){
    if (err){
      console.log('error: ' + err.stack);
      return;
    }
    cb(con);
    console.log('Connected!');
  });
}

function getMenu(req){
  var menu =[];
  var isLoggedIn = req.session.user_id ? true : false;
  var isAdmin = req.session.is_admin ? true : false;
  if(isAdmin){
    menu.push({"page": "search", "label": "Search For Actors"});
  } else{
    menu.push({"page": "addUser", "label": "Edit Info"});
  }
  menu.push({"page": "about", "label": "About"});
  return menu;
};

// Root Dir. Displays to USER on Page Load w/ Nav-Bar
app.get('/', function(req, res) {
  res.render('landing', {
    menu: getMenu(req)
  });
});

app.get('/about', function(req, res) {
  res.render("about", {
    menu: getMenu(req)
  });
});

app.get('/admin_page', function(req, res) {
  res.render('admin_page');
});

app.get('/admin_mail', function(req, res) {
  res.render('admin_mail');
});

app.get('/admin_search', function(req, res) {
  res.render('admin_search');
});

app.get('/success', function(req, res) {
  res.render('success');
});

app.get('/error-page', function(req, res) {
  res.render('error-page');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/welcome', function(req, res) {
  res.render('welcome');
});

app.get("/history", function(req,res){
  if(req.session.admin_id){
  }else {
    res.render("searchhistory",{admin:req.session.firstName,adminlogin:req.session.admin_id});
  }
});

app.get("/forgotpassword", function(req,res){
  res.render("forgotpassword", {
    menu: getMenu(req)
  });
});

app.get("/search", function(req,res){
  res.render("search", {
    menu: getMenu(req)
  });
});

app.get("/addUser", function(req,res){
  res.render("addUser");
});

app.get("/logout", function(req,res){
  delete req.session.user_id;
  res.redirect(303,'/');
});

app.post("/login", function(req,res){
  console.log("enter login route");
  connect(function(con){
    req.check('email','invalid email address').isEmail();
    var errors = req.validationErrors();
    console.log(errors);
    if(errors){
      req.session.errors = errors;
      res.redirect(303,'/');
    }else {
      var email=req.body.email;
       var q  ="SELECT id, email, password FROM users WHERE email = '" + email + "';";
         con.query(q, function (err, result, fields) {
          console.log(result);
          if (err){
            throw err;
          }
          else {
            if(result[0]){
                //req.session.userpassEmail = false;
              if(result[0].password === req.body.password){
                 req.session.user_id = result[0].id;
                 //req.session.firstName = result[0].name;
                 req.session.cookie.maxAge = 9000000;
                 //req.session.userpassPassword = false;
                 res.redirect(303,'/success');
                //.....
              }else {
                //password false
                 //console.log("password not correct");
                 //req.session.userpassPassword = true;
                  res.redirect(303,'/');
              }
            }else {
              //not result email false
              //console.log("email not found");
              //req.session.userpassEmail = true;
               res.redirect(303,'/');
            }
          }
        });
     }
  });
});

app.post('/addUser', function(req, res){
/* TODO:
 *  Ajax for Duplicate entry // app.get
 * Check Form for incomplete
 * Fix Duplicate entry Error from crashing nodemon
*/
  connect(function(con){
    var emailToCheck = req.body.email;
    var duplicateSql = "SELECT COUNT(id) FROM users WHERE email = emailToCheck;";
    var find = con.query(duplicateSql, function(err, results) {
      if (find[0] === 0) {
        // Means Email was not already used by another account
          /*if (err){
            console.log(err);
          }else{
            con.end();
            console.log("email is good");
          }*/
        }else {
          console.log("Email already being used");
        }
    });
    var sql = "INSERT INTO users (first_name, last_name, email, password, is_admin, sex) VALUES (?, ?, ?, ?, ?, ?)";
    var values = [req.body.first_name, req.body.last_name, req.body.email, req.body.password, 0, req.body.sex];
    con.query(sql, values, function(err, results) {
      console.log(values);
        if (err){
          console.log(err);
          res.redirect('/error-page');
        }else{
          con.end();
          res.redirect('/success');
        }
    });
  });
});

app.post('/process-search', function(req, res) {
        var search = req.body.search;
        var q = "SELECT * FROM users WHERE first_name LIKE '%" + search +"%'";
        connection.query(q, function(err, results) {
         if (err) throw err;
           res.send({success: results});
	});
});

app.post("/update-user-info", function(req,res){
  console.log("update-user-info",req.body);
  var table = req.body.table_name;
  for(key in req.body ){
    if(key!=="table_name"){
           console.log("in table:",table," change",key,".to.",req.body[key]);
    }
  }
  res.send({success:true});
});

var voids = {"password":true,"is_admin":true,"id":true,"users_id":true};
var users_info_names={"first_name":true,"last_name":true,"sex":true,"email":true};
var actors_info_names={"first_name":true,"last_name":true,"sex":true,"email":true};
var measurements ={"weight":true,"height":true,"neck_size":true,"sleeve_size":true,"waist_size":true,"inseam_size":true,"dress_size":true,"jacket_size":true,"shoe_size":true,"bust_size":true,"chest_size":true,"hip_size":true,"hat_size":true,}
app.get("/user", function(req,res){
  if(req.session.user_id){
    var query ="SELECT * FROM users LEFT JOIN actors ON users.id = actors.users_id  WHERE id = '"+req.session.user_id+"'  ";
    //var query ="SELECT * FROM users  WHERE id = '"+req.session.user_id+"'";
      con.query(query, function (err, result, fields) {
        if(err){
         //error
        }
        else {
          if(result[0]){
            var info={user_name: result[0].first_name,login:req.session.user_id?req.session.user_id:false,user_info:[],actor_info:[],is_admin:result[0].is_admin,all_users:[],users_id:result[0].users_id,actors_measurement:[]};
            for(key in result[0]){
              if(users_info_names[key]){
                //user info only
                info.user_info.push({name:key,label:upperCaseFirstLetter(key), value:result[0][key]});
              }
              else if (measurements[key]) {
                //actors measurements only
                info.actors_measurement.push({name:key,label:upperCaseFirstLetter(key), value:result[0][key]});
              }else if (!voids[key]) {
                //actors others info only
                  info.actor_info.push({name:key,label:upperCaseFirstLetter(key), value:result[0][key]});
              }
            }
            if(result[0].is_admin){
              info["menu"] = [{page:"home",label:"Home",isCurent:true},{page:"search",label:"Search"},{page:"search-history",label:"Search History"},{page:"give-privilege",label:"Give Admin Privilege"}];
              con.query("SELECT first_name,last_name,sex, is_admin, id FROM users", function (err, result, fields){
                 if(err) throw err;
                 for(rs in result){
                   info.all_users.push(result[rs]);
                 }
             });
           }
            //console.log(info);

           res.render("user",info);
          }
        }
      });
  }else {
    res.redirect(303,'/');
  }
});

app.post("/get-all-users",function(req,res){
  if(req.session.user_id){
    var query ="SELECT id,first_name,last_name,is_admin,email,sex,height,eye_color,gender,weight,hair_color,hair_type,tattoo,piercings,facial_hair,eyes_color,us_citizen,neck_size,sleeve_size,waist_size,inseam_size,dress_size,jacket_size,shoe_size,bust_size,chest_size,hip_size,hat_size,union_status,union_number FROM users LEFT JOIN actors ON users.id = actors.users_id";
    var q = "SELECT first_name,last_name,sex, is_admin, id FROM users";
    con.query(query, function (err, result, fields){
       if(err) throw err;
       res.send({success:result,admin_id:req.session.user_id});
   });

  }else {
    res.send({success:false});
  }
});

app.post("/get_user_images",function(req,res){
  if(req.session.user_id){
    con.query("SELECT image_url FROM images WHERE actors_users_id ='"+req.session.user_id+"'", function(err, result,fields){
      if(err){
        res.send({success:false});
      }else {
        res.send({success:result});
      }
    })
  }else {
    res.send({success:false});
  }
});

app.post("/get_user_cars",function(req,res){
  if(req.session.user_id){
    con.query("SELECT * FROM cars WHERE actors_users_id ='"+req.session.user_id+"'", function(err, result,fields){
      if(err){
        res.send({success:false});
      }else {
        res.send({success:result});
      }
    })
  }else {
    res.send({success:false});
  }
});

//custom 404 page
app.use(function(req, res){
  res.status(404);
  res.render("404");
});

//custom 500 page
app.use(function(err, req, res, next){
  console.log(err.stack);
  res.status(500);
  res.render("500");
});

app.listen(app.get('port'), function(){
  console.log("listening on http:// localhost:" + app.get("port") + "; press Ctrl-C to terminate.");
});

function upperCaseIt(word){
  return word[0].toUpperCase()+word.substring(1,word.length);
}
function upperCaseFirstLetter(word0){
  var word = word0.split("_");
  var new_Word=false;
  for(var i =0; i<word.length; i++){
    if(!new_Word){
      new_Word = upperCaseIt(word[i]);
    }else {
        new_Word+=" "+upperCaseIt(word[i]);
    }
  }
  return new_Word;
}
