var mongojs = require('mongojs');
var db = mongojs('mongodb://admin:admin@ds123312.mlab.com:23312/game', ['account']);

var express = require('express');
var app = express();
var serv = require('http').Server(app);
//var SerialPort = require('serialPort');

var socketList = {}; //List of all connected players

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000); //port 2000

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

var Potion = function(xx, yy, type_) {
	var self = {
		x: xx,
		y: yy,
		type: type_
	}
	
	self.getDistance = function(pt) {
		return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
	}
	
	self.getInitPack = function() {
		return {
			x: self.x,
			y: self.y,
			type: self.type,
		};
	}
	
	Potion.list[Math.random() * 10] = self;
	
	initPack.potion.push(self.getInitPack());
	
	return self;
}

Potion.list = {};

var Player = function(id) {
	var self = Entity();
	self.id = id;
	self.username = "";
	self.number = "" + Math.floor(10 * Math.random());
	self.pressingDown = false;
	self.pressingLeft = false;
	self.pressingRight = false;
	self.pressingUp = false;
	self.pressingAttck = false;
	self.mouseAngle = 0; //degrees
	self.maxSpeed = 10;
	self.hp = 10;
	self.hpMax = 10;
	self.score = 0;
	
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
	
	
	self.getInitPack = function() {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			number: self.number,
			hp: self.hp,
			hpMax: self.hpMax,
			score: self.score
		};
	}
	
	self.getUpdatePack = function() {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			hp: self.hp,
			score: self.score
		};
	}
	
	
	Player.list[id] = self;
	
	initPack.player.push(self.getInitPack());
	
	return self; 
}

Player.list = {};


Player.onConnect = function(socket) {
	//when a player connects to the server
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
	
	socket.emit('init', {
		selfId: socket.id,
		player: Player.getAllInitPack(), 
		bullet: Bullet.getAllInitPack()
	})
}

Player.getAllInitPack = function() {
	var players = [];
	for (var i in Player.list) {
		players.push(Player.list[i].getInitPack());
	}
	return players;
}

Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
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
		pack.push(player.getUpdatePack());
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
				
				p.hp--;
				
				if (p.hp <= 0 ) {
					
					var shooter = Player.list[self.parent];
				
					if (shooter) {
						shooter.score += 1;	
						p.score = Math.max(0, p.score - 1);
					}
					
					p.hp = p.hpMax;
					p.x = Math.random() * 500;
					p.y = Math.random() * 500;
				}
				
				self.toRemove = true;
			}
		}
		
	}
	
	Bullet.list[self.id] = self;
	
	self.getInitPack = function() {
		return {
			id: self.id,
			x: self.x,
			y: self.y
		};
	}
	
	self.getUpdatePack = function() {
		return {
			id: self.id,
			x: self.x,
			y: self.y
		};
	}
	
	initPack.bullet.push(self.getInitPack());
	
	return self;
}

Bullet.list = {};

Bullet.getAllInitPack = function() {
	var bullets = [];
	for (var i in Bullet.list) {
		bullets.push(Bullet.list[i].getInitPack());
	}
	return bullets;
}

Bullet.update = function () {
	var pack = [];
	
	for (var i in Bullet.list) {
		var b = Bullet.list[i];
		b.update();
		if (b.toRemove) {
			delete Bullet.list[i];
			removePack.bullet.push(b.id);
		}
		else 
			pack.push(b.getUpdatePack());
	}
	return pack;
}

var DEBUG = false;

var USERS = {
	/*username:password database*/
}

var isValidPassword = function(data, cb){
	//return cb(true);
	db.account.find({ username: data.username, password: data.password}, function(err, res) 
	{
		if (res.length > 0)
			cb(true);
		else
			cb(false);
	});
}

var isUsernameTaken = function(data, cb) {
	//return cb(false);
	db.account.find({username: data.username}, function(err, res) 
	{
		if (res.length > 0)
			cb(true);
		else
			cb(false);
	});
}

var addUser = function(data, cb){
	//return cb();
	db.account.insert({ username: data.username, password: data.password}, function(err) 
	{
		cb();
	});
}

var io = require('socket.io') (serv, {});

io.sockets.on('connection', function(socket){
	//While the sockets are connected to the server
	socket.id = Math.random();
	socketList[socket.id] = socket;

	socket.on('signIn', function(data) {
		isValidPassword(data, function(res){
			if (res) {
				Player.onConnect(socket);
				socket.emit('signInResponse', {
					success: true
				});
				
				socket.emit('addToChat', 'Welcome ' + data.username);
				Player.list[socket.id].username = data.username;

			} else {
				socket.emit('signInResponse', {
					success: false
				});
			}
		});
	});
	
	socket.on('signUp', function(data) {
		isUsernameTaken(data, function(res) {
			if (res) {
				socket.emit('signUpResponse', {
					success: false
				});
			} else {
				addUser(data, function() {
					socket.emit('signUpResponse', {
					success: true
					});
				});
			}
		});
	});
	
	console.log('New socket connected...');
	
	//if socket is disconnected, it is then deleted
	socket.on('disconnect', function() {
		delete socketList[socket.id];
		Player.onDisconnect(socket);
	});
	
	socket.on('sendMsgToServer', function(data) {
		var playerName = Player.list[socket.id].username;
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

var initPack = {player:[], bullet: [], potion: []};
var removePack = {player:[], bullet: [], potion: []};

Potion.list[0] = new Potion(parseInt(Math.random() * 500), parseInt(Math.random() * 500), 1);

setInterval(function(){
	//Server update function
	
	var pack = {
		player: Player.update(),
		bullet: Bullet.update()
	}
	
	for (var i in socketList) {
		//Sends clients back the updated information
		var socket = socketList[i];
		socket.emit('init', initPack);
		
		socket.emit('update', pack);
		
		socket.emit('remove', removePack);
	}
	
	initPack.player = [];
	initPack.bullet = [];
	//initPack.potion = [];
	
	removePack.player = [];
	removePack.bullet = [];
	removePack.potion = [];
	
}, 1000/30.0 /*25 frames/second*/);


