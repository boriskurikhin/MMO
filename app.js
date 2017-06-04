var express = require('express');
var app = express();
var serv = require('http').Server(app);
var socketList = {};

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000); //port 2000

console.log("Server started...");

var io = require('socket.io') (serv, {});
io.sockets.on('connection', function(socket){
	//Upon connection to the server, each socket is given unique properties.
	socket.id = Math.random();
	socket.x = 0;
	socket.y = 0;
	socket.number = Math.floor(10 * Math.random());
	socketList[socket.id] = socket;
	console.log('New socket connected...');
	
	//if socket is disconnected, it is then deleted
	socket.on('disconnect', function() {
		delete socketList[socket.id];
	});
	
});

setInterval(function(){
	//Server update function
	var pack = [];
	
	for (var i in socketList) {
		//Loops through each currently connected socket
		var socket = socketList[i];
		socket.x++;
		socket.y++;
		pack.push({
			x:socket.x,
			y:socket.y,
			number:socket.number
		});
	}
	for (var i in socketList) {
		//Sends clients back the updated information
		var socket = socketList[i];
		socket.emit('newPosition', pack);
	}
	
}, 1000/25.0);


