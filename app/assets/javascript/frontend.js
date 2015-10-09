var webclientUI = {
    players: new PlayerList(),
    channels: new ChannelList(),
    pms: new PMList(),
    battles: new BattleList(),
    tabs: [],
    timestamps: false,

    printDisconnectionMessage : function(html) {
        webclientUI.printHtml("<b>Disconnected from Server! If the disconnect is due to an internet problem, try to <a href='po:reconnect/'>reconnect</a> once the issue is solved. You can also go back to the <a href='" + config.registry + "'>server list</a>.</b>");
    },

    printHtml : function(html) {
        for (id in webclientUI.channels.channels()) {
            webclientUI.channels.channel(id).printHtml(html);
        }
    },

    printMessage : function(msg, html) {
        for (id in webclientUI.channels.channels()) {
            webclientUI.channels.channel(id).printMessage(msg, html);
        }
    },

    switchToTab : function(wid) {
        console.log("Switch to tab: " + wid);
        var id = wid.substr(wid.lastIndexOf("-") + 1)
        var obj;
        if (/^channel-/.test(wid)) {
            obj = webclientUI.channels.channel(id);
        } else if (/^pm-/.test(wid)) {
            obj = webclient.pms.pm(id);
        } else if (/^battle-/.test(wid)) {
            obj = webclientUI.battles.battle(id);
        }

        obj.setCurrentTab();
    },

    convertImages: function(element) {
        element = $(element);
        element.find("img").each(function (index, img) {
            img = $(img);
            var src = img.attr("src").split(":"),
                proto = src[0],
                query = src[1];

            switch (proto) {
                case "pokemon":
                    query = "?" + query;
                    var poke = pokeinfo.toArray(utils.queryField("num", query.slice(1).split("&")[0], query) || "1"),
                        gen = utils.queryField("gen", "6", query),
                        shiny = utils.queryField("shiny", "false", query) === "true",
                        gender = utils.queryField("gender", "male", query),
                        back = utils.queryField("back", "false", query) === "true",
                        cropped = utils.queryField("cropped", "false", query) === "true";

                    img.error(function () {
                        if (gender == "female") {
                            gender = "male";
                        } else if (gen < 6) {
                            gen = 6;
                        } else if (gen === 6) {
                            gen = 5;
                        } else if (shiny) {
                            shiny = false;
                        } else if (back) {
                            back = false;
                        } else {
                            return;
                        }

                        img.attr("src", pokeinfo.sprite({num: pokenum, forme: poke[1], female: gender === "female", shiny: shiny}, {gen: gen, back: back}));
                    }).attr("src", pokeinfo.sprite({num: poke[0], forme: poke[1], female: gender === "female", shiny: shiny}, {gen: gen, back: back}));
                    break;
                case "trainer":
                    img.attr("src", pokeinfo.trainerSprite(query));
                    break;
                case "http":
                case "https":
                case "data": /* base64 */
                    break;
                default:
                    console.log("Unknown protocol: " + proto);
                    break;
            }
        });
        return element;
    }
};

vex.defaultOptions.className = 'vex-theme-os';

$(function() {
    webclientUI.linkClickHandler = function (event) {
        var href = this.href,
            sep, cmd, payload, pid;

        if (/^po:/.test(href)) {
            event.preventDefault();

            console.log("trigger " + href);

            sep = href.indexOf("/");
            cmd = href.slice(3, sep);

            payload = decodeURIComponent(href.slice(sep + 1));

            // Add other commands here..
            pid = webclient.players.id(payload);
            if (pid === -1) {
                pid = parseInt(payload, 10);
            }

            if (cmd === "join") {
                webclient.joinChannel(payload);
            } else if (cmd === "pm") { // Create pm window
                if (!isNaN(pid)) {
                    webclient.pms.pm(pid).activateTab();
                }
            } else if (cmd === "ignore") {
                // Ignore the user
                if (!isNaN(pid)) {
                    if (!webclient.players.isIgnored(pid)) {
                        webclient.players.addIgnore(pid);
                    } else {
                        webclient.players.removeIgnore(pid);
                    }
                }
            } else if (cmd === "watch") {
                network.command('watch', {battle: +payload});
            } else if (cmd === "send") {
                webclient.channel.sendMessage(payload);
            } else if (cmd === "setmsg") {
                webclient.channel.chat.input.val(payload);
            } else if (cmd === "appendmsg") {
                webclient.channel.chat.input.val(webclient.channel.chat.input.val() + payload);
            } else if (cmd === "reconnect") {
                //window.location.href= window.location.pathname;
                window.location.reload();
            } else if (cmd === "watch-player") {
                if (webclient.battles.isBattling(+payload)) {
                    network.command('watch', {battle: webclient.battles.battleOfPlayer(+payload)});
                }
            } else if (cmd === "kick") {
                network.command('kick', {id: +payload});
            } else if (cmd === "ban") {
                network.command('ban', {id: +payload});
            } else if (cmd === "idle") {
                var isAway = webclient.players.away(webclient.ownId);
                poStorage.get('player.idle', !isAway);
                //todo : send network command to that effect, and when getting own player, change checkbox value to reflect
            } else if (cmd == "timestamps") {
                webclientUI.timestamps = !webclientUI.timestamps;
                setTimeout(function(){$("#checkbox-timestamps-dd").prop("checked", webclientUI.timestamps)});
            }
        } else {
            if (webclient.connectedToServer && !$(this).attr("target")) {
                /* Make sure link opens in a new window */
                this.target = "_blank";
            }
        }
    };
    /* handle clicks on links, especially with po: urls */
    $(document).on("click", "a", webclientUI.linkClickHandler);

    webclient.players.on("ignoreadd", function(id) {
        webclientUI.printHtml("<em>You ignored " + utils.escapeHtml(webclient.players.name(id)) + ".</em>");
    }).on("ignoreremove", function(id) {
        webclientUI.printHtml("<em>You stopped ignoring " + utils.escapeHtml(webclient.players.name(id)) + ".</em>");
    });


    // $( '.dropdown-menu a.checkbox-dd' ).on( 'click', function( event ) {

    //    var $target = $( event.currentTarget ),
    //        $inp = $target.find( 'input' );

    //     setTimeout( function() { $inp.prop( 'checked', !$inp.prop( 'checked') ) }, 0);

    //    $( event.target ).blur();
    //    //return false;
    // });

    $("#checkbox-timestamps-dd").prop("checked", webclientUI.timestamps);
    $("#checkbox-idle-dd").prop("checked", poStorage.get("player.idle", 'boolean') === null ? true: poStorage.get("player.idle", 'boolean'));
});

window.onbeforeunload = function(e) {
    if (webclient.connectedToServer) {
        return 'Are you sure you want to disconnect from the server?';
    }
};

window.webclientUI = webclientUI;