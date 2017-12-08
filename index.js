// Add any outside files here...
var express = require('express');
var credentials = require('./credentials.js');
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
    //console.log('Connected!');
  });
}

/*
var forgot = require('../../')({
    uri : '/resetpassword',
    from : 'tcampb@pointpark.edu',
    host : '/forgot', port : 4000,
});
*/

function getMenu(req){
  var menu =[];
  var isAdmin = req.session.is_admin;
   menu.push({"page": "/", "label": "Home"},{"page": "about", "label": "About"});

  if(isAdmin){
    menu.push({"page": "search", "label": "Search"});
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
    res.redirect(303,'/user');
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

app.get("/forgot", function(req,res){
  res.render("forgot", {
    menu: getMenu(req)
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
  sql1="SELECT app_name FROM edits";
   connect(function(con){
        con.query(sql1, function(err, results) {
         if (err) throw err;
           res.send({success: results});
      });
   });
});

app.get('/edit', function(req, res) {
  res.render('edit');
});

app.post("/edit_page", function(req, res) {
  q="UPDATE edits SET app_name= '" +req.body.name +"' WHERE id =1";
   connect(function(con){
        con.query(q, function(err, results) {
         if (err) throw err;
           res.redirect("/");
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
         if (err) throw err;
           res.send({success: results});
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
  res.redirect(303,'/');
});


app.post("/login", function(req,res){
  connect(function(con){
    req.check('email','invalid email address').isEmail();
    var errors = req.validationErrors();
    if( errors){
      req.session.errors = errors;
      res.redirect(303,'/');
    }else {
      var email=req.body.email;
        var q  ="SELECT * FROM users WHERE email = '"+email+"' ;"; //"SELECT id, email,FROM users WHERE email = '"+email+"' "
        con.query(q, function (err, result, fields) {
          if (err) throw err;
            if(result[0]){
              if(result[0].password === req.body.password){
                 req.session.user_id = result[0].id;
                 req.session.is_admin = result[0].is_admin;
                 req.session.user_first_name = result[0].first_name;
                 req.session.cookie.maxAge = 9000000;
                 res.redirect(303,'/user');
              }else {
                  res.redirect(303,'/error-page');
              }
            }else {
               res.redirect(303,'/');
            }
        });
    }
  });
});

// To check if user already exists
app.post('/check_email', function(req, res){
  connect(function(con){
    var email = req.body.email;
    var sql = "SELECT COUNT(id) FROM users WHERE email = '"+email+"';";
    con.query(sql, function(err, results, field) {
      if (err) throw err;
      if(results[0]["COUNT(id)"] <  1) {
        // Email is valid not in DB yet
        res.send("");
      }else{
        res.send("Email Already Used.");
      }
    });
  });
});


// To add new user
app.post('/addUser', function(req, res){
  connect(function(con){
    var sql = "INSERT INTO users (first_name, last_name, email, password, is_admin, sex) VALUES (?, ?, ?, ?, ?, ?);";
    var values = [req.body.first_name, req.body.last_name, req.body.email, req.body.password, 0, req.body.sex];
    con.query(sql, values, function(err, results) {
      console.log(results.insertId);
        if (err){
          res.redirect(303,'/error-page');
        }else{
          if (results.insertId) {
            // Redirects new user to their own page
            console.log("New record created successfully. Last inserted ID is: " + results.insertId);
            req.session.user_id = results.insertId;
            req.session.user_first_name = req.body.first_name;
            req.session.cookie.maxAge = 9000000;
            res.redirect(303, '/user');
          } else {
              console.log("Error Redirecting pages");
              res.redirect(303, '/error-page');
          }
          con.end();
        }
    });
  });
});


app.post('/delete-in-database', function(req, res){
  var table = req.body.table;
  var id = req.body.table_id;
    console.log("delete-in-database ",table, id, table ==="cars");
   if(table ==="cars"){
    connect(function(con){
        var sql = "DELETE FROM cars WHERE id ='"+id+"'";
       con.query(sql,function(err, result) {
           if (err) throw err;
           if(result){
                res.send({success:{deleted_id:id} });
           }
       });
     });
   }
});

// To check if the email entered for forgot password exists
app.post('/forgot_pwd_reset', function(req, res){
  connect(function(con){
    var email = req.body.email;
    var sql = "SELECT COUNT(id) FROM users WHERE email = '"+email+"';";
    con.query(sql, function(err, results, field) {
      if (err) throw err;
      if(results[0]["COUNT(id)"] >=  1) {
        // Email Exist, Good to send Password reset link to
        res.send("");
      }else{
        res.send("Email Not Found.");
      }
    });
  });
});



app.post('/forgot', function (req, res) {
  var email = req.body.email;
  var reset = forgot(email, function (err) {
      if (err) res.end('Error sending message: ' + err)
      else res.end('Check your inbox for a password reset message.')
  });
    
  reset.on('request', function (req_, res_) {
      req_.session.reset = { email : email, id : reset.id };
      fs.createReadStream(__dirname + '/forgot.html').pipe(res_);
  });
});

app.post('/resetpassword', function (req, res) {
  if (!req.session.reset) return res.end('reset token not set');
    
  var password = req.body.password;
  var confirm = req.body.confirm;
  if (password !== confirm) return res.end('passwords do not match');
    
  // update the user db here    

  forgot.expire(req.session.reset.id);
  delete req.session.reset;
  res.end('password reset');
});

app.post('/process-search', function(req, res) {
  var search = req.body.search;
  var q = "SELECT * FROM users WHERE first_name LIKE '%" + search +"%'";
  connect(function(con){
    con.query(q, function(err, results) {
     if (err) throw err;
       res.send({success: results});
  	});
  });
});

app.post("/update-user-info", function(req,res){
  if( req.session.user_id){
    var table = req.body.table_name;
    if(req.body.request_type==='admin_request'){
        var q = "UPDATE "+req.body.table_name+" SET "+req.body.target+"='"+req.body.value+"' WHERE id = '"+ req.body.id+"';"
        connect(function(con){
          con.query(q, function (err, result, fields) {
            if (err) throw err;
              if(result){
                res.send({success:result});
              }else {
                 res.send({success:false});
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
                     con.query("SELECT password FROM users WHERE id = '"+req.session.user_id+"' ;", function (err, result, fields) {
                       if (err) throw err;
                         if(result[0]){
                           if((result[0].password===current_pass) && (confirm_pass===new_pass) && confirm_pass.length>0){
                             var q = "UPDATE users SET password='"+confirm_pass+"' WHERE id = '"+ req.session.user_id+"';";
                             connect(function(con){
                               con.query(q, function (err, result, fields) {
                                 if (err) throw err;
                                   if(result){
                                     res.send({success:"succes"});
                                   }else {
                                      res.send({success:false});
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
                           if (err) throw err;
                             if(result){
                               console.log("cars info", result.insertId);
                               //res.send({success:"succes"});
                               res.send({success:{target:"cars",new_record:new_record,new_insertedId:result.insertId, data:{make:make,color:color,year:year,id:car_id}}});
                             }else {
                                res.send({success:false});
                             }
                         });
                       });
                   }else {
                            res.send({success:false});
                   }

                 }else {
                   var target = key,value=req.body[key];
                   var id = (table==="users"?"id":"users_id");
                   //console.log("in table:",table," change",target," to  ",value);
                    connect(function(con){
                          var query = "UPDATE "+table+" SET "+target+"='"+value+"' WHERE "+id+" = '"+ req.session.user_id+"';";
                          con.query(query, function (err, result, fields) {
                            if (err) throw err;
                              if(result){
                                res.send({success:{column_changed:target, value:value}});
                              }else {
                                 res.send({success:false});
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

var voids = {"password":true,"is_admin":true,"id":true,"users_id":true,"admin_request":true,"image":true,"car_make":true,"car_color":true,"car_year":true,"car_id":true,"car_owner_id":true};
var users_info_names={"first_name":true,"last_name":true,"sex":true,"email":true};
var actors_info_names={"first_name":true,"last_name":true,"sex":true,"email":true};
var measurements ={"weight":true,"height":true,"neck_size":true,"sleeve_size":true,"waist_size":true,"inseam_size":true,"dress_size":true,"jacket_size":true,"shoe_size":true,"bust_size":true,"chest_size":true,"hip_size":true,"hat_size":true,}

app.get("/user", function(req,res){
  if(req.session.user_id){
    var qtest ="SELECT u.* ,a.*, c.make as car_make, c.color as car_color, c.year as car_year, c.id as car_id, c.actors_users_id as car_owner_id FROM users as u LEFT JOIN actors a ON u.id = a.users_id LEFT JOIN cars c on a.users_id = c.actors_users_id WHERE u.id ='"+req.session.user_id+"';";
    var query ="SELECT * FROM users LEFT JOIN actors ON users.id = actors.users_id  WHERE id = '"+req.session.user_id+"'  ";
      connect( function(con){
        con.query(qtest, function (err, result, fields) {
        if(err) throw err;
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
                  info.actor_info.push({name:key,label:upperCaseFirstLetter(key), value:result[0][key]});
              }
            }
            if(result[0].is_admin){
              info["menu"] = getMenu(req);
              con.query("SELECT first_name,last_name,sex, is_admin, id FROM users", function (err, result, fields){
                 if(err) throw err;
                 for(rs in result){
                   info.all_users.push(result[rs]);
                 }
             });
           }else {
             info["menu"] = getMenu(req);
           }
            res.render("user",info);
          }
      })
      });
  }else {
    res.redirect(303,'/');
  }
});

app.post("/search_database",function(req,res){
  var data = req.body, count =0, query ="SELECT users.*, actors.*,DATEDIFF(CURDATE(),actors.birthday) as age, (SELECT image FROM images WHERE users.id = actors_users_id LIMIT 1 ) as first_image, GROUP_CONCAT( cars.year,' ',cars.color,' ',cars.make SEPARATOR ',') as cars FROM users LEFT JOIN actors ON  users.id = actors.users_id LEFT JOIN cars ON  users.id = cars.actors_users_id WHERE ";
  for(key in data){
      if(data[key].min && data[key].max){
        query+= (count ===0?"":" AND ")+data[key].table+"."+key+" >= "+data[key].min+" AND "+data[key].table+"."+key+"<="+data[key].max;
        count++;
      }else if(data[key][key]){
        query+= (count ===0?"":" AND ")+data[key].table+"."+key+" = '"+data[key][key]+"'";
        count++;
      }
  }
  query+= " GROUP BY users.id";
  connect(function(con){
    con.query(query, function (err, result, fields){
       if(err) throw err;
       res.send({success:result, query:data});
   });
  });
});

app.post("/save_search",function(req,res){
  if(req.session.user_id){
    var query ="INSERT INTO searches(message, status, users_id,title,search_query) VALUES (?,?,?,?,?)";
    var values =[req.body.message,  'pending', req.session.user_id, req.body.title, JSON.stringify(req.body.query)];
    connect(function(con){
      con.query(query,values, function (err, result, fields){
         if(err) throw err;
         if(result){
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

app.post("/update-user-status-to-actor",function(req,res){
  if(req.session.user_id){
    connect(function(con){
      var query ="INSERT INTO actors (users_id) VALUES (?)";
      var values = [req.session.user_id];
      con.query(query,values, function (err, result, fields) {
        if (err) throw err;
          if(result){
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
app.post("/get-all-users",function(req,res){
  if(req.session.user_id){
    var query ="SELECT id,first_name,last_name,is_admin,email,sex,height,eye_color,weight,hair_color,hair_type,tattoo,piercings,facial_hair,us_citizen,neck_size,sleeve_size,waist_size,inseam_size,dress_size,jacket_size,shoe_size,bust_size,chest_size,hip_size,hat_size,union_status,union_number FROM users LEFT JOIN actors ON users.id = actors.users_id WHERE users.admin_request=1";
    var q = "SELECT first_name,last_name,sex, is_admin, id FROM users";
    connect(function(con){
      con.query(query, function (err, result, fields){
         if(err) throw err;
         res.send({success:result,admin_id:req.session.user_id});
     });
    });
  }else {
    res.send({success:false});
  }
});

app.post("/get_user_images",function(req,res){
  if(req.session.user_id){
    connect(function(con){
      con.query("SELECT * FROM images WHERE actors_users_id ='"+req.session.user_id+"'", function(err, result,fields){
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

app.post("/get-history",function(req,res){
  if(req.session.user_id){
    connect(function(con){
      con.query("SELECT * FROM searches WHERE users_id ='"+req.session.user_id+"'", function(err, result,fields){
        if(err) throw err;
        res.send({success:result});
      })
    });
  }else {
    res.send({success:false});
  }
});

app.post("/delete_image",function(req,res){
  if(req.session.user_id){
    if(req.body.image_name){
      connect(function(con){
        con.query("DELETE FROM images WHERE id='"+req.body.image_name+"' ", function(err, result,fields){
          if (err) throw err;
        });
      });

      res.redirect(303,'/user');

    }else {
      res.send({success:"no image found"});
    }

  }else {
    res.send({success:false});
  }
});

app.post("/upload_image",function(req,res){
  if(req.session.user_id){
      var form = new formidable.IncomingForm();
       form.parse(req,function(err, fields, files){
           if(err)throw err;
           if(fields){
             if(files.photo.type == "image/jpeg" ||files.photo.type == "image/png"||files.photo.type == "image/gif" ){
               var dataDir = __dirname+'/public/img';
               var oldPhoto_name = files.photo.name;
               var newPhoto_name = "actor"+req.session.user_id+req.params.index+oldPhoto_name.substring(oldPhoto_name.indexOf("."));

               var buf = fs.readFileSync(files.photo.path).toString("base64");
               //console.log("new fileName: ",buf);
               //fs.renameSync(files.photo.path,dataDir+'/'+newPhoto_name);
               connect(function(con){
                 var query = "INSERT INTO images(image,actors_users_id) VALUES(?,?)";
                 var values = [buf,req.session.user_id];
                 con.query(query, values, function(err, result,fields){
                   if(err) throw err;
                   if(result){
                   }else {
                   }
                 });
               });
              res.redirect(303,'/user');
               //res.send({success:true});
             } else {
               var message = "This format is not allowed , please upload file with '.png','.gif','.jpg'";
                res.send({success:"Format error"});
             }
           }
        });
  }else {
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
          function getHeightInFeet(value){
            var height = heights;
            for(var i =0; i< height.length; i++ ){
              if(height[i].cm ===value){
                return height[i].feet
              }
            }
          }
