
//Configuration values
const config     = require('./config.json');
//Web Server
const express    = require('express');
//Middleware
const bodyParser = require('body-parser');

//MySQL
const mysql            = require('mysql');
const connectionInfo   = {
  host: config.postgres.host,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.db
}

var connection = mysql.createConnection(connectionInfo); 

connection.connect(function(err){
	if(!err){
		console.log("Database is connected");
	}
	else{
		console.log("Error connecting database");
	}
})


const app = express();

var startExpress = function() {
	app.listen(config.express.port);
	console.log('API server online')
	console.log('Listening on port ' + config.express.port);
};


var reportAsLost = function(request, res, next){
	const major  = request.query.major;
	const minor  = request.query.minor; 
	connection.query('UPDATE status SET reported_as_lost = ?  WHERE major = ? AND minor = ? AND reported_as_lost = ?', [true, major, minor, false], function (error, results, fields) {
	  if (error) throw error;
	  if(results.changedRows > 0){
	  	 res.json({major:major, minor: minor, reported_as_lost: true});
	  }
	  else{
	  	res.json({error:"Major and minor combination does not exist or reported_as_lost property is already TRUE"})
	  }
	});
};

var register = function(request, res, next){
	const major  = request.query.major;
	const minor  = request.query.minor;
	const newDoc = {major: major, minor: minor, reported_as_lost: false}; 
	connection.query('INSERT INTO status SET ?', newDoc, function(err,result){
	  if(err){
		res.send(500, {error: err})
	  }
	  else{
		  const savedRegister = {id: result.insertId, major: major, minor: minor, reported_as_lost: false};
		  console.log(savedRegister);
		  res.json(savedRegister);	
	  }
	});
};

var getStatus = function(request, res, next){
	const major = request.query.major;
	const minor = request.query.minor;
	console.log("Major: " + major + " Minor: " + minor);
	const query = {major: major, minor: minor};
	connection.query('SELECT * FROM status WHERE  major ='+ query.major +' AND minor = ' + query.minor + '',function(err,rows){
		if(err)
			throw err;
		if(rows.length > 0){
			console.log(rows);
			res.json(rows);	
		}
		else{
			res.json({error:"Major and minor combination does not exist"})
		}
	});
};

var cleanDataBase = function(request, res, next){
	connection.query('DELETE  FROM status', function(err, result){
    	if (err) throw err;
    	console.log('Deleted ' + result.affectedRows + ' rows');	
    	connection.query('ALTER TABLE status AUTO_INCREMENT = 1',function(err){
    		if(err)
    			throw err;
    	})	
	});
};


/// Data Parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extender:true}));

/// Define API routes
app.route('/api/reportPetAsLost').get(reportAsLost);
app.route('/api/register').get(register);
app.route('/api/getStatus').get(getStatus);
app.route('/api/cleanDataBase').get(cleanDataBase);

startExpress();





