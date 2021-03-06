function BattleData(data) {
    $.observable(this);

    this.addData(data);
};

var battledata = BattleData.prototype;

battledata.addData = function(data) {
    $.extend(this, data);
};

battledata.print = function(msg, args) {
    this.trigger("print", msg, args);
};

battledata.finished = function(result) {
    console.log("battle finished with result " + result);
    if (result == "close") {
        this.print("<strong>One of the players left the battle.</strong>");
    }
    if (result == "close" || result == "forfeit") {
        this.trigger("disable");
    }
};

battledata.start = function(data) {
    this.pause();
    this.addData(data);

    this.data = {};

    var conf = this.conf;
    var team = this.team;

    this.queue = [];//Queues of message not yet processed

    /* Pokemon on the field */
    this.pokes = {};
    /* teams */
    this.teams = [[{},{},{},{},{},{}], [{},{},{},{},{},{}]];
    this.choices = {};
    this.spectators = {};
    this.timers = [{'value':300, 'ticking': false}, {'value':300, 'ticking': false}];
    this.players = ["", ""];
    /* player names */
    if (conf.names) {
        for (var i in conf.names) {
            if (conf.names[i]) {
                this.players[i] = conf.names[i];
            }
        }
    }
    if (!this.players[0]) {
        this.players[0] = webclient.players.name(conf.players[0]);
    }
    if (!this.players[1]) {
        this.players[1] = webclient.players.name(conf.players[1]);
    }
    if (!webclient.players.hasPlayer(conf.players[0])) {
        webclient.requestInfo(conf.players[0]);
    }
    if (!webclient.players.hasPlayer(conf.players[1])) {
        webclient.requestInfo(conf.players[1]);
    }

/*    this.timer = setInterval(function() {
        self.updateTimers()
    }, 1000);
*/
    if (team) {
        this.myself = conf.players[1] === webclient.ownId ? 1 : 0;

        //ugly way to clone, better way at http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object
        this.teams[this.myself] = JSON.parse(JSON.stringify(team));
        while (this.teams[this.myself].length < 6) {
            var moves = [];
            for (var j = 0; j < 4; j++) {
                moves.push({"move":0,"pp":0,"totalpp":0});
            }
            this.teams[this.myself].push({"moves": moves, num: 0, level: 0});
        }
        console.log("own team");
        console.log(this.teams[this.myself]);
        //this.updateTeamPokes(this.myself);
    } else {
        this.myself = 0;
    }

    this.opponent = 1-this.myself;
};

battledata.isBattle = function() {
    return this.team ? true : false;
};


battledata.name = function(player) {
    return this.players[this.player(player)];
};

battledata.rnick = function(spot) {
    if (! (spot in this.pokes)) {
        return this.teams[this.player(spot)][this.slot(spot)].name || "???";
    }
    return this.pokes[spot].name;
};

battledata.nick = function(spot) {
    if (this.isBattle() && this.player(spot) == this.myself) {
        return this.rnick(spot);
    } else {
        return this.name(this.player(spot)) + "'s " + this.pokes[spot].name;
    }
};

battledata.player = function(spot) {
    return spot % 2;
};

battledata.updateInfo = function(id, player) {
    if (this.ids[0] == id) {
        this.players[0] = player.name;
        this.trigger("playernameupdated", 0, player.name);
    } else if (this.ids[1] == id) {
        this.players[1] = player.name;
        this.trigger("playernameupdated", 1, player.name);
    }
};

battledata.close = function() {
    this.timers[0].ticking = this.timers[1].ticking = false;
};

battledata.updateClock = function(player, time, ticking) {
    this.timers[player] = {"time": time, "ticking": ticking, "lastupdate": new Date().getTime()};
    this.updateTimers();
};

battledata.updateTimers = function() {
    var self = this;
    for (var i = 0; i < 2; i++) {
        var time = this.timers[i].time;
        if (time === undefined) {
            time = 300;
        }
        if (this.timers[i].ticking) {
            time -= (((new Date().getTime())-this.timers[i].lastupdate) /1000);
            if (time < 0) {
                time = 0;
            }
        }
        
        this.trigger("timerupdated", i, time);
    }
    if (this.timers[0].ticking || this.timers[1].ticking) {
        setTimeout(function(){self.updateTimers();}, 1000);
    }
};

battledata.slot = function(spot) {
    return spot >> 1;
};

battledata.spot = function(player, slot) {
    return player + (slot << 1);
};

battledata.tpoke = function(spot) {
    if (arguments.length == 1) {
        return this.teams[this.player(spot)][this.slot(spot)];
    } else {
        return this.teams[arguments[0]][arguments[1]];
    }
};

battledata.updateFieldPoke = function(spot) {
};

battledata.updateTeamPokes = function(player, pokes) {
    this.trigger("updateteampokes", player, pokes);
};

battledata.allowStart = function() {
    this.canStart = true;

    if (!this.paused) {
        this.readQueue();
    }
}

battledata.pause = function() {
    this.paused = true;
};

battledata.unpause = function() {
    this.paused = false;
    this.readQueue();
};

battledata.readQueue = function() {
    if (this.queue.length == 0 || this.readingQueue ||!this.canStart) {
        return;
    }

    this.readingQueue = true;

    var i;

    for (i = 0; i < this.queue.length; i++) {
        if (this.paused) {
            break;
        }
        this.dealWithCommand(this.queue[i]);
    }

    this.queue = this.queue.slice(i);
    this.readingQueue = false;
};

/* Receives a battle command - a battle message.

   Calls the appropriate function from battle/commandshandling.js to handle it.
 */
battledata.dealWithCommand = function(params) {
    var isImmediate = (params.command in BattleData.immediateCommands) && !params.end;
    if ((this.paused || !this.canStart) && !isImmediate) {
        this.queue.push(params);
        return;
    }
    var funcName = "dealWith"+params.command[0].toUpperCase() + params.command.slice(1);
    if (funcName in BattleData.prototype) {
        this[funcName](params);
    }
};

BattleData.immediateCommands = {
    "clock": true,
    "playerchat": true,
    "spectatorjoin": true,
    "spectatorleave": true,
    "spectatorchat": true,
    "disconnect": true,
    "reconnect" : true
};

battledata.sendMessage = function (message) {
    var lines = message.trim().split('\n'),
        command = (this.isBattle() ? "battlechat": "spectatingchat"),
        line, len, i;

    for (i = 0, len = lines.length; i < len; i += 1) {
        line = lines[i];

        network.command(command, {battle: this.id, message: line});
    }
};