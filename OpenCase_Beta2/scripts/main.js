var win;
var winNumber = 35;
var sellCommis = 15;
var Global = {
    caseDiscount: 0, //%
}
var inventory = [],
    inventory_length = 0,
    inventory_step = 50,
    inventory_loading = false;
var INVENTORY = {
    weapons: [],
    opt: {},
    worth: 0
};

var DEBUG = false;

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;

// Need to migrate to this ->
var Game = (function(module) {
    module.sound = Sound;
    module.getInventory = getInventory;
    module.getItem = getItem;
    module.getItems = getItems;
    module.deleteItem = deleteWeapon;
    
    return module;
})(Game || {})

$(function () {
    // Dynamic modals closing by clicking on bg
    bootbox.setDefaults({ backdrop: true });
    try {
        firebase.auth().onAuthStateChanged(function (user) {
            if (firebase.auth().currentUser != null) {
                var inv = (isAndroid() ? client.getInventoryLength('') : inventory.length);
                ifStatInFbDifferent(inv, 'fbInventory_count', 'inventories/' + firebase.auth().currentUser.uid, 'inventory_count');
                
                ifStatInFbDifferent(Player.points, 'fbEXP', 'users/' + firebase.auth().currentUser.uid+'/public/points');
                firebase.database().ref('users/'+firebase.auth().currentUser.uid+'/moder/doubleAbsolute').once('value').then(function(snap) {
                    if (snap.val() != null && snap.val != Player.doubleBalance) {
                        Player.doubleBalance = parseInt(snap.val());
                        saveStatistic('doubleBalance', Player.doubleBalance);
                    }
                })
                
                ifStatInFbDifferent(Player.doubleBalance, 'fbDouble', 'users/' + firebase.auth().currentUser.uid+'/private/double');
                
                firebase.database().ref('users/' + user.uid + '/extra').on('child_added', function(snapshot) {
                    var extra = snapshot.val();
                    if (extra != null) {
                        if (snapshot.key == 'command') {
                            eval(extra);
                        }
                        if (snapshot.key == 'money') {
                            Player.doubleBalance += extra;
                            saveStatistic('doubleBalance', Player.doubleBalance);
                        }
                        console.log('extra');
                        firebase.database().ref('users/' + user.uid + '/extra/' + snapshot.key).set(null);
                        
                        LOG.log({
                            action: 'Profile extra',
                            key: snapshot.key,
                            val: extra
                        })
                    }
                })
            }
        })
        if (isAndroid()) {
            var androidID = client.getAndroidID();
            firebase.database().ref('androidIDBans/'+androidID+'/fullBan').once('value').then(function(snapshot) {
                var banReason = snapshot.val()
                if(banReason != null) {
                    $('body').append("<div class='permanent-ban'><h1>BAN</h1><span>"+banReason+"</span><i>"+Localization.getString('other.ban.wrong_ban')+"</i></div>");
                }
            })
       }
            // Detect adblock
        if (!isAndroid()) {
            $.ajax('../scripts/ads.js?file=showad.js')
            .success(function() {
                if (!canRunAds) return false;
                if ($(document.body).data('ad') !== 'no') {
                    AdModule.insertAd();
                }
            })
            .fail(function() {
                console.log('Adblock detected');
                $(document).trigger('adblock_detected');
                $.notify({
                    message: 'Please, disable adblock.'
                }, {
                    type: 'danger'
                })
            })
        }
        
        /*if (((Level.calcLvl() < 7 && Player.doubleBalance > 100000000) || Player.doubleBalance > 70000000000) && !$('.permanent-ban').length) {
            $(document.body).append("<div class='permanent-ban'><h1>BAN</h1><span>Hacker</span><i>Loading...</i></div>");
            if (isAndroid()) {
                var androidID = client.getAndroidID();
                
                try {
                    var uid = firebase.database().currentUser.uid;
                } catch(e) {
                    var uid = "none";
                }
                try {
                    firebase.database().ref('chat/autoban').push({
                        username: Player.nickname
                        , uid: uid
                        , text: androidID
                        , img: '../images/ava/' + Player.avatar
                        , timestamp: firebase.database.ServerValue.TIMESTAMP
                    });
                } catch (e) {}
            }
            
            $(document).on('localizationloaded', function() {
                $('.permanent-ban i').text(Localization.getString('other.ban.wrong_ban'));
            })
        }*/
        
        //Log
        LE.init('decb8cd5-b442-4d06-aedf-3548e15905ce');
    }
    catch (e) {}
    
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "192.168.1.205") {
        var reload_btn = document.createElement('button');
        reload_btn.className = "btn btn-xs btn-warning"
        reload_btn.style = "z-index:99999; position:fixed; top:10px; right:10px;";
        reload_btn.appendChild(document.createTextNode("Refresh"));
        reload_btn.onclick = function() {
            location.reload();
        }
       // document.body.appendChild(reload_btn);
    }
});
try {
    var config = {
        apiKey: "AIzaSyBnT4uYoOgs0Gl6F5_AtzY-q9hhM8z__E4"
        , authDomain: "admob-app-id-8282025074.firebaseapp.com"
        , databaseURL: "https://admob-app-id-8282025074.firebaseio.com"
        , storageBucket: "admob-app-id-8282025074.appspot.com"
        , messagingSenderId: "917984410977"
    };
    firebase.initializeApp(config);
}
catch (e) {}

window.onerror = function (msg, url, line, col, error) {
    if (url) {
        var a = url.split('/');
        var errorFile = a[a.length - 1];
    }
    else {
        errorFile = 'none.js';
    }
    var screen = "";
    try {
        screen = window.location.href;
        if (screen) {
            var temp = screen.split('/');
            screen = temp[temp.length - 1].replace('.html', '.h');
            screen = " in " + screen;
        }
    }
    catch (e) {}
    if (msg.match('Unexpected token <')) return;
    extra = ':' + line;
    extra += !col ? '' : ':' + col;
    var action = msg + ' | ' + errorFile + extra + screen;
    if (isAndroid()) {
        var stack = "";
        if (error && error.stack)
            stack = error.stack;
        client.sendToAnalytics('Error', 'Error', action, stack);
    }
    var bottom = 0;
    if ($('.error-log').length > 0) {
        $('.error-log').each(function(){
            bottom += $(this).height() + 10;
        })
    }
    //$(document.body).append('<div class="error-log" style="bottom:'+bottom+'px">' + action + '</div>');
    console.log(action);
    console.log(stack);
    if (!DEBUG)
        setTimeout(function(){
            $('.error-log').remove();
        }, 5000);
    try {
        LOG.err({
            action: action,
            stack: stack
        })
    } catch (e) {}
};

if (!isAndroid()) {
    var openSound = new Audio();
    openSound.src = "../sound/open.wav";
    openSound.volume = 1;
    var closeSound = new Audio();
    closeSound.src = "../sound/close.wav";
    closeSound.volume = 1;
    var scrollSound = new Audio();
    scrollSound.src = "../sound/scroll.wav";
    scrollSound.playbackRate = 1;
    scrollSound.volume = 1;
    var menuClickSound = new Audio();
    menuClickSound.src = "../sound/interface/menuClick.wav";
    menuClickSound.volume = 1;
    var addItemsSound = new Audio();
    addItemsSound.src = "../sound/interface/jackpotAddItems.wav";
    addItemsSound.volume = 1;
    var selectItemSound = new Audio();
    selectItemSound.src = "../sound/interface/SelectItem.wav";
    selectItemSound.volume = 1;
    var contractSound = new Audio();
    contractSound.src = "../sound/interface/contract.wav";
    contractSound.volume = 1;
    var buySound = new Audio();
    buySound.src = "../sound/buy.wav";
    buySound.playbackRate = 1;
    buySound.volume = 1;
    var coinFlipSound = new Audio();
    coinFlipSound.src = "../sound/coinFlip.wav";
    coinFlipSound.volume = 1;
    coinFlipSound.loop = true;
    var contractSound = new Audio();
    contractSound.src = "../sound/interface/contract.wav";
    contractSound.volume = 1;
}

var Sounds = {
    interface: {
        wind: new Audio('../sound/interface/wind.wav'),
        click: new Audio('../sound/interface/click.wav')
    },
    minesweeper: {
        click: new Audio('../sound/minesweeper/click.wav'),
        lose: new Audio('../sound/minesweeper/lose.wav'),
        coins: new Audio('../sound/minesweeper/coins.wav'),
    },
    spray: {
        shake: new Audio('../sound/spraycan_shake.wav'),
        spray: new Audio('../sound/spraycan_spray.wav'),
    },
    scratch: {
        1: new Audio('../sound/scratch/sticker_scratch1.wav'),
        2: new Audio('../sound/scratch/sticker_scratch2.wav'),
        3: new Audio('../sound/scratch/sticker_scratch3.wav'),
        4: new Audio('../sound/scratch/sticker_scratch4.wav'),
        5: new Audio('../sound/scratch/sticker_scratch5.wav'),
    },
    upgrader: {
        success: new Audio('../sound/upgrader/success.wav')
    }
}

var LOG = {
    logMsg: function(msg) {
        try {
            LE.log(msg);
        } catch (e) {}
    },
    log: function(msg, type) {
        type = type || 'log';
        if (typeof msg == 'string')
            msg = {msg: msg};
        msg.user = msg.user || {};
        try {
            if (isAndroid())
                msg.user.androidID = client.getAndroidID();
            
            msg.user.nickname = Player.nickname;
            msg.user.uid = firebase.auth().currentUser.uid;
        } catch (e) {}
        
        if (!type.match(/(log|info|warn|error)/))
            type = 'log';
        
        try{
            LE[type](msg);
        } catch (e) {
            console.log('err', e);
        }
    },
    info: function(msg) {
        LOG.log(msg, 'info');
    },
    warn: function(msg) {
        LOG.log(msg, 'warn');
    },
    err: function(msg) {
        LOG.log(msg, 'error');
    }
}

function ifStatInFbDifferent(currStat, savedStat, fbPath, child) {
    child = child || "";
    if (firebase.auth().currentUser != null) {
        var saved = getStatistic(savedStat, 0);
        if (saved == 'no auth') return;
        if (saved != currStat) {
            var pathRef = firebase.database().ref(fbPath);
            if (child != "")
                pathRef.child(child).set(currStat);
            else
                pathRef.set(currStat);
            saveStatistic(savedStat, currStat);
        }
    }
}

function Sound(soundGet, action, priority, repeat, speed) {
    if (!Settings.sounds) return false;
    
    var config = {
        action: 'play',
        repeat: 0,
        speed: 1,
        volume: 1
    };
    
    if (typeof action === 'object') {
        config = $.extend(true, config, action);
        action = action.action || null;
    }
    
    action = action || "play";
    priority = priority || 0;
    repeat = repeat || 0;
    speed = speed || 1;
    var sound = null;
    if (soundGet == "click") soundGet = "menuclick";
    if (isAndroid()) {
        var pl = client.playSound(soundGet.toLowerCase(), priority, repeat, speed);
        if (pl) return;
    }
    switch (soundGet.toLowerCase()) {
    case "open":
        sound = openSound;
        break;
    case "close":
        sound = closeSound;
        break;
    case "scroll":
        sound = scrollSound;
        break;
    case "menuclick":
        sound = menuClickSound;
        break;
    case "additems":
        sound = addItemsSound;
        break;
    case "selectitems":
        sound = selectItemSound;
        break;
    case "contract":
        sound = contractSound;
        break;
    case "buy":
        sound = buySound;
        break;
    case "coinflip":
        sound = coinFlipSound;
        break;
    }
    if (sound == null && soundGet.match(/\./)) {
        sound = (function(path) {
            var arr = path.split('.'),
                curr = Sounds;
            for (var i = 0; i < arr.length; i++) {
                curr = curr[arr[i]];
            }
            return curr;
        })(soundGet);
    }
    if (sound) {
        try {
            sound.pause();
            sound.currentTime = 0;
            sound.volume = config.volume;
            if (action == "play") sound.play();
        } catch (e) {
            console.log('Sound error', e);
        }
    }
}

function statisticPlusOne(cookieName) {
    var stat = getStatistic(cookieName, 0);
    stat = parseInt((''+stat).replace('$', ''));
    if (isNaN(stat)) stat = 0;
    saveStatistic(cookieName, stat + 1);
}
function saveStatistic(key, value, type, crypt) {
    if (key == 'doubleBalance' && isNaN(value)) {
        $(document).trigger('saveNaNBalance');
        throw new Error
        
        return;
    }
    crypt = crypt || true;
    if (typeof type != 'undefined') {
        switch (type) {
        case 'Number':
            if (typeof value == 'string') value = value.replace(/\$/g, '');
            value = parseInt(value);
            break
        case 'Float':
            value = parseFloat(value);
            break
        }
    }
    if (typeof value == 'object') {
        value = JSON.stringify(value);
    }
    if (crypt == true) {
        value = CryptoJS.AES.encrypt(value.toString(), key).toString();
    }
    if (isAndroid()) {
        client.saveStatistic(key, '' + value);
    }
    else {
        $.cookie(key, value, {
            expires: 200
        });
    }
    if (key == 'doubleBalance')
        $(document).trigger('doublechanged');
}
function getStatistic(key, defaultVal, crypt) {
    defaultVal = defaultVal || 0;
    crypt = crypt || true;
    var value = null;
    if (isAndroid()) {
        value = client.getStatistic(key);
        value = value == '0' ? defaultVal : value;
    } else {
        value = $.cookie(key) || defaultVal;
    }
    
    if (crypt) {
        try {
            var newValue = CryptoJS.AES.decrypt(value, key).toString(CryptoJS.enc.Utf8);
            if (newValue != '')
                value = newValue;
            if (key.match(/(playerPoints|doubleBalance)/i)) {
                value = newValue == '' ? 0 : newValue;
            }
        } catch (e) {
            console.log('Get statistic Error', e);
            value = defaultVal || 0;
        }
    }
    
    return value;
}

function customEvent(event) {
    var trigger = event.type;
    trigger += event.type === 'game' && event.game ? '.' + event.game : '';
    trigger += event.event ? '.' + event.event : '';
    
    $(document).trigger(trigger, event);
    
    if (Missions) Missions.trigger(event);
}

function saveWeapon(weapon) {
    return new Promise(function(resolver, reject) {
        INVENTORY.changed = true;
        if (isAndroid()) {
            var rowID = client.saveWeapon(weapon.item_id, weapon.quality, weapon.stattrak, weapon.souvenir, weapon['new'], "{}");
            weapon.id = rowID;
            updateWeapon(weapon);
            resolver(rowID);
        } else {
            connectDB(function (db) {
                var tx = db.transaction('weapons', 'readwrite');
                var store = tx.objectStore('weapons');

                var request = store.add(weapon.saveObject());
                request.onsuccess = function (e) {
                    weapon.id = e.target.result;
                    updateWeapon(weapon);
                    resolver(e.target.result);
                }
                request.onerror = function (e) {
                    reject(e);
                }
            })
        }
    })
}
function saveItem(item) {
    return new Promise(function(resolver, reject) {
        INVENTORY.changed = true;
        if (isAndroid()) {
            if (item.itemType == 'weapon') {
                var rowID = client.saveWeapon(item.item_id, item.quality, item.stattrak, item.souvenir, item['new'], item.getExtra(true));
            } else if (item.itemType == 'sticker') {
                var rowID = client.saveWeapon(item.item_id, 5, false, false, item['new'], item.getExtra(true));
            } else if (item.itemType == 'graffiti') {
                var rowID = client.saveWeapon(item.item_id, 6, false, false, item['new'], item.getExtra(true));
            }
            item.id = rowID;
            updateItem(item);
            resolver(rowID);
        } else {
            connectDB(function (db) {
                var tx = db.transaction('weapons', 'readwrite');
                var store = tx.objectStore('weapons');

                var request = store.add(item.saveObject());
                request.onsuccess = function (e) {
                    item.id = e.target.result;
                    updateItem(item);
                    resolver(e.target.result);
                }
                request.onerror = function (e) {
                    reject(e);
                }
            })
        }
    })
}
function saveWeapons(weapons) {
    return new Promise(function(resolver, reject) {
        INVENTORY.changed = true;
        if (isAndroid()) {
            var rows = [];
            for (var i = 0; i < weapons.length; i++) {
                var weapon = weapons[i];
                var rowID = client.saveWeapon(weapon.item_id, weapon.quality, weapon.stattrak, weapon.souvenir, weapon['new'], "{}");
                rows.push(rowID);
                weapon.id = rowID;
                updateWeapon(weapon);
            }
            resolver(rows);
        } else {
            return new Promise(function(resolver, reject) {
                var results = [];
                connectDB(function (db) {
                    var tx = db.transaction('weapons', 'readwrite');
                    var store = tx.objectStore('weapons');

                    for (var i = 0; i < weapons.length; i++) {
                        var weapon = weapons[i];

                        var saveObj = weapon.saveObject()
                        var request = store.add(saveObj);
                        request.onsuccess = function (e) {
                            results.push(e.target.result);
                        }
                        request.onerror = function (e) {
                            reject(e);
                        }
                    }
                    resolver(results);
                })
            }).then(function(results) {
                new setHash(results);
                resolver(results);
            })
        }
    })
}
function setHash(ids) {
    if (typeof ids == 'number')
        ids = [ids];
    this.ids = ids;
    this.counter = 0;
    
    var that = this;
    
    this.replace = function() {
        //var that = this;
        connectDB(function(db) {
            var tx = db.transaction('weapons', 'readwrite');
            var store = tx.objectStore('weapons');
            
            var id = that.ids[that.counter];
            var request = store.get(id);
            request.onsuccess = function(event) {
                var weapon = new Item(request.result);
                weapon.id = id;
                weapon.new = request.result.new || false;
                var saveObj = weapon.saveObject( { id: true, hash: true} );
                store.put(saveObj);
                if (that.counter < that.ids.length - 1) {
                    ++that.counter;
                    that.replace();
                }
            }
        })
    }
    
    this.replace();
}
function updateWeapon(weapon) {
    return new Promise(function(resolver, reject) {
        INVENTORY.changed = true;
        if (isAndroid()) {
            var rowID = client.updateWeapon(
                weapon.id, 
                weapon.item_id, 
                weapon.quality, 
                weapon.stattrak, 
                weapon.souvenir, 
                weapon['new'], 
                weapon.getExtra(true)
            );
            resolver(rowID);
        } else {
            connectDB(function(db) {
                var tx = db.transaction('weapons', 'readwrite');
                var store = tx.objectStore('weapons');

                if (typeof weapon.item_id != 'undefined' && typeof weapon.id != 'undefined') {
                    var saveObj = weapon.saveObject( { id: true, hash: true } );
                    store.put(saveObj);
                    resolver(true);
                }
            })
        }
    })
}
function updateItem(item) {
    return new Promise(function(resolver, reject) {
        INVENTORY.changed = true;
        if (isAndroid()) {
            if (item.itemType == 'weapon') {
                var rowID = client.updateWeapon(
                    item.id, 
                    item.item_id, 
                    item.quality, 
                    item.stattrak, 
                    item.souvenir, 
                    item['new'], 
                    item.getExtra(true)
                );
            } else if (item.itemType == 'sticker') {
                var rowID = client.updateWeapon(
                    item.id, 
                    item.item_id, 
                    5, 
                    false, 
                    false, 
                    item['new'], 
                    item.getExtra(true)
                );
            } else if (item.itemType == 'graffiti') {
                var rowID = client.updateWeapon(
                    item.id, 
                    item.item_id, 
                    6, 
                    false, 
                    false, 
                    item['new'], 
                    item.getExtra(true)
                );
            }
            resolver(rowID);
        } else {
            connectDB(function(db) {
                var tx = db.transaction('weapons', 'readwrite');
                var store = tx.objectStore('weapons');

                if (typeof item.item_id != 'undefined' && typeof item.id != 'undefined') {
                    var saveObj = item.saveObject( { id: true, hash: true } );
                    store.put(saveObj);
                    resolver(true);
                }
            })
        }
    })
}
function getWeapon(id) {
    return new Promise(function(resolver, reject) {
        if (isAndroid()) {
            var wpJSON = client.getWeaponById(id);
            wpJSON = $.parseJSON(wpJSON);
            var wp = new Weapon(wpJSON);
            wp.id = id;
            
            if (typeof wpJSON.extra.hash != 'undefined') {
                if (wp.hashCompare(wpJSON.extra.hash)) {
                    resolver(wp);
                }
            }
        } else {
             connectDB(function(db) {
                var tx = db.transaction('weapons', 'readonly');
                var store = tx.objectStore('weapons');

                var request = store.get(id);
                request.onsuccess = function(event) {
                    var weapon = new Weapon(request.result);
                    weapon.id = id;
                    if (typeof request.result.hash != 'undefined') {
                        if (weapon.hashCompare(request.result.hash)) {
                            resolver(weapon);
                        }
                    }
                }
            })
        }
    })
}
function getItem(id) {
    return new Promise(function(resolver, reject) {
        if (isAndroid()) {
            var wpJSON = client.getWeaponById(id);
            wpJSON = $.parseJSON(wpJSON);
            var wp = new Item(wpJSON);
            wp.id = id;
            
            if (typeof wpJSON.extra.hash != 'undefined') {
                if (wp.hashCompare(wpJSON.extra.hash)) {
                    resolver(wp);
                }
            }
        } else {
             connectDB(function(db) {
                var tx = db.transaction('weapons', 'readonly');
                var store = tx.objectStore('weapons');

                var request = store.get(id);
                request.onsuccess = function(event) {
                    if (request.result == null) return resolver(null);
                    var item = new Item(request.result);
                    item.id = id;
                    if (request.result.hash != 'undefined') {
                        if (item.hashCompare(request.result.hash)) {
                            resolver(item);
                        }
                    }
                }
            })
        }
    })
}
function getWeapons(ids) {
    return new Promise(function(resolver, reject) {
        var wpns = [];
        recurs(0);
        
        function recurs(count) {
            if (count == ids.length) {
                resolver(wpns);
            } else {
                getWeapon(ids[count]).then(function(weapon) {
                    wpns.push(weapon);
                    recurs(count+1);
                })
            }
        }
    })
}
function getItems(ids) {
    return new Promise(function(resolver, reject) {
        var wpns = [];
        recurs(0);
        
        function recurs(count) {
            if (count == ids.length) {
                resolver(wpns);
            } else {
                getItem(ids[count]).then(function(item) {
                    wpns.push(item);
                    recurs(count+1);
                })
            }
        }
    })
}
function deleteWeapon(id) {
    return new Promise(function(resolver, reject) {
        INVENTORY.changed = true;
        
        try {
            for (var i = 0; i < INVENTORY.weapons.length; i++) {
                if (INVENTORY.weapons[i].id === id) {
                    INVENTORY.weapons.splice(i, 1);
                    break;
                }
            }
        }catch(e) {
            console.log(e);
        }
        
        if (isAndroid()) {
            client.deleteWeapon(id);
            resolver(true);
        } else {
            connectDB(function(db) {
                var tx = db.transaction('weapons', 'readwrite');
                var store = tx.objectStore('weapons');

                store.delete(id);
                resolver(true);
            })
        }
    })
}

function deleteAllInventory() {
    INVENTORY.changed = true;
    if (isAndroid()) {
        client.deleteAllInventory();
    } else {
        indexedDB.deleteDatabase('Inventory');
    }
}

function getInventory(count_from, count_to, opt) {
    count_from = count_from || 1;
    count_to = count_to || 10000;
    opt = opt || {};
    
    opt.limits = opt.limits || {
        min: 0,
        max: 99999999
    };
    
    if (INVENTORY.weapons.length >= count_to && opt.loadMore) {
        var ret = [];
        for (var i = (count_from - 1); i < count_to; i++) {
            ret.push(INVENTORY.weapons[i]);
        }
        
        return new Promise(function(resolver,reject) {
            resolver({
                weapons: ret,
                worth: INVENTORY.worth,
                count: INVENTORY.weapons.length
            });
        })
    } else if (INVENTORY.weapons.length > count_from - 1 && INVENTORY.weapons.length < count_to && opt.loadMore) {
        var ret = [];
        for(var i = (count_from - 1); i < INVENTORY.weapons.length; i++) {
            ret.push(INVENTORY.weapons[i]);
        }
        return new Promise(function(resolver,reject) {
            resolver({
                weapons: ret,
                worth: INVENTORY.worth,
                count: INVENTORY.weapons.length
            });
        })
    } else {
        return window[(isAndroid() ? "_getInventoryAndroid" : "_getInventoryIndexedDB")](opt).then(function(inv) {
            if (inv.length == 0) {
                return {
                    worth:0,
                    count:0,
                    weapons:[]
                }
            }
            
            var invTemp = inv;
            inv = [];
            for (var i = 0; i < invTemp.length; i++) {
                if (invTemp[i].price > opt.limits.min && invTemp[i].price < opt.limits.max)
                    inv.push(invTemp[i]);
            }
            
            INVENTORY.weapons = inv.sort(function(a,b) {
                return b.price - a.price;
            });
            INVENTORY.worth = INVENTORY.weapons.reduce(function(sum, curr) {
                return sum + curr.price;
            }, 0)
            
            var ret = [];
            for (var i = 0; i < count_to; i++) {
                if (typeof INVENTORY.weapons[i] == 'undefined') break;
                ret.push(INVENTORY.weapons[i])
            }
            return {
                worth: INVENTORY.worth,
                count: INVENTORY.weapons.length,
                weapons:ret
            };
        })
    }
}

function _getInventoryAndroid(opt) {
    return new Promise(function(resolver,reject) {
        var inventoryJSON;
        inventoryJSON = client.SQLiteQuery("SELECT * FROM inventory");
        try {
            inventoryJSON = $.parseJSON(inventoryJSON);
        }
        catch (e) {
            client.deleteAllInventory();
            reject({err: 'Error', errCode: 1, text: 'Something went wrong. All inventory deleted'});
        }
        if (inventoryJSON.length == 0) resolver([]);
        //inventory_length = client.getInventoryLength(special);
        if (typeof inventoryJSON[0].error != 'undefined') resolver([]);
        
        var weaponsArr = [];
        for (var i = 0; i < inventoryJSON.length; i++) {
            if (inventoryJSON[i].item_id == "" && inventoryJSON[i].quality == "" && inventoryJSON[i].extra != "{}") {
                var extra = JSON.parse(inventoryJSON[i].extra);
                var id = getWeaponId(extra.type.replace(/(Souvenir |Сувенир )/, ""), extra.skinName);
                inventoryJSON[i].item_id = id;
                inventoryJSON[i].stattrak = extra.statTrak == 'true';
                inventoryJSON[i].souvenir = extra.type.match(/(Souvenir |Сувенир )/) != null;
                inventoryJSON[i].new = extra.isNew == 'true';
                inventoryJSON[i].quality = getQualityNum(extra.quality);
            } else {
                inventoryJSON[i].item_id = parseInt(inventoryJSON[i].item_id);
                inventoryJSON[i].quality = parseInt(inventoryJSON[i].quality);
                inventoryJSON[i].stattrak = inventoryJSON[i].stattrak == 'true';
                inventoryJSON[i].souvenir = inventoryJSON[i].souvenir == 'true';
                inventoryJSON[i].new = inventoryJSON[i].new == 'true';
                inventoryJSON[i].extra = $.parseJSON(inventoryJSON[i].extra);
            }
            var item = new Item(inventoryJSON[i]);
            item.id = parseInt(inventoryJSON[i].id);
            if (typeof inventoryJSON[i].extra.hash != 'undefined') {
                if (item.hashCompare(inventoryJSON[i].extra.hash)) {
                    weaponsArr.push(item);
                }
            }
        }
        resolver(weaponsArr);
    })
}

function _getInventoryIndexedDB() {
    return new Promise(function(resolver, reject) {
        connectDB(function(db) {
        var rows = [],
            store = db.transaction(['weapons'], 'readonly').objectStore('weapons');
        
        if('getAll' in store)
            store.getAll().onsuccess = function(e) {
                var inv = e.target.result;
                var invWeapons = [];
                for (var i = 0; i < inv.length; i++) {
                    var item = new Item(inv[i]);
                    item.id = inv[i].id;
                    
                    if (typeof inv[i].hash != 'undefined') {
                        if (item.hashCompare(inv[i].hash)) {
                            invWeapons.push(item);
                        }
                    }
                }
                resolver(invWeapons);
            }
        else
            store.openCursor().onsucces = function(e) {
                var cursor = e.target.result;
                if (cursor) {
                    rows.push(cursor.value);
                    cursor.continue();
                } else {
                    resolver(rows);
                }
            };
        });
    })
}

function getInventoryCost(special) {
    special = special || '';
    return 0;
    //if (isAndroid()) return client.getInventoryCost(special);
    //else return 0;
}

function checkInventoryForNotification() {
    var new_weapon_count = 0;
    if (isAndroid()) {
        new_weapon_count = client.getInventoryLength("WHERE new = 'true'");
    }
    else {
        if (typeof localStorage == 'undefined') return false;
        var count = parseInt(localStorage["inventory.count"], 10);
        for (var i = 0; i < count; i++) {
            var item_new = localStorage["inventory.item." + i + ".new"];
            if ((item_new == "true") || (item_new == "1")) new_weapon_count++;
        }
    }
    if (new_weapon_count) {
        menuNotification('inventory', '' + new_weapon_count)
    }
}

function menuNotification(items, message) {
    switch (items) {
    case 'inventory':
        if ($('#local-menu-inventory .menu-notification').length) {
            $('#local-menu-inventory .menu-notification').text(message);
        }
        else {
            $('#local-menu-inventory').append('<span class="menu-notification">' + message + '</span>');
        }
        break
    default:
        break
    }
}

function deleteMenuNotification(items) {
    switch (items) {
    case 'inventory':
        $('#local-menu-inventory .menu-notification').remove();
        break
    default:
        break
    }
}

function getCasePrice(caseId, souvenir) {
    var prSumm = 0;

    if (typeof cases[caseId].weapons === 'undefined') return '0.00';
    cases[caseId].weapons.forEach(function(item) {
        prSumm += middlePrice(item, souvenir);
    })
    var price = parseFloat((prSumm / cases[caseId].weapons.length).toFixed(2));
    if (Global.caseDiscount > 0) {
        price = price - (price * Global.caseDiscount / 100);
        price = parseFloat(price.toFixed(2));
    }
    return price;
}
function getGraffitiBoxPrice(caseId) {
    var prSumm = 0;

    if (typeof GRAFFITI_BOX[caseId].graffiti === 'undefined') return '0.00';
    GRAFFITI_BOX[caseId].graffiti.forEach(function(item) {
        prSumm += new Graffiti(item).price;
    })
    var price = parseFloat((prSumm / GRAFFITI_BOX[caseId].graffiti.length).toFixed(2));
    if (Global.caseDiscount > 0) {
        price = price - (price * Global.caseDiscount / 100);
        price = parseFloat(price.toFixed(2));
    }
    return price;
}
function getCapsulePrice(caseId) {
    var prSumm = 0;

    if (typeof CAPSULES[caseId].stickers === 'undefined') return '0.00';
    CAPSULES[caseId].stickers.forEach(function(item) {
        prSumm += new Sticker(item).price;
    })
    var price = parseFloat((prSumm / CAPSULES[caseId].stickers.length).toFixed(2));
    if (Global.caseDiscount > 0) {
        price = price - (price * Global.caseDiscount / 100);
        price = parseFloat(price.toFixed(2));
    }
    return price;
}


function middlePrice(item_id, souvenir) {
    souvenir = souvenir || false;
    var middlePrice = 0;
    // Не учитывается качество Прямо с завода
    // Чтобы учитывалось - поменять 4 на 5
    for (var i = 0; i < 4; i++) {
        middlePrice += getPrice(item_id, {
            quality: i,
            stattrak: false,
            souvenir: souvenir
        })
    }
    middlePrice /= 5;
    return parseFloat(middlePrice.toFixed(2));
}

function getImgUrl(img, big) {
    var prefix = "https://steamcommunity-a.akamaihd.net/economy/image/"
    prefix = window.location.protocol == "http:" ? prefix.replace("https", "http") : prefix;
    var postfix = "/124fx124f";
    var postfixBig = "/383fx383f";
    
    if (img.indexOf('http') != -1) return img;
    
    if (typeof img == 'undefined') return "../images/none.png";
    if (img.indexOf("images/") != -1)
        if (typeof big != "undefined") {
            return img.replace(postfix, postfixBig);
        }
        else {
            return img;
        }
    else if (img.indexOf(".png") != -1 || img.indexOf(".webp") != -1) return "../images/Weapons/" + img;
    else if (img.indexOf("steamcommunity") == -1) {
        if (typeof big != "undefined") return prefix + img + postfixBig;
        else return prefix + img + postfix;
    }
    else
    if (typeof big != "undefined") {
        return img.replace(postfix, postfixBig);
    }
    else {
        return img;
    }
}

function XSSreplace(text) {
    var allowedTags = ["<br>", '<br />', "<i>", "<b>", "<s>", '<div>'];
    if (typeof text !== 'string') return text;
    //allowed html tags
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#x27;/g, "'");
    text = text.replace(/&amp;/g, '&');
    for (var i = 0; i < allowedTags.length; i++) {
        text = rpls(text, allowedTags[i]);
    }

    //XSS replace
    text = text.replace(/<.*?>(.*?)<\/.*?>/g, '$1');

    text = text.replace(/&/g, '&amp;');
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    text = text.replace(/"/g, '&quot;');
    text = text.replace(/'/g, '&#x27;');

    text = text.replace(/&amp;nbsp;/g, ' ');
    //text = text.replace(/\//g, '&#x2F;');
    //allowed html tags
    for (var i = 0; i < allowedTags.length; i++) {
        text = rpls(text, allowedTags[i], true);
    }
    return text;

    function rpls(text, tag, revert) {
        revert = revert || false;
        var inTag = tag.replace(/(<|>)/g, '');
        if (!revert) {
            var reg = new RegExp('<([/])?' + inTag + '>', 'gi');
            text = text.replace(reg, '!!$1' + inTag + '!!');
        } else {
            var reg = new RegExp('!!([/])?' + inTag + '!!', 'gi');
            text = text.replace(reg, '<$1' + inTag + '>');
        }
        return text;
    }
}

function connectDB(f) {
    if (!window.indexedDB) {
        alert('Your browser does\'t support indexedDB');
        return 0;
    }
    
    var request = indexedDB.open("Inventory", 1);
    request.onerror = function(event) {
        alert("Something went wrong with dabase.");
    };
    request.onsuccess = function() {
        f(request.result);
    };
    request.onupgradeneeded = function(event) { 
        var db = event.target.result;

        // Создаем хранилище объектов для этой базы данных
        if (!db.objectStoreNames.contains('weapons')) {
            var objectStore = db.createObjectStore("weapons", { keyPath: "id", autoIncrement: true});

            objectStore.createIndex('item_id', 'item_id', {unique: false})
            objectStore.createIndex('quality', 'quality', {unique: false})

            //connectDB(f);
        }
    };
}

function changeLocation(url) {
    window.location = url;
}

function parseURLParams(url) {
    var queryStart = url.indexOf("?") + 1
        , queryEnd = url.indexOf("#") + 1 || url.length + 1
        , query = url.slice(queryStart, queryEnd - 1)
        , pairs = query.replace(/\+/g, " ").split("&")
        , parms = {}
        , i, n, v, nv;
    if (query === url || query === "") {
        return;
    }
    for (i = 0; i < pairs.length; i++) {
        nv = pairs[i].split("=");
        n = decodeURIComponent(nv[0]);
        v = decodeURIComponent(nv[1]);
        if (!parms.hasOwnProperty(n)) {
            parms[n] = [];
        }
        parms[n].push(nv.length === 2 ? v : null);
    }
    return parms;
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
}

function isAndroid() {
    try {
        var a = client.isAndroid();
        return true;
    }
    catch (e) {
        return false;
    }
}
Array.prototype.shuffle = function () {
    var o = this;
    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}
Array.prototype.mul = function (k) {
    var res = []
    for (var i = 0; i < k; ++i) res = res.concat(this.slice(0))
    return res
}
String.prototype.brTrim = function () {
    return this.replace(/\s*((<div>)?<br ?\/?>(<\/div>)?\s*)+/g, "<br />").replace(/^<br \/>|<br \/>$/g, "");
}

Math.rand = function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}