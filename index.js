// Add any outside files here...
var express = require('express');

var nodemailer = require('nodemailer');
var credentials = require('./credentials.js');
var expressValidator = require('express-validator');
var formidable = require('formidable');
var randomstring = require("randomstring");
var mysql = require('mysql');
var fs = require('fs');
var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:"main"});
var mysql = require('mysql');
var crypto = require('crypto');
var Jimp = require("jimp");
var gm = require('gm');//.subClass({imageMagick: true});;

global.atob = require("atob");

app.engine("handlebars",handlebars.engine);
app.set("view engine","handlebars");
app.set('port', process.env.PORT || credentials.port || 4000);

if (!credentials.authentication) {
  console.log("WARNING: possibly using insecure connection (ignore during development)");
}

app.use(function(req, res, next) {
  if (!credentials.authentication || req.get("X-Authentication-Key") === credentials.authentication.key) {
    next();
  }
  else {
    res.status(401);
    res.setHeader("content-type", "text/plain");
    res.send("401 Unauthorized");
  }
});

app.use(express.static(__dirname +'/public'));

app.use( function( req, res, next){
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  next();
 });

app.use(require('body-parser').urlencoded({extended:true}));
app.use(expressValidator());
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
 resave:false,
 saveUninitialized:false,
 secret:credentials.cookieSecret
}));

/* DB Connection
 * USE connect(function(con){}); inside POST to call DB
*/

function connect(cb){
  try {
    var con = mysql.createConnection({
      host: credentials.host,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database
    });
  }
  catch (e) {
    console.log("ERROR: connect: mysql.createConnection(): " + e);
  }
  con.connect(function(err) {
    if (err){
      console.log("ERROR: connect: con.connect(): " + err);
    }
    else {
      try {
        cb(con);
      }
      catch(e) {
        console.log("ERROR: connect: cb(con): " + e);
      }
      // close connection after 60 seconds
      setTimeout(function() {
        try {
          con.end();
        }
        catch (e) {
          console.log("ERROR: connect: con.end(): " + e);
        }
      }, 60*1000);
    }
  });
}

// generates random string of characters
var genRandomString = function(length){
    return crypto.randomBytes(Math.ceil(length/2))
            .toString('hex') // converts to hexadecimal format
            .slice(0,length);   // returns required number of characters
};

// Need to hash the string-password along with the salt dumbass

var sha512 = function(password, salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');
    return {
      password:password,
      salt:salt,
      passwordHash:value
    };
};


var transporter = nodemailer.createTransport({
  service: credentials.emailService,
  auth: {
    user: credentials.emailUser,
    pass: credentials.emailPassword
  }
});

function getMenu(req){
  var menu =[];
  var isAdmin = req.session.is_admin;
   menu.push({"page": ".", "label": "Home"},{"page": "about", "label": "About"});

  if(isAdmin){
    menu.push({"page": "search", "label": "Search"}, {"page":"edit", "label":"Customize"},{"page":"add_actor", "label":"Add Actors"});
  } else{
    if(req.session.user_id){

    }else {
      menu.push({"page": "addUser", "label": "Sign Up"},{"page": "home-login", "label": "Log In"});
    }
  }
  return menu;
};

// Root Dir. Displays to USER on Page Load w/ Nav-Bar
app.get('/', function(req, res) {
  if(req.session.user_id){
    res.redirect(303,'user');
  }else {
    res.render('landing', {
       menu: getMenu(req),
       login:req.session.user_id?req.session.user_id:false,
       user_name:req.session.user_first_name,
    });
  }
});

app.get('/home-login', function(req, res) {
  res.render('home-login', {
  menu: getMenu(req),
  login:req.session.user_id?req.session.user_id:false,
  user_name:req.session.user_first_name,
  });
});



app.get('/about', function(req, res) {
  res.render('about',{
    menu: getMenu(req),
    login:req.session.user_id?req.session.user_id:false,
    user_name:req.session.user_first_name,
  });
});

app.get('/error-page', function(req, res) {
  res.render('error-page');
});

app.get("/forgotpassword", function(req,res){
  res.render("forgotpassword", {
    menu: getMenu(req)
  });
});

app.post("/get_app_info", function(req, res) {
  sql1="SELECT * FROM edits WHERE id = 1";
  connect(function(con){
    con.query(sql1, function(err, results) {
      if (err) {
        console.log(err);
        res.send({success:false});
      }
      else {
        res.send({success: results});
      }
    });
  });
});

app.get('/edit', function(req, res) {
  if(req.session.is_admin){
    res.render('edit', {
       menu: getMenu(req),
       admin:req.session.is_admin,
       login:req.session.user_id?req.session.user_id:false,
       user_name:req.session.user_first_name,
     });
  }else {
    res.redirect(303, ".");
  }
});

//upload font picture.
app.post("/upload_font-image",function(req,res){
  if (req.session.is_admin) {
    var form = new formidable.IncomingForm();
    form.parse(req,function(err, fields, files) {
      if (err) {
        console.log(err);
        res.redirect(303, "error-page");
      }
      else {
        if(fields) {
          if(files.photo.type == "image/jpeg" ||files.photo.type == "image/png"||files.photo.type == "image/gif" ) {
            var buf = fs.readFileSync(files.photo.path).toString("base64");
            connect(function(con) {
              var query = "UPDATE edits SET photo=?  WHERE id=?";
              var values = [buf,1];
              con.query(query, values, function(err, result,fields){
                if(err) {
                  console.log(err);
                  res.redirect(303,'edit');
                }
                if(result) {
                  console.log("img loaded with success!");
                  res.redirect(303,'edit');
                }else {
                  console.log(err);
                  res.redirect(303,'edit');
                }
              });
            });
          } else {
            var message = "This format is not allowed , please upload file with '.png','.gif','.jpg'";
             res.redirect(303,'edit');
          }
        }
      }
    });
  }
  else {
    res.redirect(303, ".");
  }
});

//make changes from edit page
app.post("/edit_page", function(req, res) {
  q="UPDATE edits SET ";
  var firstcondition= true;
  for (var property in req.body) {
    var value = req.body[property];
    if (value !== "") {
      if (firstcondition) {
	firstcondition = false;
      }
      else {
        q += ", ";
      }
      //q +=  property+ " = " + '"'+value+'"';
      q +=  property+ " = " + mysql.escape(value);
    }
  }
  q += " WHERE id = 1;";
  console.log(q);
  connect(function(con){
    con.query(q, function(err, results) {
      if (err) {
        console.log(err);
        res.redirect(303, "error-page");
      }
      else {
        res.redirect(303, ".");
      }
    });
  });
});


app.get("/search_fous", function(req,res){
  if(req.session.is_admin){
    res.render("search_fous",{
      admin:req.session.is_admin,
      user_name:req.session.user_first_name,
      menu: getMenu(req),
      login:req.session.user_id?req.session.user_id:false,
      });
  }else {
    res.render("search_fous",{
      admin:req.session.is_admin,
      user_name:req.session.user_first_name,
      menu: getMenu(req),
      login:req.session.user_id?req.session.user_id:false,
    });
  }
});

app.get("/search", function(req,res){
  if(req.session.is_admin){
    res.render("search",{
      admin:req.session.is_admin,
      user_name:req.session.user_first_name,
      menu: getMenu(req),
      login:req.session.user_id?req.session.user_id:false,
      emailUser:credentials.emailUser || "none@address.com",
      });
  }else {
    res.render("search",{
      admin:req.session.is_admin,
      user_name:req.session.user_first_name,
      menu: getMenu(req),
      login:req.session.user_id?req.session.user_id:false,
      emailUser:credentials.emailUser || "none@address.com",
    });
  }
});

app.post('/search-actors', function(req, res) {
         var height_min= req.body.height_min;
        var height_max= req.body.height_max;
         var weight_min = req.body.weight_min;
        var weight_max = req.body.weight_max;
         var hair = req.body.hair;
         var shoe_size_min = req.body.shoe_size_min;
          var shoe_size_max = req.body.shoe_size_max;

  var property2type = {
        height: "number",
        height_min: "number",
        height_max: "number",
        weight_min: "number",
        weight_max: "number",
        shoe_size_min: "number",
        shoe_size: "number",
        shoe_size_max: "number",
        car_year_min: "number",
        car_year_max: "number",
        year: "number",
        coat_size_min: "number",
        coat_size_max: "number",
        jacket_size: "number",
        dress_size_min: "number",
        dress_size_max: "number",
        dress_size: "number",
        age_min: "number",
        age_max: "number"
  };

  var sql = "SELECT DISTINCT users.*, FLOOR(DATEDIFF(CURDATE(), actors.birthday ) / 365.25) AS age, actors.*, images.*, cars.* FROM users LEFT OUTER JOIN actors ON users_id= users.id LEFT OUTER JOIN images ON users_id = images.actors_users_id LEFT OUTER JOIN cars ON users_id = cars.actors_users_id WHERE";
  var firstcondition = true;
  for (var property in req.body) {
    var value = req.body[property];
    if (value !== "") {
      if (firstcondition) {
        firstcondition = false;
      }else {sql += " AND"}
      sql += " " + property + (property.endsWith("_min") ? " >= " : property.endsWith("_max") ? " <= " : " = ") + (property2type[property] === undefined ? "'" : "") + value + (property2type[property] === undefined ? "'" : "");
    }
  }
  sql = sql.replace(/height_max|height_min/gi,"height");
  sql = sql.replace(/weight_max|weight_min/gi,"weight");
  sql = sql.replace(/shoe_size_max|shoe_size_min/gi,"shoe_size");
  sql = sql.replace(/car_year_max|car_year_min/gi,"year");
  sql = sql.replace(/coat_size_max|coat_size_min/gi,"jacket_size");
  sql = sql.replace(/dress_size_max|dress_size_min/gi,"dress_size");
  sql = sql.replace(/fname/gi,"first_name");
  sql = sql.replace(/lname/gi,"last_name");
  sql = sql.replace(/age_max|age_min/gi,"age");
  sql+=" group by users.id";
  console.log(sql);
  connect(function(con){
    con.query(sql, function(err, results) {
      if (err) {
        console.log(err);
        res.send({success:false});
      }
      else {
        res.send({success: results});
      }
    });
  });
});

app.get("/addUser", function(req,res){
  res.render("addUser",{
    menu: getMenu(req),
    admin:req.session.is_admin,
    login:req.session.user_id?req.session.user_id:false,
    user_name:req.session.user_first_name,
  });
});

app.get("/logout", function(req,res){
  delete req.session.user_id;
  delete req.session.is_admin;
  delete req.session.user_first_name;
  res.redirect(303, ".");
});
app.get('/add_actor', function(req, res) {
  if(req.session.is_admin){
    res.render('add_actor', {
       menu: getMenu(req),
       admin:req.session.is_admin,
       login:req.session.user_id?req.session.user_id:false,
       user_name:req.session.user_first_name,
     });
  }else {
    res.redirect(303, ".");
  }
});
app.get('/shared-search-result', function(req, res){
  var query_link = req.query.id;
  connect(function(con){
    var email = req.body.email;
    var sql = "SELECT *, DATEDIFF(CURDATE(),time) as link_age FROM shared WHERE link = '"+query_link+"';";
    con.query(sql, function(err, results, field) {
      if (err) {
        console.log(err);
        res.redirect(303, "error-page");
      }
      else {
        if (results[0]) {
          res.render("shared-search-result", {
            menu: getMenu(req),
            valid:true,
            valid_time:(results[0].link_age<=0? true:false),
            admin:req.session.is_admin,
            login:req.session.user_id?req.session.user_id:false,
            user_name:req.session.user_first_name,
            data:results[0].data,
          });
        }
        else {
          res.render("shared-search-result", {
            menu: getMenu(req),
            valid:false,
            admin:req.session.is_admin,
            login:req.session.user_id?req.session.user_id:false,
            user_name:req.session.user_first_name,
            shared_link:query_link,
          });
        }
      }
    });
  });
});

app.get('/reset-password-hidden-page', function(req, res){
  var query_link = req.query.id, user_id=req.query.id0;
  connect(function(con){
    var sql = "SELECT *, DATEDIFF(CURDATE(),time) as link_age FROM reset WHERE link = '"+query_link+"';";
    con.query(sql, function(err, results, field) {
      if (err) {
        console.log(err);
        res.redirect(303, "error-page");
      }
      else {
        if(results[0]){
          console.log("already reset",results[0].reset);
          res.render("reset-password-hidden-page",{
            menu: getMenu(req),
            valid:true,
            valid_time:(results[0].link_age<=0? (results[0].reset?false:true):false),
            admin:req.session.is_admin,
            login:req.session.user_id?req.session.user_id:false,
            user_name:req.session.user_first_name,
            data:results[0].data,
            link:query_link,
            id:user_id,
          });
        }else {
          res.render("reset-password-hidden-page",{
            menu: getMenu(req),
            valid:false,
            admin:req.session.is_admin,
            login:req.session.user_id?req.session.user_id:false,
            user_name:req.session.user_first_name,
          });
        }
      }
    });
  });
});

app.post("/login", function(req,res){
  connect(function(con){
    req.check('email','invalid email address').isEmail();
    var errors = req.validationErrors();
    if( errors){
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var email=req.body.email;
      var password=req.body.password;

        var q  ="SELECT * FROM users WHERE email = ?";
        try {
          con.query(q, [email], function (err, result, fields) {
            if (err) {
              console.log(err);
              res.send({success:false});
            }
            else {
              if(result[0]){
                var salt = result[0].salt;
                // console.log(salt, " match with salt from DB");

                var passwordData = sha512(req.body.password, salt);
                if(result[0].password === passwordData.passwordHash){
                   req.session.user_id = result[0].id;
                   req.session.is_admin = result[0].is_admin;
                   req.session.user_first_name = result[0].first_name;
                   req.session.cookie.maxAge = 9000000;

                   res.send({success:true});
                }else {
                    // res.redirect(303,'/error-page');
                    res.send({password:password,email:email});
                }
              }else {
                res.send({password:password,email:email});
                 // res.redirect(303,'/error-page');
              }
            }
          });
        }catch (err) {
          console.log(err, " Error in login.post function");
        }
    }
  });
});

// To check if user already exists

app.post('/check-email', function(req, res){
  connect(function(con){
    var email = req.body.email;
    var sql = "SELECT email,first_name,id FROM users WHERE email = ?";
    con.query(sql, [email],function(err, results, field) {
      if (err){
        res.send({success:false});
      }
      if(results[0]){
        if(results[0].email) {
          res.send({success:{email:results[0].email,first_name:results[0].first_name,id:results[0].id}});
        }else{
          res.send({success:false});
        }
      }else {
        res.send({success:false});
      }

    });
  });
});
app.post("/upload_image_for_actor",function(req,res){
  var form = new formidable.IncomingForm();
  var files=[],fields={},cust_id=false,failed=0,success=0;
  form.multiples = true;
  form.on('field', function(field, value) {
      fields[field]=value;
  })
  form.on('file', function(field, file) {
      files.push(file);
  })
  form.on('end', function() {
      var cust_id = fields.CustomerId;
      if(files.length >0 && cust_id){
        for(var i =0; i< files.length; i++){
          var file = files[i];
          if(file.type == "image/jpeg" ||file.type == "image/png"||file.type == "image/gif" ){
            var buf = fs.readFileSync(file.path).toString("base64");//real image
            Jimp.read(file.path, function (err, lenna) {
              if (err) {
                console.log(err);
                res.send({success:false});
              }
              else {
                var maxwh = 350;
                var width = lenna.bitmap.width;
                var height = lenna.bitmap.height;
                if (width <= maxwh || height <= maxwh) {
                  var newwidth = width;
                  var newheight = height;
                }
                else if (width <= height) {
                  var newwidth = maxwh;
                  var newheight = Math.round(height / (width / maxwh));
                }
                else {
                  var newwidth = Math.round(width / (height / maxwh));
                  var newheight = maxwh;
                }
                lenna.resize(newwidth, newheight)
                  .getBase64( Jimp.AUTO, function(err,thumbnail){
                    connect(function(con){
                      var query = "INSERT INTO images(image,actors_users_id,thumbnail) VALUES(?,?,?)";
                      var values = [buf,cust_id,thumbnail];
                      con.query(query, values, function(err, result,fields){
                        if (err) {
                          console.log(err);
                          res.send({success:"false query"});
                        }
                        else {
                            res.send({success:true});
                        }
                      });
                    });
                  });
              }
            });
          } else {
            res.send({success:"This format is not allowed"});
          }
        }
      }else {
        res.send({success:false});
      }
  });
  form.parse(req);
});
app.post('/add-multiple-users', function(req, res){
  function buildQueryActors(actors,user_id){
    var actors_keys = Object.keys(actors);
    var values=[user_id], str="users_id", val="?";
    for(var i =0; i< actors_keys.length; i++){
      if(actors[actors_keys[i]].trim().length>0){
        str+=(",")+actors_keys[i];
        val+=(",")+"?";
        values.push(actors[actors_keys[i]]);
      }
    }
    return {str:"INSERT INTO actors ("+str+")"+"Values("+val+");",vals:values};
  }
  function buildQuery(feat,user_id,con){
    var feature = req.body[feat];
    for(var i =0; i<feature.length; i++){
      if(feature[i].trim().length>0){
        var str ="INSERT INTO "+feat+" (actors_users_id,"+feat+") VALUES(?,?)";
        var vals =[user_id,feature[i]];
          con.query(str, vals, function(err, results) {
            if(err){
              console.log(err);
            }
          });
      }
    }
  }
  function buildQueryCars(user_id,con){
    var cars = req.body.cars;
    var cars_keys=Object.keys(cars);
    if(typeof cars[cars_keys[0]] ==="object"){
      var limit = cars[cars_keys[0]].length;
        for(var i =0; i<limit; i++){
          if(cars["make"][i].trim().length>0 || cars["color"][i].trim().length>0 || cars["year"][i].trim().length>0){
            var str ="INSERT INTO cars(actors_users_id, make,color,year) VALUES(?,?,?,?)";
            var vals =[
                user_id,
                (cars["make"][i].trim().length>0?cars["make"][i].trim():"unanswered"),
                (cars["color"][i].trim().length>0?cars["color"][i].trim():"unanswered"),
                (cars["year"][i].trim().length>0?cars["year"][i].trim():"unanswered"),
            ];
            con.query(str, vals, function(err, results) {
              if(err){
                console.log(err);
              }
            });
          }
        }
    }else {
      if(cars["make"].trim().length>0 || cars["color"].trim().length>0 || cars["year"].trim().length>0){
        var str ="INSERT INTO cars(actors_users_id, make,color,year) VALUES(?,?,?,?)";
        var vals =[
            user_id,
            (cars["make"].trim().length>0?cars["make"].trim():"unanswered"),
            (cars["color"].trim().length>0?cars["color"].trim():"unanswered"),
            (cars["year"].trim().length>0?cars["year"].trim():"unanswered"),
        ];
        con.query(str, vals, function(err, results) {
          if(err){
            console.log(err);
          }
        });
      }
    }
  }



  connect(function(con){
    req.assert('users[first_name]', 'Name is required').notEmpty();
    var salt = genRandomString(16);
    var passwordData = sha512(req.body.users.password, salt);
    var sql = "INSERT INTO users (first_name, last_name, email, password, salt, is_admin, sex) VALUES (?, ?, ?, ?, ?, ?, ?);";
    var values = [req.body.users.first_name, req.body.users.last_name, req.body.users.email, passwordData.passwordHash, passwordData.salt, (req.body.is_admin.toLowerCase()==="yes"?1:0), req.body.users.sex];
    con.query(sql, values, function(err, results) {
      //console.log(results.insertId);
      if (err){
        console.log(err);
        res.send("error-page-users");
      }
      else {
        if (results.insertId) {
          var users_id =results.insertId;
          var actors_query=buildQueryActors(req.body.actors,users_id);
          con.query(actors_query.str, actors_query.vals, function(err, results) {
            if (err){
              console.log(err);
              res.send("error-page");
            }else {
              buildQuery("skills",users_id,con);
              buildQuery("dances",users_id,con);
              buildQuery("wardrobes",users_id,con);
              buildQuery("characteristics",users_id,con);
              buildQuery("musicienship",users_id,con);
              buildQuery("sports",users_id,con);
              buildQueryCars(users_id,con);
              res.send({id:users_id});
            }
          });
        }
        else {
          console.log("Error Redirecting pages");
          res.send('error-page results.insertId');
        }
      }
    });
  });
});
app.post('/check_email', function(req, res){
  connect(function(con){
    var email = req.body.email;
    var sql = "SELECT COUNT(id) FROM users WHERE email = '"+email+"';";
    try {
      con.query(sql, function(err, results, field) {
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          if(results[0]["COUNT(id)"] <  1) {
            // Email is valid not in DB yet
            res.send("");
          }else{
            //console.log("Existing Email is attempted to be entered");
            res.send("Email Already Used.");
          }
        }
      });
    }catch (err) {
      console.log(err, " Error in check_email.post function");
    }
  });
});



// To add new user
app.post('/addUser', function(req, res){
  connect(function(con){
    req.assert('first_name', 'Name is required').notEmpty();
    var salt = genRandomString(16);
    var passwordData = sha512(req.body.password, salt);
    var sql = "INSERT INTO users (first_name, last_name, email, password, salt, is_admin, sex) VALUES (?, ?, ?, ?, ?, ?, ?);";
    var values = [req.body.first_name, req.body.last_name, req.body.email, passwordData.passwordHash, passwordData.salt, 0, req.body.sex];
    con.query(sql, values, function(err, results) {
      //console.log(results.insertId);
      if (err){
        console.log(err);
        res.redirect(303, "error-page");
      }
      else {
        if (results.insertId) {
          // Redirects new user to their own page
          //console.log("New record created successfully. Last inserted ID is: " + results.insertId);
          req.session.user_id = results.insertId;
          req.session.user_first_name = req.body.first_name;
          req.session.cookie.maxAge = 9000000;
          res.redirect(303, 'user');
        }
        else {
          console.log("Error Redirecting pages");
          res.redirect(303, 'error-page');
        }
      }
    });
  });
});

app.post('/delete-in-database', function(req, res){
  var table = req.body.table;
  var id = req.body.table_id;
  connect(function(con){
    var sql = "DELETE FROM "+table+" WHERE id =?";
    con.query(sql,[id],function(err, result) {
      if (err) {
        console.log(err);
        res.send({success:false});
      }
      else {
        if (result) {
          res.send({success:{deleted_id:id,target:table} });
        }
      }
    });
  });
});

app.post('/update-other-info', function(req, res){
  if (req.session.user_id) {
    var table = req.body.table;
    var value = req.body.value;
    connect(function(con){
      var query = "INSERT INTO "+table+" ("+table+",actors_users_id) VALUES(?,?)";
      con.query(query,[value,req.session.user_id],function(err, result) {
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          if (result) {
            res.send({success:{insertId:result.insertId,insertedValue:value}});
          }
        }
      });
    });
  }
  else {
    res.send({success:false});
  }
});

app.post('/process-search', function(req, res) {
  var search = req.body.search;
  var q = "SELECT * FROM users WHERE first_name LIKE '%" + search +"%'";
  connection.query(q, function(err, results) {
    if (err) {
      console.log(err);
      res.send({success:false});
    }
    else {
      res.send({success: results});
    }
  });
});

app.post("/update-user-info", function(req,res){
  if (req.session.user_id) {
    var table = req.body.table_name;
    if (req.body.request_type === 'admin_request') {
      var q = "UPDATE "+req.body.table_name+" SET "+req.body.target+"='"+req.body.value+"' WHERE id = '"+ req.body.id+"';"
      connect(function(con){
        con.query(q, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success:false});
          }
          else {
            if (result) {
              res.send({success:result});
            }
            else {
              res.send({success:false});
            }
          }
        });
      });
    }
    else {
      if(table!=="undefined"){
        for(key in req.body ){
          if(key!=="table_name"){
                 if(key ==="password"){
                   var current_pass = req.body[key].current_password,new_pass = req.body[key].new_password,confirm_pass=req.body[key].confirm_password;
                   connect(function(con){
                     con.query("SELECT password, salt FROM users WHERE id = ?",[req.session.user_id], function (err, result, fields) {
                       if (err) {
                         console.log(err);
                         res.send({success:false});
                       }
                       else {
                         if(result[0]){
                           var password_entered = sha512(current_pass, result[0].salt);
                           if((result[0].password===password_entered.passwordHash) && (confirm_pass===new_pass) && confirm_pass.length>0){
                             var salt = genRandomString(16);
                             var passwordData = sha512(new_pass, salt);
                             console.log("new: ",new_pass);
                             //var q = "UPDATE users SET password='"+confirm_pass+"' WHERE id = '"+ req.session.user_id+"';";
                             var q = "UPDATE users SET password=?,salt=? WHERE id = ?";
                             connect(function(con){
                               con.query(q, [passwordData.passwordHash, passwordData.salt, req.session.user_id], function (err, result, fields) {
                                 if (err) {
                                   console.log(err);
                                   res.send({success:false});
                                 }
                                 else {
                                   if(result){
                                     res.send({success:"succes"});
                                   }else {
                                      res.send({success:false});
                                   }
                                 }
                               });
                             });
                           }else {
                            // console.log("dennied incorrect credentials");
                             res.send({success:false});
                           }
                         }else {
                            res.send({success:false});
                         }
                       }
                     });
                   });
                 }else if (key ==="cars") {
                   //console.log("changing carsx info",req.body);
                   if(req.body.cars.make && req.body.cars.color && req.body.cars.year){
                    // console.log("running the query");
                    var new_record=false, make = req.body.cars.make, color=req.body.cars.color, year = req.body.cars.year, car_id = req.body.cars.id;
                       if(req.body.cars.id !=="undefined"){
                         var q = "UPDATE cars SET make='"+req.body.cars.make+"', color='"+req.body.cars.color+"' ,year='"+req.body.cars.year+"' WHERE id = '"+ req.body.cars.id+"';";
                       }else {
                         new_record = true;
                         var q = "INSERT INTO cars (make,color,year,actors_users_id) VALUES('"+req.body.cars.make+"','"+req.body.cars.color+"','"+req.body.cars.year+"','"+req.session.user_id+"')";
                       }

                       connect(function(con){
                         con.query(q, function (err, result, fields) {
                           if (err) {
                             console.log(err);
                             res.send({success:false});
                           }
                           else {
                             if(result){
                               console.log("cars info", result.insertId);
                               //res.send({success:"succes"});
                               res.send({success:{target:"cars",new_record:new_record,new_insertedId:result.insertId, data:{make:make,color:color,year:year,id:car_id}}});
                             }else {
                                res.send({success:false});
                             }
                           }
                         });
                       });
                   }else {
                            res.send({success:false});
                   }

                 }

                 else {
                   var target = key,value=req.body[key];
                   var id = (table==="users"?"id":"users_id");
                   //console.log("in table:",table," change",target," to  ",value);
                    connect(function(con){
                          var query = "UPDATE "+table+" SET "+target+"='"+value+"' WHERE "+id+" = '"+ req.session.user_id+"';";
                      con.query(query, function (err, result, fields) {
                        if (err) {
                          console.log(err);
                          res.send({success:false});
                        }
                        else {
                          if(result){
                            res.send({success:{column_changed:target, value:value}});
                          }else {
                            res.send({success:false});
                          }
                        }
                      });
                    });
                 }
           }
        }
      }
    }
  }else {
    res.send({success:false});
  }

});

var voids = {"salt":true,"password":true,"is_admin":true,"id":true,"users_id":true,"admin_request":true,"image":true,"car_make":true,"car_color":true,"car_year":true,"car_id":true,"car_owner_id":true};
var users_info_names={"first_name":true,"last_name":true,"sex":true,"email":true};
var actors_info_names={"first_name":true,"last_name":true,"sex":true,"email":true};
var measurements ={"weight":true,"height":true,"neck_size":true,"sleeve_size":true,"waist_size":true,"inseam_size":true,"dress_size":true,"jacket_size":true,"shoe_size":true,"bust_size":true,"chest_size":true,"hip_size":true,"hat_size":true,}

app.get("/user", function(req,res){
  if(req.session.user_id){
    var qtest ="SELECT u.* ,a.*, c.make as car_make, c.color as car_color, c.year as car_year, c.id as car_id, c.actors_users_id as car_owner_id  FROM users as u LEFT JOIN actors a ON u.id = a.users_id LEFT JOIN cars c on a.users_id = c.actors_users_id  WHERE u.id =?";
    //var query ="SELECT * FROM users LEFT JOIN actors ON users.id = actors.users_id  WHERE id = '"+req.session.user_id+"'  ";
    connect( function(con){
      con.query(qtest, [req.session.user_id],function (err, result, fields) {
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          //get cars
          var cars =[];
          for(var i =0; i<result.length; i++){
            if(result[i].car_make || result[i].car_year||result[i].car_color || result[i].car_id ){
              cars.push({
                make:result[i].car_make,
                year:result[i].car_year,
                color:result[i].car_color,
                id :result[i].car_id,
              });
            }
          }
          if(result[0]){
            req.session.is_actor = result[0].users_id;
            var info={
              user_name: result[0].first_name,
              login:req.session.user_id?req.session.user_id:false,
              user_info:[],
              actor_info:[],
              is_admin:result[0].is_admin,
              admin_request : result[0].admin_request,
              all_users:[],
              users_id:result[0].users_id,
              actors_measurement:[],
              emergency_name:result[0].emergency_name,
              emergency_number:result[0].emergency_number,
              cars:(cars.length>0?cars:false),
            };

            for(key in result[0]){
              if(users_info_names[key]){
                //user info only
                info.user_info.push({name:key,label:upperCaseFirstLetter(key), value:result[0][key]});
              }
              else if (measurements[key]) {
                //actors measurements only
                if(key ==="height"){
                  info.actors_measurement.push({name:key,label:upperCaseFirstLetter(key), value:getHeightInFeet(result[0][key])});
                }else {
                  info.actors_measurement.push({name:key,label:upperCaseFirstLetter(key), value:result[0][key]});
                }
              }else if (!voids[key]) {
                //actors others info only
                var value = result[0][key];
                if(key ==='birthday' && value){ //rearange date format
                  var new_value = result[0][key].split("-");
                   value = new_value[1]+"-"+new_value[2]+"-"+new_value[0];
                }
                  info.actor_info.push({name:key,label:upperCaseFirstLetter(key), value:value});
              }
            }
            if(result[0].is_admin){
              info["menu"] = getMenu(req);
              con.query("SELECT first_name,last_name,sex, is_admin, id FROM users", function (err, result, fields){
                if (err) {
                  console.log(err);
                  res.send({success:false});
                }
                else {
                  for(rs in result) {
                    info.all_users.push(result[rs]);
                  }
                }
             });
           }else {
             info["menu"] = getMenu(req);
           }
            res.render("user",info);
          }
        }
      });
    });
  }
  else {
    res.redirect(303, ".");
  }
});





app.post("/search_database",function(req,res){
  var array_data = [];
  var data = req.body, count =0, query ="SELECT users.id FROM users LEFT JOIN actors ON  users.id = actors.users_id LEFT JOIN cars ON  users.id = cars.actors_users_id LEFT JOIN skills ON  users.id = skills.actors_users_id LEFT JOIN dances ON  users.id = dances.actors_users_id LEFT JOIN sports ON  users.id = sports.actors_users_id LEFT JOIN wardrobes ON  users.id = wardrobes.actors_users_id LEFT JOIN characteristics ON  users.id = characteristics.actors_users_id LEFT JOIN musicienship ON  users.id = musicienship.actors_users_id  WHERE ";
  for(key in data){
      if((data[key].min && parseInt(data[key].min)) || (data[key].max && parseInt(data[key].max))){
        if(data[key].table ==="age"){
           query+= (count ===0?"":" AND ")+"DATEDIFF(CURDATE(),actors.birthday) >= ? AND DATEDIFF(CURDATE(),actors.birthday) <=?";
           array_data.push((data[key].min?data[key].min/0.0027397260273973:0/0.0027397260273973),(data[key].max?data[key].max/0.0027397260273973:10000/0.0027397260273973));
            //console.log((count ===0?"":" AND ")+"DATEDIFF(CURDATE(),actors.birthday) >= "+(data[key].min?data[key].min/0.0027397260273973:0/0.0027397260273973)+" AND DATEDIFF(CURDATE(),actors.birthday) <="+(data[key].max?data[key].max/0.0027397260273973:10000/0.0027397260273973));
           count++;
        }else {
          query+= (count ===0?"":" AND ")+data[key].table+"."+key+" >= ? AND "+data[key].table+"."+key+"<=?";
          array_data.push((data[key].min?data[key].min:0),(data[key].max?data[key].max:1000));
          count++;
        }
      }
      else if(data[key][key]){
        query+= (count ===0?"":" AND ")+data[key].table+"."+key+" = ?";
        array_data.push(data[key][key]);
        count++;
      }
      else if(data[key]["text"]){
        // process the text
        var ands = data[key]["text"].split(" and "),ors = data[key]["text"].split(" OR ");
        if(ors.length>1){
          console.log("Ors",ors);
          var q = (count ===0?"":" AND ")+"(";
          for(var z=0; z<ors.length;z++){
             q += data[key].table+"."+key+" =? "+(z===ors.length-1?"":"OR ")+"";
             array_data.push(ors[z].trim());
          }
          q+=")";
          query+=q;
          count++;
        }else if (ands.length>1) {
            console.log("ands",ands);
          var q0 = (count ===0?"":" AND ")+data[key].table+"."+key+" = ANY ( ";
          var q = "SELECT "+key+" FROM "+data[key].table+" WHERE ";
          var z_count =0;
          for(var z=0; z<ands.length;z++){
               q+= (z_count ===0?"":" AND ")+key+" =? "+(z===ands.length-1?"":"AND ");
              array_data.push(ands[z].trim());
          }
          query+=q0+q+")";
          count++;
        }else {
            console.log("else");
           query+= (count ===0?"":" AND ")+data[key].table+"."+key+" = ?";
           array_data.push(data[key]["text"]);
           count++;
        }
      }
  }

  query+= " GROUP BY users.id";
 //console.log(query, array_data);
 //res.send({success:false});
  if(count>0){
    connect(function(con){
      con.query(query,array_data, function (err, result, fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          //console.log(result);
          res.send({success:result, query:data});
        }
     });
    });
  }else {
    query ="SELECT users.id FROM users LEFT JOIN actors ON  users.id = actors.users_id LEFT JOIN cars ON  users.id = cars.actors_users_id GROUP BY users.id";
    connect(function(con){
      con.query(query, function (err, result, fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          //console.log(result);
          res.send({success:result, query:data});
        }
     });
    });
  }
});

app.get("/results.pdf", function(req, res) {
  if (req.session.user_id) {
    createPDF(req, res);
  } else {
    res.status(404);
    res.render("404");
  }
});

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 16; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function createPDF(req, res) {
  var ids = req.query.ids.split(",");
  var query = "SELECT distinct u.id, u.first_name, u.last_name, a.height, a.weight, a.neck_size, a.sleeve_size, a.waist_size, a.inseam_size, a.shoe_size FROM users as u LEFT JOIN actors a ON u.id=a.users_id WHERE u.id in (" + ids.join(",") + ")";
  connect(function(con){
    con.query(query, function(err,result,fields) {
      if (err) {
        console.log(err);
        //res.send({success:false});
      }
      else {
        var info = result;
        var query2 = "SELECT users.id, images.thumbnail FROM images left join users on users.id = images.actors_users_id WHERE actors_users_id in (" + ids + ")";
        con.query(query2, function(err, result2,fields) {
          if (err) {
            console.log(err);
            //res.send({success:false});
          }
          else {
            //res.send({success:{info:info,thumbnails:result2}});

            var data = {success:{info:info,thumbnails:result2}};

            var PDFDocument = require("pdfkit");
            var pdf = new PDFDocument({
              layout: "landscape"
            });
            res.writeHead(200, {
              "Content-Type": "application/pdf"
            });
            pdf.pipe(res);
            var maxwidth = 792;
            var maxheight = 612;

            function nextPage(i) {
              if (i >= data.success.info.length) {
                pdf.end();
              }
              else {
                if (i > 0) {
                  pdf.addPage();
                }

                function nextImage(j, cnt, images) {
                  if (j >= data.success.thumbnails.length || cnt >= 2) {
                    if (images.length >= 1) {
                      var x1 = images[0].image.bitmap.width;
                      var y1 = images[0].image.bitmap.height;
                    }
                    if (images.length >= 2) {
                      var x2 = images[1].image.bitmap.width * (y1 / images[1].image.bitmap.height);
                      var y2 = y1;
                    }
                    else {
                      var x2 = 0;
                      var y2 = y1;
                    }

                    var scale = Math.min((792-190)/(x1+x2), (maxheight-20)/y1);
                    if (images.length >= 1) {
                      x1 *= scale;
                      y1 *= scale;
                    }
                    if (images.length >= 2) {
                      x2 *= scale;
                      y2 *= scale;
                    }

                    if (images.length >= 1) {
                      pdf.image(images[0].thumbnail, 170, maxheight/2 - y1/2, {width: x1, height: y1}); //{fit: [250,250]});
                    }
                    if (images.length >= 2) {
                      pdf.image(images[1].thumbnail, 180+x1, maxheight/2 - y1/2, {width: x2, height: y2}); //{fit: [250,250]});
                    }

                    pdf.fontSize(25);
                    var text = data.success.info[i].first_name + "\n" + data.success.info[i].last_name + "\n";
                    pdf.text(text, 10, !images.length ? 10 : maxheight/2 - y1/2, {width:150});

                    pdf.fontSize(20);
                    text = "\n" +
                      "Height: " + (getHeightInFeet(data.success.info[i].height) || "") + "\n" +
                      "Weight: " + (data.success.info[i].weight || "") + "\n" +
                      "Collar: " + (data.success.info[i].neck_size || "") + "\n" +
                      "Sleeve: " + (data.success.info[i].sleeve_size || "") + "\n" +
                      "Waist: " + (data.success.info[i].waist_size || "") + "\n" +
                      "Inseam: " + (data.success.info[i].inseam_size || "") + "\n" +
                      "Shoes: " + (data.success.info[i].shoe_size || "") + "\n";
                    pdf.text(text, {width:150});
                    setTimeout(function() {
                      nextPage(i+1);
                    }, 0);
                  }
                  else {
                    if (data.success.info[i].id !== data.success.thumbnails[j].id) {
                      nextImage(j+1, cnt, images);
                    }
                    else {
                      var imgtype = data.success.thumbnails[j].thumbnail.substring(0, data.success.thumbnails[j].thumbnail.indexOf(","));
                      Jimp.read(Buffer.from(data.success.thumbnails[j].thumbnail.substring(data.success.thumbnails[j].thumbnail.indexOf(",") + 1), "base64"), function(err, image) {
                        if (err) {
                          console.log(err);
                        }
                        else {
                          images.push({
                            image: image,
                            thumbnail: data.success.thumbnails[j].thumbnail
                          });
                          nextImage(j+1, cnt+1, images);
                        }
                      });
                    }
                  }
                }
                nextImage(0, 0, []);
              }
            }
            nextPage(0);
          }
        });
      }
    });
  });
}

function getHeightInFeet(value) {
  var height = heights;
  for(var i = 0; i< height.length; i++) {
    if (height[i].cm ===value) {
      return height[i].feet;
    }
  }
}

function getAge(dateString) {
  if (!dateString) {
    return null;
  }
  var today = new Date();
  var birthDate = new Date(dateString);
  var age = today.getFullYear() - birthDate.getFullYear();
  var m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

app.post("/get-user-info-search",function(req,res){
  var ids = req.body.users_id, count =0, query ="SELECT users.*, actors.*,DATEDIFF(CURDATE(),actors.birthday) as age, (SELECT thumbnail FROM images WHERE users.id = actors_users_id LIMIT 1 ) as first_thumbnail, GROUP_CONCAT( cars.year,' ',cars.color,' ',cars.make SEPARATOR ',') as cars FROM users LEFT JOIN actors ON  users.id = actors.users_id LEFT JOIN cars ON  users.id = cars.actors_users_id WHERE ";
    for(var i =0; i< ids.length; i++ ){
          query+= (count ===0?"":" OR ")+"users.id = "+ids[i]+"";
          count++;
    }
    query+= " GROUP BY users.id";

  if(count>0){
    connect(function(con){
      con.query(query, function (err, result, fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          res.send({success:result});
        }
     });
    });
  }else {
    res.send({success:false});
  }
});

app.post("/get-search-bucket", function(req,res) {
  var ids = req.body.actors_ids;
  console.log(JSON.stringify(ids));
  var query = "SELECT users.*, actors.*,DATEDIFF(CURDATE(),actors.birthday) as age, (SELECT thumbnail FROM images WHERE users.id = actors_users_id LIMIT 1 ) as first_thumbnail, GROUP_CONCAT( cars.year,' ',cars.color,' ',cars.make SEPARATOR ',') as cars FROM users LEFT JOIN actors ON  users.id = actors.users_id LEFT JOIN cars ON  users.id = cars.actors_users_id ";
  if (ids.length > 0) {
    query += " WHERE ";
    for(var i = 0; i < ids.length; i++) {
      query += (i === 0 ? "" : " OR ") + "users.id=" + ids[i];
    }
  }
  query += " GROUP BY users.id";
  connect(function(con){
    con.query(query, function (err, result, fields){
      if (err) {
        console.log(err);
        res.send({success:false});
      }
      else {
        res.send({success:result});
      }
   });
  });
});


app.post("/get-shared-bucket",function(req,res){
  var ids = req.body.actors_ids, count =0, query ="SELECT users.*, actors.*,DATEDIFF(CURDATE(),actors.birthday) as age, (SELECT image FROM images WHERE users.id = actors_users_id LIMIT 1 ) as first_image, GROUP_CONCAT( cars.year,' ',cars.color,' ',cars.make SEPARATOR ',') as cars FROM users LEFT JOIN actors ON  users.id = actors.users_id LEFT JOIN cars ON  users.id = cars.actors_users_id WHERE ";
  for(var i =0; i< ids.length; i++ ){
        query+= (count ===0?"":" OR ")+"users.id = "+ids[i]+"";
        count++;
  }
  query+= " GROUP BY users.id";
  connect(function(con){
    con.query(query, function (err, result, fields){
      if (err) {
        console.log(err);
        res.send({success:false});
      }
      else {
        res.send({success:result});
      }
   });
  });
});

app.post("/get-sent-emails",function(req,res){
  if( req.session.user_id){
    var bucket_id = req.body.search_id;
    var query ="SELECT message,type, sender,subject,recipients,date FROM messages WHERE bucket_id=? AND searches_users_id=?";
    connect(function(con){
      con.query(query, [bucket_id,req.session.user_id],function (err, result, fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          res.send({success:result});
        }
     });
    });
  }else {
    res.send({success:false});
  }
});

app.post("/get-emails",function(req,res){
  var ids = req.body.actors_ids, ids_for_sharing= req.body.shared_actors_ids, count =0, query ="SELECT email FROM users WHERE ";

  if(ids){ //getting actors emails
    for(var i =0; i< ids.length; i++ ){
          query+= (count ===0?"":" OR ")+" id = "+ids[i]+"";
          count++;
    }
    query+= " GROUP BY id";
    connect(function(con){
      con.query(query, function (err, result, fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          res.send({success:result});
        }
     });
    });
  }else if(ids_for_sharing){
    res.send({success:"pass"});
  }
});


app.post("/send-emails",function(req,res){
  if(req.session.user_id){
    var sender = req.body.sender,to=req.body.to,text=req.body.text, subject=req.body.subject, data_tobe_shared =req.body.data_tobe_shared;
    //console.log("email is bucket with id ",(req.body.bucket_id==="false"?false:true));
    var bucket_id = (req.body.bucket_id==="false"?false:req.body.bucket_id);
    if(data_tobe_shared){
        var randomString = randomstring.generate(100);
        console.log(randomString,"data: ",data_tobe_shared,"date: ",new Date(),req.session.user_id);
        connect(function(con){
          var query = "INSERT INTO shared(link,data,time,email,users_id) VALUES(?,?,?,?,?)";
          var values = [randomString, JSON.stringify(data_tobe_shared) ,new Date(),to, req.session.user_id];
          con.query(query, values, function(err, result,fields){
            if (err) {
              console.log(err);
              res.send({success:false});
            }
            else {
              if(result){
                var mailOptions = {
                  from: sender,
                  bcc: to,
                  subject: subject,
                  text: text,
                  html: "<div><p style='color:red;'>"+req.session.user_first_name+" from LunaMISTA Movie Data Base want to share a  search result with you <a href='https://" + credentials.url + "/shared-search-result?id="+randomString+"'>click here to see it</a></p><br><br> <p>"+text+"</p></div>", // html bod
                }
                transporter.sendMail(mailOptions, function(error, info){
                  if (error) {
                    console.log(error);
                    res.send({success:false});
                  } else {
                    console.log('Email sent: ' + info.response);
                    if(bucket_id){
                      var qy = "INSERT INTO messages(searches_users_id,bucket_id,message,type,sender,subject,recipients,date) VALUES(?,?,?,?,?,?,?,?)";
                      connect(function(con){
                        con.query(qy,[req.session.user_id,parseInt(bucket_id),text,"shared",sender,subject,to,new Date()] ,function (err, result, fields){
                          if (err) {
                            console.log(err);
                            res.send({success:false});
                          }
                          else {
                            res.send({success:true});
                          }
                        });
                      });
                    }else {
                      res.send({success:true});
                    }
                  }
                });
              }
            }
          });
        });
    }else {
      var mailOptions = {
        from: sender,
        bcc: to,
        subject: subject,
        text: text,
        html: "<div><H1 style='color:red;'>LunaMISTA Movie Data Base</H1><br><img src='https://vignette.wikia.nocookie.net/angrybirdsfanon/images/b/b2/Movie.jpg/revision/latest?cb=20130804215834' style='width:100%; height:100px; '><br> <p>"+text+"</p></div>", // html bod

      }
      transporter.sendMail(mailOptions, function(error, info){
          if (error) {
            console.log(error);
            res.send({success:false});
          } else {
            console.log('Email sent: ' + info.response);
            //save message if it is a bucket
            if(bucket_id){
              var qy = "INSERT INTO messages(searches_users_id,bucket_id,message,type,sender,subject,recipients,date) VALUES(?,?,?,?,?,?,?,?)";
              connect(function(con){
                con.query(qy,[req.session.user_id,parseInt(bucket_id),text,"no_shared",sender,subject,to,new Date()] ,function (err, result, fields){
                  if (err) {
                    console.log(err);
                    res.send({success:false});
                  }
                  else {
                    res.send({success:true});
                  }
               });
              });
            }else {
              res.send({success:true});
            }
          }
     });
    }
  }else {
    res.send({success:false});
  }
});

app.post("/send-password-reset",function(req,res){
  var to=req.body.target_email, id = req.body.id;
  if(to){
      var randomString = randomstring.generate(100);
      connect(function(con){
        var query = "INSERT INTO reset(link,time,email) VALUES(?,?,?)";
        var values = [randomString,new Date(),to];
        con.query(query, values, function(err, result,fields){
          if (err) {
            console.log(err);
            res.send({success:false});
          }
          else {
            if(result){
              var mailOptions = {
                from: credentials.emailUser,
                to: to,
                subject: "Reset your Password",
                html: "<div><p style='color:black'> A request was made from this account to reset password Please click on this link to reset your password <a href='https://" + credentials.url + "/actors/reset-password-hidden-page?id0="+id+"&id="+randomString+"'> here </a></p><br><br> </div>", // html bod
              }
              transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                  res.send({success:false});
                } else {
                  console.log('Email sent: ' + info.response);
                  res.send({success:true});
                }
              });
            }
          }
        });
      });
  }
});



app.post("/reset-from-hidden-page",function(req,res){
  var password = req.body.password, user_id =req.body.id, link=req.body.link;
  var salt = genRandomString(16);
  var passwordData = sha512(password, salt);
  var q = "UPDATE users SET password=?,salt=? WHERE id = ?";
  connect(function(con){
    con.query(q, [passwordData.passwordHash, passwordData.salt, user_id], function (err, result, fields) {
        if (err){
          res.send({success:false});
        }
        if(result){
            var q2 = "UPDATE reset SET reset=? WHERE link = ?";
          // set expired the link
          connect(function(con){
            con.query(q2,[1,link], function(err, results, field) {
              if (err){
                res.send({success:false});
              }
                if(results){
                  //log in now
                    var q3 = "SELECT is_admin,first_name,id FROM users WHERE id = ?";
                    connect(function(con){
                      con.query(q3,[user_id], function(err, result, field) {
                          if (err){
                            res.send({success:false});
                          }
                          else if(result){
                              req.session.user_id = result[0].id;
                              req.session.is_admin = result[0].is_admin;
                              req.session.user_first_name = result[0].first_name;
                              req.session.cookie.maxAge = 9000000;
                              res.send({success:true});
                          }else {
                            res.send({success:false});
                          }
                      });
                    });
                }else {
                  res.send({success:false});
                }
            });
          });
        }else {
           res.send({success:false});
        }
    });
  });
});


app.post("/save_search",function(req,res){
  if(req.session.user_id){
    if(req.body.overwrite_id!=="false"){ //overwriting an existing search
      var new_date = new Date();
       console.log("overwriting id ",req.body.overwrite_id);
       var query = "UPDATE searches SET bucket=?,users_id=?,title=?,search_query=?', last_update_date=? WHERE id = ?;";
       connect(function(con){
         con.query(query,[JSON.stringify(req.body.actor_ids),req.session.user_id,req.body.title,JSON.stringify(req.body.query),new_date,req.body.overwrite_id],function (err, result, fields){
           if (err) {
             console.log(err);
             res.send({success:false});
           }
           else {
             if(result){
               res.send({success:"overwrite an existing search"});
             }else {
               res.send({success:false});
             }
           }
         });
       });
    }
    else if(req.body.bucket_id){ //svaing the bucket
      console.log("this is a bucket so i will save it on its table");
      var query = "UPDATE searches SET bucket=?, last_update_date=? WHERE id = ?;";
      connect(function(con){
        con.query(query,[JSON.stringify(req.body.actor_ids),new Date(),req.body.bucket_id],function (err, result, fields){
          if (err) {
            console.log(err);
            res.send({success:false});
          }
          else {
            if(result){
              res.send({success:"saved bucket"});
            }else {
              res.send({success:false});
            }
          }
        });
      });
    }else {

      var query ="INSERT INTO searches(message, status, users_id,title,search_query,bucket,date,last_update_date) VALUES (?,?,?,?,?,?,?,?)";
      console.log(new_date);
      var values =[req.body.message,'pending', req.session.user_id, req.body.title, JSON.stringify(req.body.query),JSON.stringify(req.body.actor_ids),new Date(),new Date()];
      connect(function(con){
        con.query(query,values, function (err, result, fields){
          if (err) {
            console.log(err);
            res.send({success:false});
          }
          else {
            if(result){
              res.send({success:"saved search"});
            }else {
              res.send({success:false});
            }
          }
        });
      });
    }
  }else {
      res.send({success:false});
  }
});

app.post("/update-user-status-to-actor",function(req,res){
  if(req.session.user_id){
    connect(function(con){
      var query ="INSERT INTO actors (users_id) VALUES (?)";
      var values = [req.session.user_id];
      con.query(query,values, function (err, result, fields) {
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          if(result){
            res.send({success:true});
          }else {
            res.send({success:false});
          }
        }
      });
    });
  }else {
      res.send({success:false});
  }
});
app.post("/get-all-users",function(req,res){
  if(req.session.user_id){
    var query ="SELECT id,first_name,last_name,is_admin,email,sex,height,eye_color,weight,hair_color,hair_type,tattoo,piercings,facial_hair,us_citizen,neck_size,sleeve_size,waist_size,inseam_size,dress_size,jacket_size,shoe_size,bust_size,chest_size,hip_size,hat_size,union_status,union_number FROM users LEFT JOIN actors ON users.id = actors.users_id WHERE users.admin_request=1";
    var q = "SELECT first_name,last_name,sex, is_admin, id FROM users";
    connect(function(con){
      con.query(query, function (err, result, fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          res.send({success:result,admin_id:req.session.user_id});
        }
     });
    });
  }else {
    res.send({success:false});
  }
});

app.post("/get_user_images",function(req,res){
  if(req.session.user_id){
    connect(function(con){
      con.query("SELECT thumbnail,id FROM images WHERE actors_users_id ='"+req.session.user_id+"'", function(err, result,fields){
        if(err){
          res.send({success:false});
        }else {
          res.send({success:result});
        }
      })
    });
  }else {
    res.send({success:false});
  }
});

app.post("/get_user_others_info",function(req,res){
  if(req.session.user_id){
    var name =req.body.column;
    //GROUP_CONCAT( s.sports,' # ',s.id SEPARATOR '&') as sports, GROUP_CONCAT( c.characteristics,' # ',c.id SEPARATOR '&') as characteristics, GROUP_CONCAT( d.dances,' # ',d.id SEPARATOR '&') as dances,GROUP_CONCAT( w.wardrobes,' # ',w.id SEPARATOR '&') as wardrobes
    var query = "SELECT  target.id, target."+(name)+"  FROM users as u LEFT JOIN actors a ON u.id = a.users_id  LEFT JOIN "+name+" target on a.users_id = target.actors_users_id  WHERE u.id =? "
    connect(function(con){
      con.query(query, [req.session.user_id],function(err, result,fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          res.send({success:result,target_table:name});
        }
      })
    });
  }else {
    res.send({success:false});
  }
});

app.post("/get-history",function(req,res){
  if(req.session.user_id){
    connect(function(con){
      con.query("SELECT * FROM searches WHERE users_id ='"+req.session.user_id+"' ORDER BY id DESC;", function(err, result,fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          res.send({success:result});
        }
      })
    });
  }else {
    res.send({success:false});
  }
});

app.post("/get-buckets",function(req,res){
  if(req.session.user_id){
    var search_titles = req.body.search_titles;
    var count=0,query = "SELECT bucket,id FROM searches WHERE users_id ='"+req.session.user_id+"' AND"
    for(t in search_titles){
      console.log("titles",t);
      query+= (count ===0?"":" OR ")+" title = \'"+t+"\'";
      count++;
    }

    connect(function(con){
      con.query(query, function(err, result,fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          res.send({success:result});
        }
      })
    });
  }else {
    res.send({success:false});
  }
});

app.post("/get-profile",function(req,res){
  // if(req.session.user_id){
    var user_id = req.body.user_id;
    var query ="SELECT thumbnail FROM images WHERE actors_users_id =?";
    connect(function(con){
      con.query(query, [user_id],function(err, result,fields){
        if (err) {
          console.log(err);
          res.send({success:false});
        }
        else {
          var thumbnails = result;
          var query2 ="SELECT u.first_name, u.last_name,u.sex, u.email, a.birthday, a.height,a.eye_color,	a.weight,	a.hair_color,	a.hair_type,	a.tattoo,	a.piercings,	a.facial_hair,	a.us_citizen,	a.neck_size	,a.sleeve_size	,a.waist_size	,a.inseam_size	,a.dress_size	,a.jacket_size	,a.shoe_size	,a.bust_size	,a.chest_size	,a.hip_size	,a.hat_size	,a.union_status	,a.union_number	,a.emergency_name	,a.emergency_number	,a.ethnicity	,a.state	,a.city	,a.street	,a.zip	,a.home_phone	,a.cell_phone	,a.birthday FROM users as u LEFT JOIN actors a ON u.id = a.users_id WHERE u.id =?";
          con.query(query2, [user_id],function(err, result2,fields){
            if (err) {
              console.log(err);
              res.send({success:false});
            }
            else {
              res.send({success:{info:result2,thumbnails:thumbnails}});
            }
          });
        }
      })
    });
  // }else {
  //   res.send({success:false});
  // }
});
app.post("/pdf-maker",function(req,res){
  var query ="SELECT distinct u.id, u.first_name, u.last_name,u.sex, u.email ,a.height,a.weight,a.us_citizen,a.union_status,a.union_number,a.ethnicity,a.state,a.city,a.street,a.zip,a.home_phone,a.cell_phone,a.birthday FROM users as u LEFT JOIN actors a ON u.id = a.users_id WHERE u.id in ("+ req.body.target_id+')';
  connect(function(con){
    con.query(query,function(err,result,fields){
      console.log(query);
      if (err) {
        console.log(err);
        res.send({success:false});
      }
      else {
        var info = result;
        var query2 ="SELECT users.id,images.thumbnail FROM images left join users on users.id = images.actors_users_id WHERE actors_users_id in ("+ req.body.target_id+')';
        con.query(query2,function(err, result2,fields){
          if (err) {
            console.log(err);
            res.send({success:false});
          }
          else {
            res.send({success:{info:info,thumbnails:result2}});
          }
        });
      }
    });
  });
});


app.post("/save-bucket",function(req,res){
  if(req.session.user_id){
     var query = "UPDATE searches SET bucket=?,last_update_date=? WHERE id = ?;";
     connect(function(con){
       con.query(query,[JSON.stringify(req.body.changed_bucket),new Date(),req.body.bucket_id], function(err, result,fields){
         if (err) {
           console.log(err);
           res.send({success:false});
         }
         else {
           res.send({success:result});
         }
       });
     });
  }else {
    res.send({success:false});
  }
});


app.post("/give-admin-privilege",function(req,res){
  if(req.session.user_id){
     var query = "UPDATE users SET is_admin='"+(req.body.is_admin ==="1"?0:1)+"' WHERE id = '"+ req.body.user_id+"';";
     connect(function(con){
       con.query(query, function(err, result,fields){
         if (err) {
           console.log(err);
           res.send({success:false});
         }
         else {
           res.send({success:result});
         }
       });
     });
  }else {
    res.send({success:false});
  }
});


app.post("/delete_image",function(req,res){
  if(req.session.user_id){
    if(req.body.image_name){
      console.log(req.body.image_name,"deleting");
      connect(function(con){
        con.query("DELETE FROM images WHERE id=? ",[req.body.image_name], function(err, result,fields){
          if (err) {
            console.log(err);
          }
        });
      });

      res.redirect(303,'user');

    }else {
      res.send({success:"no image found"});
    }

  }else {
    res.send({success:false});
  }
});

app.post("/delete_search",function(req,res){
  if(req.session.user_id){
    if(req.body.search_id){
      connect(function(con){
        con.query("DELETE FROM searches WHERE id='"+req.body.search_id+"' ", function(err, result,fields){
          if (err) {
            console.log(err);
            res.send({success:false});
          }
          else {
            res.send({success:true});
          }
        });
      });
    }else {
      res.send({success:false});
    }
  }else {
    res.send({success:false});
  }
});

app.post("/send-message",function(req,res){
  if(req.session.user_id){
    var message = req.body.message, phone=req.body.phone
    if(message&& message.length>0 && phone && phone.length>0){
      send(phone, message, function(){
        console.log("Message sent");
      });
      res.send({success:true});
    }else {
      res.send({success:false});
    }
  }else {
    res.send({success:false});
  }
});

app.post("/upload_image",function(req,res){
  if(req.session.user_id){
    var form = new formidable.IncomingForm();
    var files = [];
    form.on("file", function(field, file) {
      files.push(file);
    })
    form.on("end", function() {
      function next(i) {
        if (i >= files.length) {
          // done and successful
          res.redirect(303, "user");
        }
        else {
          var photo = files[i];
          if (photo.type !== "image/jpeg" && photo.type !== "image/png" && photo.type !== "image/gif") {
            var message = "This format is not allowed , please upload file with '.png','.gif','.jpg'";
            res.send({success:"Format error"});
          }
          else {
            var dataDir = __dirname+'/public/img';
            var oldPhoto_name = photo.name;
            var newPhoto_name = "actor"+req.session.user_id+req.params.index+oldPhoto_name.substring(oldPhoto_name.indexOf("."));
            var buf = fs.readFileSync(photo.path).toString("base64");//real image
            Jimp.read(photo.path, function (err, lenna) {
              if (err) {
                console.log(err);
                res.send({success:false});
              }
              else {
                var maxwh = 350;
                var width = lenna.bitmap.width;
                var height = lenna.bitmap.height;
                if (width <= maxwh || height <= maxwh) {
                  var newwidth = width;
                  var newheight = height;
                }
                else if (width <= height) {
                  var newwidth = maxwh;
                  var newheight = Math.round(height / (width / maxwh));
                }
                else {
                  var newwidth = Math.round(width / (height / maxwh));
                  var newheight = maxwh;
                }
                lenna.resize(newwidth, newheight).getBase64(Jimp.AUTO, function(err,thumbnail) {
                  connect(function(con){
                    var query = "INSERT INTO images(image,actors_users_id,thumbnail) VALUES(?,?,?)";
                    var values = [buf,req.session.user_id,thumbnail];
                    con.query(query, values, function(err, result,fields){
                      if (err) {
                        console.log(err);
                        res.send({success:false});
                      }
                      else {
                        // added photo successfully, try next one
                        next(i+1);
                      }
                    });
                  });
                });
              }
            });
          }
        }
      }
      next(0);
    });
    form.parse(req);
  }
  else {
    res.send({success:false});
  }
});


app.post("/get_user_cars",function(req,res){
  if(req.session.user_id){
    connect(function(con){
      con.query("SELECT * FROM cars WHERE actors_users_id ='"+req.session.user_id+"'", function(err, result,fields){
        if(err){
          res.send({success:false});
        }else {
          res.send({success:result});
        }
      })
    });
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
  console.log("listening on http://localhost:" + app.get("port") + "; press Ctrl-C to terminate.");
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


var heights =[
            {
              "feet"  : "5’0”",
              "cm" : 152.40
            },
            {
              "feet"  : "5’1”",
              "cm" : 154.94
            },
            {
              "feet"  : "5’2”",
              "cm" : 157.48
            },
            {
              "feet"  : "5’3”",
              "cm" : 160.02
            },
            {
              "feet"  : "5’4”",
              "cm" :  162.56
            },
            {
              "feet"  : "5’5”",
              "cm" : 165.10
            },
            {
              "feet"  : "5’6”",
              "cm" : 167.74
            },
            {
              "feet"  : "5’7”",
              "cm" : 170.18
            },
            {
              "feet"  : "5’8”",
              "cm" : 172.72
            },
            {
              "feet"  : "5’9”",
              "cm" : 175.26
            },
            {
              "feet"  : "5’10”",
              "cm" : 177.80
            },
            {
              "feet"  : "5’11”",
              "cm" : 180.34
            },
            {
              "feet"  : "6’0”",
              "cm" : 182.88
            },
            {
              "feet"  : "6’1”",
              "cm" : 185.45
            },
            {
              "feet"  : "6’2”",
              "cm" : 187.96
            },
            {
              "feet"  : "6’3”",
              "cm" : 190.50
            },
            {
              "feet"  : "6’4”",
              "cm" : 193.04
            },
            {
              "feet"  : "6’5”",
              "cm" : 195.58
            },
            {
              "feet"  : "6’6”",
              "cm" : 198.12
            },
            {
              "feet"  : "6’7”",
              "cm" : 200.66
            },
            {
              "feet"  : "6’8”",
              "cm" : 203.20
            },
            {
              "feet"  : "6’9”",
              "cm" : 205.74
            },
            {
              "feet"  : "6’10”",
              "cm" : 208.28
            },
            {
              "feet"  : "6’11”",
              "cm" : 210.82
            },
            {
              "feet"  : "7’0”",
              "cm" : 213.36
            },
            {
              "feet"  : "7’1”",
              "cm" : 215.90
            },
            {
              "feet"  : "7’2”",
              "cm" : 218.44
            },
          ];

          /////

function send(phone, message, cb) {
  // Load the twilio module
  var twilio = require("twilio");

  // Create a new REST API client to make authenticated requests against the
  // twilio back end
  console.log(credentials.twilio_RestClient_A, credentials.twilio_RestClient_B);
  var client = new twilio.RestClient(credentials.twilio_RestClient_A, credentials.twilio_RestClient_B);

  // Pass in parameters to the REST API using an object literal notation. The
  // REST client will handle authentication and response serialzation for you.
  console.log("Send to " + phone);
  client.sms.messages.create({
    to: phone,
    from: "+14127278559",
    body: message
  }, function(error, message) {
    // The HTTP request to Twilio will run asynchronously. This callback
    // function will be called when a response is received from Twilio
    // The "error" variable will contain error information, if any.
    // If the request was successful, this value will be "falsy"
    if (!error) {
      // The second argument to the callback will contain the information
      // sent back by Twilio for the request. In this case, it is the
      // information about the text messsage you just sent:
      console.log("Success! The SID for this SMS message is:");
      console.log(message.sid);

      console.log("Message sent on:");
      console.log(message.dateCreated);
      cb();
    }
    else {
      console.log("Oops! There was an error.");
    }
  });
}
