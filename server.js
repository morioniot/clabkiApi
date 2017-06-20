
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

// var handleError = function(res){
// 	console.log('¯\\_(ツ)_/¯');
// 	return function(err){
// 		console.log(err);
// 		res.send(500, {error: err.message})
// 	}
// }

var reportAsLost = function(request, res, next){
	var newDoc = {reportedAsLost:true};
	db.saveDoc("petStatus", newDoc)
		.then(petStatus => {
			console.log(petStatus)
			res.json(petStatus);
		});
};

var registerPet = function(request, res, next){
	var newDoc = {reportedAsLost:false};
	db.saveDoc("petStatus", newDoc)
		.then(petStatus => {
			console.log(petStatus)
			res.json(petStatus);
		});
};

var getPetStatus = function(request, res, next){

	const petId = request.query.id;
	console.log('Getting pet status : ' + petId );
	if(petId != undefined){
		const query = {id: petId};
		db.petstatus.findDoc(query)	
			.then(petStatus => {
				console.log('Then getPetSatus')
				console.log(petStatus)
				res.json(petStatus);
			});	
	}
	else{
		res.json({error:"Undefined ID"})
	}
};

var cleanDataBase = function(request, res, next){
	db.petstatus.destroy({})	
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
		app.route('/api/registerPet').get(registerPet);
		app.route('/api/getPetStatus').get(getPetStatus);
		app.route('/api/cleanDataBase').get(cleanDataBase);

	    startExpress();
	});




