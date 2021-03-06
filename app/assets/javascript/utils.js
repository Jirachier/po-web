var utils = {
    toAlphanumeric: function (text) {
        return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
    },
    // https://github.com/isaacs/inherits/blob/master/inherits_browser.js
    inherits: function (ctor, superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
    },
    queryField: function (key, default_,query) {
        var match = new RegExp('[?&]' + key + '=([^&]*)')
            .exec(query || window.location.search);
        return (match && decodeURIComponent(match[1].replace(/\+/g, ' '))) || default_;
    },
    // HTML utilities
    escapeHtmlQuotes: function (str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    escapeHtml: function (ret) {
        return (ret||"").replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\b((?:https?|ftp):\/\/\S+)/gi, "<a href='$1' target='_blank'>$1</a>")
            .replace(/&amp;(?=[^\s<]*<\/a>)/g, "&"); /* Revert &amp;'s to &'s in URLs */
    },
    // Unused
    stripHtml: function (str) {
        return str.replace(/<\/?[^>]*>/g, "");
    },
    // Add an option for UTC dates too?
    // And AM/PM (date.getHours() < x)
    addDatePadding: function (date) {
        var str = date.toString();
        return date < 10 ? '0' + str : str;
    },
    timestamp: function () {
        var date = new Date();
        return utils.addDatePadding(date.getHours()) + ":" + utils.addDatePadding(date.getMinutes()) + ":" + utils.addDatePadding(date.getSeconds());
    },
    // channelNames must be a list of lowercase names
    addChannelLinks: function (line, channelNames) {
        var index = line.indexOf('#');
        if (index === -1) {
            return line;
        }

        var str = '', fullChanName, chanName, chr, lastIndex = 0, pos, i;
        while (index !== -1) {
            str += line.substring(lastIndex, index);
            lastIndex = index + 1; // Skip over the '#'

            fullChanName = '';
            chanName = '';

            for (i = 0, pos = lastIndex; i < 20 && (chr = line[pos]); i += 1, pos += 1) {
                fullChanName += chr;
                if (channelNames.indexOf(fullChanName.toLowerCase()) !== -1) {
                    chanName = fullChanName;
                }
            }

            if (chanName) {
                str += "<a href='po:join/" + chanName + "'>#" + chanName + "</a>";
                lastIndex += chanName.length;
            } else {
                str += '#';
            }

            index = line.indexOf('#', lastIndex);
        }

        if (lastIndex < line.length) {
            str += line.substr(lastIndex);
        }

        return str;
    },
    unenumerable: function (obj, key, value) {
        if (!obj.hasOwnProperty(key)) {
            // Enumerable, writable, configurable are false
            Object.defineProperty(obj, key, {
                value: value
            });
        }
    },
    rank: function (auth, set) {
        set = set || utils.rankSet;

        if (auth < 0) {
            auth = 0;
        } else if (auth > 4) {
            auth = 4;
        }

        return set[auth] || '';
    },
    rankStyle: function (str, auth, set) {
        set = set || utils.rankStyleSet;

        if (auth < 0) {
            auth = 0;
        } else if (auth > 4) {
            auth = 4;
        }

        return (set[auth] || '').replace(/\{name\}/gi, str);
    },
    // Shorthand for if (event.which === 13) { callback(); }
    onEnterPressed: function (callback) {
        return function (event) {
            if (event.which === 13) {
                callback.call(this, event);
            }
        };
    }
};

// User, Mod, Admin, Owner, Hidden
utils.rankSet = ['', '+', '+', '+', ''];
utils.rankStyleSet = ['{name}', '<i>{name}</i>', '<i>{name}</i>', '<i>{name}</i>', '{name}'];

utils.unenumerable(String.prototype, 'contains', function (needle) {
    return this.indexOf(needle) !== -1;
});

/* Fast index search in a sorted array */
utils.unenumerable(Array.prototype, 'dichotomy', function (func) {
    if (this.length === 0) return 0;

    var min = 0;
    var max = this.length-1;

    while (1) {
        var half = Math.floor(min+(max-min)/2);

        var cmp = func(this[half]);
        if (min === max) {
            return half + (cmp > 0 ? 1 : 0);
        }

        if (cmp < 0) {
            max = half;
        } else if (cmp > 0) {
            min = (min === half ? max : half);
        } else {
            return half;
        }
    }
});

// Unused
String.prototype.startsWith = function(str) { return this.lastIndexOf(str, 0) === 0; }

window.isActive = true;

$(window).focus(function() {
    window.isActive = true;
});

$(window).blur(function() {
    window.isActive = false;
});

// Unused
/*
function loadjscssfile(filename, filetype){
    if (filetype=="js"){ //if filename is a external JavaScript file
        var fileref=document.createElement('script');
        fileref.setAttribute("src", filename);
    }
    else if (filetype=="css"){ //if filename is an external CSS file
        var fileref=document.createElement("link");
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", filename);
    }
    if (typeof fileref!="undefined") {
        document.getElementsByTagName("head")[0].appendChild(fileref)
    }
}*/

// All unused
/*
//defineOn(String.prototype, {
    format: function () {
        // http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format/4673436#4673436
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    },
    splice: function (pos1, n, replace) {
        return this.slice(0, pos1) + replace + this.slice(pos1+n);
    },
    // Converts xx-yy-zz into Xx-Yy-Zz
    tu: function() {
        var s = this;
        var prevLetter=false;
        for (var i=0; i < s.length; i++) {
            if (/[a-zA-Z]/.test(s[i])) {
                if (!prevLetter){s[i] = s[i].toUpperCase()}
                prevLetter = true;
            } else {
                prevLetter = false;
            }
        }
        return s;
    }
});
*/
