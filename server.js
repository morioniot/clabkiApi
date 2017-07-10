

//Web Server
const express    = require('express');
//Middleware
const bodyParser = require('body-parser');

//MySQL
const mysql            = require('mysql');
const connectionInfo   = {
  host: ( process.env.OPENSHIFT_MYSQL_DB_HOST || 'localhost'),
  user: ( process.env.OPENSHIFT_MYSQL_DB_USERNAME || 'root'),
  password: (process.env.OPENSHIFT_MYSQL_DB_PASSWORD || 'p61404'),
  database: (process.env.OPENSHIFT_GEAR_NAME || 'clabkidb'),
}

 
var dataBaseConnectionObject;
var handleDataBaseDisconnect = function(){

	dataBaseConnectionObject = mysql.createConnection(connectionInfo);
	dataBaseConnectionObject.connect(function(err){
		if(!err){
			console.log("Database is connected");
		}
		else{
			console.log("Error connecting database");
			setTimeout(handleDataBaseDisconnect, 2000);
		}
	})

	 dataBaseConnectionObject.on('error', function(err) {
	    console.log('db error', err);
	    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
	      handleDataBaseDisconnect();                         // lost due to either server restart, or a
	    } else {                                      // connnection idle timeout (the wait_timeout
	      throw err;                                  // server variable configures this)
	    }
	  });		
}



const app = express();

var startExpress = function() {
	app.set("port", (process.env.OPENSHIFT_NODEJS_PORT || 5000));
	app.set("ip", (process.env.OPENSHIFT_NODEJS_IP || "localhost"))	
	app.listen(app.get("port"), app.get("ip"), function(){
		const currentDate = new Date();
		console.log("Server started: " + app.get("ip") + ":" + app.get("port") + "/" + " Date: " + currentDate);
	});
};


var reportAsLost = function(request, res, next){
	const major  = request.query.major;
	const minor  = request.query.minor; 
	dataBaseConnectionObject.query('UPDATE status SET reported_as_lost = ?  WHERE major = ? AND minor = ? AND reported_as_lost = ?', [true, major, minor, false], function (error, results, fields) {
	  if (error) 
	  	res.status(500).send({error: err});;
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
	dataBaseConnectionObject.query('INSERT INTO status SET ?', newDoc, function(err,result){
	  if(err){
		res.status(500).send({error: err});
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
	dataBaseConnectionObject.query('SELECT * FROM status WHERE  major ='+ query.major +' AND minor = ' + query.minor + '',function(err,rows){
		if(err)
			res.status(500).send({error: err});
		if(rows.length > 0){
			console.log(rows);
			res.json(rows[0]);	
		}
		else{
			res.json({error:"Major and minor combination does not exist"})
		}
	});
};

var cleanDataBase = function(request, res, next){

	dataBaseConnectionObject.query('DELETE  FROM status', function(err, result){
    	if (err) throw err;
    	console.log('Deleted ' + result.affectedRows + ' rows');	
    	dataBaseConnectionObject.query('ALTER TABLE status AUTO_INCREMENT = 1',function(err){
    		if(err)
    			throw err;
    		res.json({success:"DataBase has been restored"});

    	})	
	});
};

var removePet = function(request, res, next){

	const major = request.query.major;
	const minor = request.query.minor;
	console.log("Deleting Pet by Major and Minor")
	console.log("Major: " + major + " Minor: " + minor);
	const query = {major: major, minor: minor};
	dataBaseConnectionObject.query('DELETE FROM status WHERE  major ='+ query.major +' AND minor = ' + query.minor + '', function(err, result){
    	if (err) throw err;	
    	if(result.affectedRows > 0)
    		res.json({success:"A pet has been deleted from DataBase"})
    	else
    		res.json({error:"Major and minor combination does not exist in Database"})
    	
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
app.route('/api/removePet').get(removePet);

startExpress();
handleDataBaseDisconnect();





