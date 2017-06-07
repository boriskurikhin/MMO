var express = require('express');
var app = express();
var serv = require('http').Server(app);

var socketList = {}; //List of all connected players

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000); //port 2000

console.log("Server started...");

var Entity = function() {

	var self = { //constructor
		x: 250,
		y: 250,
		speedX: 0,
		speedY: 0,
		id: "",
	}
		
	self.update = function() { 
		self.updatePosition();
	}
	
	self.updatePosition = function(){
		self.x += self.speedX;
		self.y += self.speedY;
	}
	
	self.getDistance = function(pt) {
		return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
	}
	
	return self;
}

var Player = function(id) {
	var self = Entity();
	self.id = id;
	self.number = "" + Math.floor(10 * Math.random());
	self.pressingDown = false;
	self.pressingLeft = false;
	self.pressingRight = false;
	self.pressingUp = false;
	self.pressingAttck = false;
	self.mouseAngle = 0; //degrees
	self.maxSpeed = 10;
	
	var super_update = self.update;
	
	self.update = function() {
		self.updateSpeed();
		super_update();
		if (self.pressingAttck) {
			self.shootBullet(self.mouseAngle);
		}
		
	}
	
	self.shootBullet = function(angle) {
		var bullet = Bullet(self.id, angle);		
		bullet.x = self.x;
		bullet.y = self.y;
	}
	

	self.updateSpeed = function() {
		if (self.pressingRight) {
			self.speedX = self.maxSpeed;
		} else if (self.pressingLeft) {
			self.speedX = -self.maxSpeed;
		} else {
			self.speedX = 0;
		}
		
		if (self.pressingUp) {
			self.speedY = -self.maxSpeed;
		} else if (self.pressingDown) {
			self.speedY = self.maxSpeed;
		} else {
			self.speedY = 0;
		}
	}
	
	Player.list[id] = self;
	return self; 
}

Player.list = {};

Player.onConnect = function(socket) {
	var player = Player(socket.id);
	socket.on('keyPress', function(data) {
		
		if (data.inputId === 'left') {
			player.pressingLeft = data.state;
		}
		
		if (data.inputId === 'right') {
			player.pressingRight = data.state;
		}
		
		if (data.inputId === 'up') {
			player.pressingUp = data.state;
		}
		
		if (data.inputId === 'down') {
			player.pressingDown = data.state;
		}
		
		if (data.inputId === 'attack') {
			player.pressingAttck = data.state;
		}
		
		if (data.inputId === 'mouseAngle') {
			player.mouseAngle = data.state;
		}
		
	});
}

Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
}

Player.update = function () {
	
	/*
	if (Math.random() < 0.1) {
		Bullet(Math.random() * 360);
	}*/
	
	var pack = [];
	
	for (var i in Player.list) {
		//Loops through each currently connected socket
		var player = Player.list[i];
		player.update();
		pack.push({
			x:player.x,
			y:player.y,
			number:player.number
		});
	}
	return pack;
}

var Bullet = function (parent, theta) {
	var self = Entity();
	self.id = Math.random();
	
	self.speedX = Math.cos(theta / 180 * Math.PI) * 10;
	self.speedY = Math.sin(theta / 180 * Math.PI) * 10;
	
	self.timer = 0;
	self.toRemove = false;
	self.parent = parent;
	
	var super_update = self.update;
	
	
	self.update = function(){
		
		if (self.timer++ > 100) {
			self.toRemove = true;
		}
		
		super_update();
		
		for (var i in Player.list) {
			var p = Player.list[i];
			if (self.getDistance(p) < 32 && self.parent !== p.id) {
			//handle collision, ex: hp--;
				self.toRemove = true;
			}
		}
		
	}
	Bullet.list[self.id] = self;
	return self;
}

Bullet.list = {};

Bullet.update = function () {
	var pack = [];
	
	for (var i in Bullet.list) {
		var b = Bullet.list[i];
		b.update();
		if (b.toRemove)
			delete Bullet.list[i];
		else 
			pack.push({
				x:b.x,
				y:b.y
			});
	}
	return pack;
}


var DEBUG = false;

var io = require('socket.io') (serv, {});

io.sockets.on('connection', function(socket){
	//While the sockets are connected to the server
	socket.id = Math.random();
	socketList[socket.id] = socket;

	Player.onConnect(socket);
	console.log('New socket connected...');
	
	//if socket is disconnected, it is then deleted
	socket.on('disconnect', function() {
		delete socketList[socket.id];
		Player.onDisconnect(socket);
	});
	
	socket.on('sendMsgToServer', function(data) {
		var playerName = ('' + socket.id).slice(2,7);
		for (var i in socketList) {
			socketList[i].emit('addToChat', playerName + ':' + data);
		}
	});
	
	socket.on('evalServer', function(data) {
		if (!DEBUG) //makes sure that only in debug mode
			return;
		var res = eval(data);
		socket.emit('evalAnswer', res);
	});
	
});

setInterval(function(){
	//Server update function
	
	var pack = {
		player: Player.update(),
		bullet: Bullet.update()
	}
	
	for (var i in socketList) {
		//Sends clients back the updated information
		var socket = socketList[i];
		socket.emit('newPosition', pack);
	}
	
}, 1000/25.0 /*25 frames/second*/);


