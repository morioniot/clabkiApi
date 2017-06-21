
//Configuration values
const config     = require('./config.json');
//Web Server
const express    = require('express');
//Middleware
const bodyParser = require('body-parser');

//PostgresSQL
const massive          = require('massive');
const connectionInfo   = {
  host: config.postgres.host,
  port: 5432,
  database: config.postgres.db,
  user: config.postgres.user,
  password: config.postgres.password
}
var db;


const app = express();

var startExpress = function() {
	app.listen(config.express.port);
	db = app.get('db');
	console.log('API server online')
	console.log('Listening on port ' + config.express.port);
};


var reportAsLost = function(request, res, next){
	const major  = request.query.major;
	const minor  = request.query.minor;
	const query  = {major: major, minor: minor};
	const updatedDoc = {reported_as_lost: true}; 
	db.status.update(query, updatedDoc)
		.then(lostPet => {
			console.log(lostPet)
			if(lostPet.length > 0)
				res.json(lostPet);
			else
				res.json({error:"Major and minor combination does not exist"})
		})
		.catch(err => {
			console.log(err)
			res.send(500, {error: err.detail})
		})
};

var register = function(request, res, next){
	const major  = request.query.major;
	const minor  = request.query.minor;
	const newDoc = {major: major, minor: minor, reported_as_lost: false}; 
	db.status.save(newDoc)
		.then(register => {
			console.log(register)
			res.json(register);
		})
		.catch(err => {
			console.log(err)
			res.send(500, {error: err.detail})
		})
};

var getStatus = function(request, res, next){
	const major = request.query.major;
	const minor = request.query.minor;
	console.log("Major: " + major + " Minor: " + minor);
	const query = {major: major, minor: minor};
	db.status.findOne(query)
		.then( status => {
			console.log(status);
			if(status != undefined)
				res.json(status);
			else
				res.json({error:"Major and minor combination does not exist"})
		})
};

var cleanDataBase = function(request, res, next){
	db.status.destroy({})	
		.then(destroyedElements => {
			console.log(destroyedElements)
			res.json(destroyedElements);
		})
};


//Massive promise
massive(connectionInfo)
	.then(instance => {
	  	app.set('db', instance);

		/// Data Parsing
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({extender:true}));

		/// Define API routes
		app.route('/api/reportPetAsLost').get(reportAsLost);
		app.route('/api/register').get(register);
		app.route('/api/getStatus').get(getStatus);
		app.route('/api/cleanDataBase').get(cleanDataBase);

	    startExpress();
	});




