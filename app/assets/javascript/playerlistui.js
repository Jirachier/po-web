/* The list of players */
function PlayerList() {
    this.ids = [];
    this.shown = {};
    this.filter = '';
    this.showColors = false;
}

var playerlist = PlayerList.prototype;

playerlist.setFilter = function(filter) {
    if (filter.toLowerCase() == this.filter) {
        return;
    }

    this.filter = filter.toLowerCase();
    this.updatePlayers();
};

playerlist.updatePlayers = function() {
    this.setPlayers(this.ids);
};

playerlist.setPlayers = function (playerIds) {
    this.shown = {};

    var html = "",
        len, i;

    /* Could be optimized, but later */
    playerIds.sort(function(a, b) {
        return webclient.players.name(a).toLowerCase().localeCompare(webclient.players.name(b).toLowerCase());
    });

    for (i = 0, len = playerIds.length; i < len; i += 1) {
        html += this.createPlayerItem(playerIds[i]);
    }

    this.element.html(html);
    this.ids = playerIds;

    for (var i in this.ids) {
        this.ids[i] = +this.ids[i];
    }

    this.updatePlayerCount();
};

playerlist.updatePlayerCount = function () {
    var idl = this.ids.length;
    this.count.text(idl + (idl !== 1 ? " Users" : " User"));
};

playerlist.createPlayerItem = function (id) {
    var name = webclient.players.name(id),
        ret;

    /* If there's a filter and it's no match, hide the player name */
    if (this.filter && name.toLowerCase().indexOf(this.filter) === -1) {
        return "";
    }

    this.shown[id] = true;

    ret = "<a href='po:info/" + id + "' class='list-group-item player-list-item player-auth-" + webclient.players.auth(id);

    if (webclient.players.away(id)) {
        ret += ' player-away';
    }

    if (webclient.battles.isBattling(id)) {
        ret += ' player-battling';
    }
    
    if (webclient.players.isIgnored(id)) {
        ret += ' player-ignored';
    }

    ret += "' ";

    if (this.showColors) {
        ret += "style='color:" + webclient.players.color(id) + "' ";
    }

    ret += "id='player-"+id+"' pid='" + id + "'>" + utils.escapeHtml(name) + "</a>";
    return ret;
};

playerlist.findPos = function(id) {
    var name = webclient.players.name(id),
        lname = name.toLowerCase();

    return this.ids.dichotomy(function (pid) {
        return lname.localeCompare(webclient.players.name(pid).toLowerCase());
    });
};

playerlist.addPlayer = function (id) {
    id = +id;
    /* Find the place where to put the name - dichotomy */
    var pos = this.findPos(id);

    /* Add the graphical element */
    var item = this.createPlayerItem(id);

    var added = false;
    for (var x = pos; x < this.ids.length; x++) {
        if (this.shown[this.ids[x]]) {
            /* Inserts the item before the player at pos */
            $(".player-list-item#player-" + this.ids[x]).before(item);
            added = true;
            break;
        }
    }
    if (!added) {
        this.element.append(item);
    }

    // Add the id after the position
    this.ids.splice(pos, 0, id);
    this.updatePlayerCount();
};

playerlist.removePlayer = function (id) {
    delete this.shown[id];

    var pos = this.ids.indexOf(+id);
    if (pos !== -1) {
        this.ids.splice(pos, 1);
    }

    /* Remove the graphical element */
    $(".player-list-item#player-" + id).remove();
    this.updatePlayerCount();
};

playerlist.updatePlayer = function (id) {
    if (this.ids.indexOf(+id) !== -1) {
        this.removePlayer(id);
        this.addPlayer(id);
    }
};

$(function() {
    webclientUI.players.element = $("#playerlist");
    webclientUI.players.count = $("#playercount");

    $("#player-filter").on("input", function() {
        webclientUI.players.setFilter($(this).val());
    });

    webclient.players.on("playeradd", function(id, obj) {
        webclientUI.players.updatePlayer(+id);

        if (obj.hasOwnProperty("info")) {
            webclientUI.updateInfo(id, obj.info);
            /* In case a battle was not sharing a channel, get their name / color */
            webclient.battles.updateInfo(id, obj);
        }
    }).on("playerupdated", function(id, obj) {
        webclientUI.players.updatePlayer(+id);

        if (obj.hasOwnProperty("info")) {
            webclientUI.updateInfo(id, obj.info);
        }
    });
    /* Open window on player click */
    // webclientUI.players.element.on("click", "li", function (event) {
    //     var pid = $(this).attr("pid");

    //     webclientUI.displayPlayerWindow(pid);
    // });
    /* Show context menu when clicked */
    webclientUI.players.element.contextmenu({
        target: "#player-context-menu",
        before: function(event, context) {
            var player = $(event.target);
            var pid = player.attr("pid");
            var menu = this.getMenu();

            /* Add this once, handler of links on context menu */
            if (!menu.attr("weaned")) {
                menu.attr("weaned", true);
                menu.on("click", "a", webclientUI.linkClickHandler);
            }

            menu.find("a").each(function(i) {
                this.href = this.href.substr(0, this.href.lastIndexOf("/") + 1) + pid;
            });

            menu.find("#player-ignore-menu").find("a").text(webclient.players.isIgnored(pid) ? "Unignore" : "Ignore");

            var ownAuth = webclient.ownAuth();

            if (ownAuth > webclient.players.auth(pid)) {
               menu.find(".divider").show();
               menu.find("#player-kick-menu").show(); 
               if (ownAuth >= 2) {
                    menu.find("#player-ban-menu").show(); 
               } else {
                    menu.find("#player-ban-menu").hide(); 
               }
            } else {
                menu.find(".divider").hide();
                menu.find("#player-kick-menu").hide(); 
                menu.find("#player-ban-menu").hide(); 
            }

            if (webclient.battles.isBattling(pid)) {
                menu.find("#player-watch-menu").show(); 
            } else {
                menu.find("#player-watch-menu").hide(); 
            }
        },
        onItem: function(context, event) {
            event.preventDefault();
            //var item = $(event.target);
        }
    });
});