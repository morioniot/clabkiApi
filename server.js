

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
	const user   = request.query.user;
	console.log("Registering Pet : Major: " + major + " Minor: " + minor + " User: " + user);
	if(user != undefined){
		const newDoc = {major: major, minor: minor, reported_as_lost: false, user: user}; 
		dataBaseConnectionObject.query('INSERT INTO status SET ?', newDoc, function(err,result){
		  if(err){
			res.status(500).send({error: err});
		  }
		  else{
			  const savedRegister = {id: result.insertId, major: major, minor: minor, reported_as_lost: false, user: user};
			  res.json(savedRegister);	
		  }
		});	
	}
	else{
		const message = "An user must be provided"
		res.json({error:message});
	}
};

var getStatus = function(request, res, next){
	const major = request.query.major;
	const minor = request.query.minor;
	console.log("Getting  Pet Status : Major: " + major + " Minor: " + minor);
	const query = {major: major, minor: minor};
	dataBaseConnectionObject.query('SELECT * FROM status WHERE  major ='+ query.major +' AND minor = ' + query.minor + '',function(err,rows){
		if(err)
			res.status(500).send({error: err});
		if(rows.length > 0){
			res.json(rows[0]);	
		}
		else{
			res.json({error:"Major and minor combination does not exist"})
		}
	});
};

var cleanDataBase = function(request, res, next){

	const user = request.query.user;
	console.log("Cleaning DataBase for user: " + user);
	if(user != undefined){		
		dataBaseConnectionObject.query('DELETE FROM status WHERE user = ?', [user], function(err, result){
	    	if (err) throw err;	
			if(err)
				res.status(500).send({error: err});
	    	if(result.affectedRows > 0){
	    		const message = 'Deleted ' + result.affectedRows + ' rows for the user: ' + user;
	    		res.json({success: message});
	    	}
	    		
	    	else
	    		res.json({error:"User does not have any pet associated"})    	
		});
	}
	else{
		const message = "An user must be provided"
		res.json({error:message});
	}
};

var removePet = function(request, res, next){

	const major = request.query.major;
	const minor = request.query.minor;
	console.log("Deleting Pet by Major and Minor: " + "Major: " + major + " Minor: " + minor)
	const query = {major: major, minor: minor};
	dataBaseConnectionObject.query('DELETE FROM status WHERE  major ='+ query.major +' AND minor = ' + query.minor + '', function(err, result){
    	if (err)
    		res.status(500).send({error: err});	
    	if(result.affectedRows > 0)
    		res.json({success:"A pet has been deleted from DataBase"})
    	else
    		res.json({error:"Major and minor combination does not exist in Database"})
    	
	});
};

var togglePetStatus = function(request, res, next){
	const major = request.query.major;
	const minor = request.query.minor;
	console.log("Toggling status for Pet : Major: " + major + " Minor: " + minor);
	const query = {major: major, minor: minor};
	dataBaseConnectionObject.query('UPDATE status SET reported_as_lost = !reported_as_lost WHERE  major ='+ query.major +' AND minor = ' + query.minor + '',function(err,result){

		if(err)
			res.status(500).send({error: err});
    	if(result.affectedRows > 0)
    		getStatus(request, res, next);
    	else
    		res.json({error:"Major and minor combination does not exist in Database"})
	});
};

var addLocationToPet = function(request, res, next){
	const major     = request.query.major;
	const minor     = request.query.minor;
	const latitude  = request.query.lat;
	const longitude = request.query.lon;
	console.log("Adding Location to Pet with: Major: " + major + " Minor: " + minor);
	const mysqlPointString = "GeomFromText('POINT(" + latitude + " " +  longitude + ")')";
	const sql = "UPDATE status SET coordinates=" + mysqlPointString + " WHERE major= " + major + " AND minor= " + minor
	dataBaseConnectionObject.query(sql,function(err,result){

		if(err)
			res.status(500).send({error: err});
    	if(result.affectedRows > 0)
    		getStatus(request, res, next);
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
app.route('/api/togglePetStatus').get(togglePetStatus);
app.route('/api/addLocationToPet').get(addLocationToPet);


startExpress();
handleDataBaseDisconnect();





