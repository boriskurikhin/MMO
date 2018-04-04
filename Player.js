var app = require('./app.js');

var playerlist = app.playerlist;
var initPack = app.initpack;
var removePack = app.removepack;

var Player = function(id) {
	var self = Entity();
	//glboal variables
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

	//check if player pressed shoot on the client side, and then spawn a bullet on the server and later send it out to the client.
	self.update = function() {
		self.updateSpeed();
		super_update();
		if (self.pressingAttck) {
			self.shootBullet(self.mouseAngle);
		}
		//hello
	}

	self.shootBullet = function(angle) {
		var bullet = Bullet(self.id, angle);
		bullet.x = self.x;
		bullet.y = self.y;
	}

	//check clientSide inputs and set them on the server
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

	//initialization package
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

	//add player to the server list and package to send out to the clients.

	Player.list[id] = self;

	initPack.player.push(self.getInitPack());

	return self;
}

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

//Collect all init packs in one list

Player.getAllInitPack = function() {
	var players = [];
	for (var i in playerlist) {
		players.push(playerlist[i].getInitPack());
	}
	return players;
}

//When player disconnects
Player.onDisconnect = function(socket){
	delete playerlist[socket.id];
	removePack.player.push(socket.id);
}

Player.update = function () {

	/*
	if (Math.random() < 0.1) {
		Bullet(Math.random() * 360);
	}*/

	var pack = [];

	//Updates positions and prepares an updated x,y coordinates in a package
	//to send out to the clients.

	for (var i in playerlist) {
		//Loops through each currently connected socket
		var player = playerlist[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
}

module.exports = Player;
