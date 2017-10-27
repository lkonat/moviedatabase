var express = require('express');
//var credentials = require('./credentials.js');
var expressValidator = require('express-validator');
var formidable = require('formidable');
var mysql = require('mysql');
var fs = require('fs');
var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:"main"});
var mysql = require('mysql');
var connection = mysql.createConnection({
        host: 'fkonat.it.pointpark.edu',
        user: 'lunamista',
        password: 'lunamista123',
        database:'lunadb'
});

app.engine("handlebars",handlebars.engine);
app.set("view engine","handlebars");
app.set('port', process.env.PORT || 4000);
app.use(express.static(__dirname +'/public'));
app.use( function( req, res, next){
  res.locals.showTests = app.get(' env') !== 'production' && req.query.test === '1';
  next();
 });
app.use(require('body-parser').urlencoded({extended:true}));
//app.use(require('cookie-parser')(credentials.cookieSecret));
//app.use(require('express-session')({
 //resave:false,
 //saveUninitialized:false,
// secret:credentials.cookieSecret
//}));
//app.get("/", function(req,res){
//    res.render("home");
//});
// Root Dir
app.get('/', function(req, res) {
  res.render('landing', {
    menu: [{"page": "home", "label": "Home"}, {"page": "about", "label": "About"}]
  });
});
app.get('/admin_page', function(req, res) {
        res.render('admin_page');
});

app.get('/admin_mail', function(req, res) {
        res.render('admin_mail');
})
app.get('/admin_search', function(req, res) {
        res.render('admin_search');
});

app.post('/process-search', function(req, res) {
         var search = req.body.search;
       // console.log(search);
        var q = "SELECT * FROM users WHERE first_name LIKE '%" + search +"%'";
        connection.query(q, function(err, results) {
         if (err) throw err;
           res.send({success: results});
         });
});


app.get("/history", function(req,res){
  if(req.session.admin_id){
  }else {
    res.render("searchhistory",{admin:req.session.firstName,adminlogin:req.session.admin_id});
  }
});

app.get("/creatnewaccount", function(req,res){
  res.render("addUser");
});
app.get("/forgotpassword", function(req,res){
  res.render("forgotpassword");
});
app.get("/search", function(req,res){
  res.render("search");
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
console.log('listening on http:// localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
