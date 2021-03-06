var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 10188;
var config = require('./config.js');
var emits = require('./emits.js');
server.listen(port, () => {
    console.log('Server listening at port %d', port);
});
app.use(express.static(path.join(__dirname, 'public')));

/********
variables
********/
var numUsers = 0;
var _gameisOn = false;
var players = [];
var _gameSentence;
var _gameStartTime;

var _results = new Map();


/*******************
socket.io event loop
*******************/
io.on('connection', (socket) => {

    console.log('client connected! socket.id : ' + socket.id);
    socket.on('new message', (data) => {
        console.log('new message from  [' + socket.id + ']');

        var user = getPlayer(socket.id);
        if (_gameisOn) {
            var now = new Date().getTime();
            if (checkDuplication(socket)) {
                evaluate(socket, data, now);
            } else {
                onlyOne(socket);
            }
        } else {
            broadcastMessage(socket, data);
        }
    });

    socket.on('add user', (username) => {
        userJoined(socket, username);
    });

    socket.on('disconnect', () => {
        userLeft(socket);
    });
});


/***********************
business logic functions
***********************/
/*


function handleDay(socket, data) {
    if (data.startsWith('/') && data.endsWith('/')) {

        if (mafiaPoint) {
            socket.emit(emits.NEED_WAIT);
        } else {
            var pointedUser = data.substring(1, data.length - 1);
            if (!validateUserName(pointedUser)) {
                nonExistUser(socket);
            } else {
                var user = getPlayer(socket.id);
                var currentTime = new Date().getTime();
                if (currentTime - user.pointTime > config.GUESS_WAIT_TIME * 1000) {
                    mafiaPointTarget = pointedUser;
                    user.pointTime = currentTime;
                    mafiaPointReceived.set(config.CONST_GUESS_CITIZEN, 0);
                    mafiaPointReceived.set(config.CONST_GUESS_MAFIA, 0);
                    pointMafia(user.name, pointedUser);
                } else {
                    socket.emit(emits.NEED_WAIT);
                }
            }
        }
    } else if (data.startsWith('/') && mafiaPoint && !thumbUpDown) {
        var user = getPlayer(socket.id);
        var result = data.substring(1);
        if (!validateResult(result)) {
            invalidVote(socket);
        } else {

            if (typeof mafiaPointReceived.get(result) !== 'undefined') {
                mafiaPointReceived.set(result, mafiaPointReceived.get(result) + 1);
            } else {
                mafiaPointReceived.set(result, 1);
            }

            mafiaPointCnt++;
            var citizenGuessCnt = mafiaPointReceived.get(config.CONST_GUESS_CITIZEN);
            var mafiaGuessCnt = mafiaPointReceived.get(config.CONST_GUESS_MAFIA);
            voteFeedback(user.name, mafiaPointTarget, result, citizenGuessCnt, mafiaGuessCnt);

            if (mafiaPointCnt === aliveUser) {

                var citizenGuessCnt = mafiaPointReceived.get(config.CONST_GUESS_CITIZEN);
                var mafiaGuessCnt = mafiaPointReceived.get(config.CONST_GUESS_MAFIA);

                var guessResult = {
                    mafiaResult: mafiaGuessCnt,
                    citizenResult: citizenGuessCnt
                };
                mafiaPointCnt = 0;
                if (mafiaGuessCnt >= citizenGuessCnt) {
                    lastSpeak(mafiaPointTarget, guessResult);
                } else {
                    mafiaPoint = false;
                    mafiaPointTarget = '';
                    guessFail(guessResult);
                }
            }
        }
    } else if (data.startsWith('/') && thumbUpDown) {
        var user = getPlayer(socket.id);
        var result = data.substring(1);
        if (!validateKill(result)) {
            invalidKill(socket);
        } else {
            thumbUpDownReceived.set(result, thumbUpDownReceived.get(result) + 1);
            thumbUpDownCnt++;


            var liveCnt = thumbUpDownReceived.get(config.CONST_LIVE);
            var killCnt = thumbUpDownReceived.get(config.CONST_KILL);

            killFeedback(user.name, thumbUpDownTarget, result, liveCnt, killCnt);

            if (thumbUpDownCnt === aliveUser) {

                var voteResult = {
                    liveResult: liveCnt,
                    killResult: killCnt
                };
                if (killCnt > liveCnt) {
                    noticeDead(thumbUpDownTarget, voteResult);
                } else {
                    noticeAlive(thumbUpDownTarget, voteResult);
                }
                thumbUpDown = false;
                mafiaPoint = false;
                thumbUpDownCnt = 0;
                thumbUpDownTarget = '';
                mafiaPointTarget = '';
            }
        }
    }
}

function handleNight(socket, data) {
    if (getRole(socket.username) == roles.CONST_CITIZEN) {
        nightSleep(socket);
    } else if (getRole(socket.username) == roles.CONST_DOCTOR) {
        if (doctorChance) {
            if (data.startsWith('/')) {
                var protectedUser = data.substring(1);
                if (!validateUserName(protectedUser)) {
                    nonExistUser(socket);
                } else {
                    doctorSaveUser = protectedUser;
                    doctorChance = false;
                    doctorConfirm(socket, doctorSaveUser);
                }
            } else {
                nightSleep(socket);
            }
        } else {
            oneOnlyAtNight(socket);
        }
    } else if (getRole(socket.username) == roles.CONST_POLICER) {
        if (policeChance) {
            if (data.startsWith('/')) {
                var policeCheckUser = data.substring(1);
                if (!validateUserName(policeCheckUser)) {
                    nonExistUser(socket);
                } else {
                    var policeCheckUserRole = '시민';
                    if (getRole(policeCheckUser) == roles.CONST_MAFIA) {
                        policeCheckUserRole = '마피아';
                    }
                    policeChance = false;
                    policeConfirm(socket, policeCheckUserRole);
                }
            } else {
                nightSleep(socket);
            }
        } else {
            oneOnlyAtNight(socket);
        }
    } else {
        if (data.startsWith('/')) {
            if (mafiaKill) {
                var pointedUser = data.substring(1);

                if (!validateUserName(pointedUser)) {
                    nonExistUser(socket);
                } else {
                    if (typeof mafiaKillReceived.get(pointedUser) !== 'undefined') {
                        mafiaKillReceived.set(pointedUser, mafiaKillReceived.get(pointedUser) + 1);
                    } else {
                        mafiaKillReceived.set(pointedUser, 1);
                    }
                    mafiaKillCnt++;

                    nightMafiaFeedback(socket.username, pointedUser);
                    var mafiaKillingUser;
                    if (mafiaKillCnt === currentMafiaCnt) {
                        var maxPoint = 0;
                        for (var [key, value] of mafiaKillReceived) {
                            if (value > maxPoint) {
                                mafiaKillingUser = key;
                            }
                        }

                        var nightReport;
                        if (mafiaKillingUser == doctorSaveUser) {
                            nightReport = {
                                isSomeoneDead: false
                            };
                        } else {
                            nightReport = {
                                isSomeoneDead: true,
                                who: mafiaKillingUser
                            };
                        }
                        mafiaKill = false;
                        mafiaKillCnt = 0;
                        mafiaKillReceived = new Map();
                        becomeDay(nightReport);
                    }
                }
            }
        } else {
            nightSleep(socket);
        }
    }
}
*/
function broadcastMessage(socket, data) {
    socket.broadcast.emit(emits.NEW_MESSAGE, {
        username: socket.username,
        message: data
    });
}

function userLeft(socket) {
    --numUsers;
    var currentTime = new Date().getTime();
    console.log('disconnect  [' + socket.id + '] : ' + currentTime);

    for (var i = 0; i < players.length; i++) {
        if (players[i].socketId == socket.id) {
            players.splice(i, 1);
        }
    }

    socket.broadcast.emit(emits.USER_LEFT, {
        username: socket.username,
        numUsers: numUsers
    });
}

function checkDuplication(socket) {
    if (typeof _results.get(socket.username) !== 'undefined') {
        return false;
    } else {
        return true;
    }
}

function evaluate(socket, data, now) {
    if (data === _gameSentence) {
        var elapsedSec = (now - _gameStartTime) / 1000;
        var speed = (_gameSentence.length * 60) / elapsedSec;
        _results.set(socket.username, Math.round(speed));
        sendResult(socket, Math.round(speed));
    } else {
        sendResult(socket, 0);
    }
}

function userJoined(socket, username) {
    var currentTime = new Date().getTime();
    console.log('add user from  [' + socket.id + '] : ' + currentTime);
    var player = {
        socketId: socket.id,
        name: username
    };
    players.push(player);
    socket.username = username;
    ++numUsers;
    socket.emit(emits.USER_LOGIN, {
        numUsers: numUsers
    });

    socket.broadcast.emit(emits.USER_JOINED, {
        username: socket.username,
        numUsers: numUsers
    });

    // if (!gameisOn && numUsers == config.MAXIMUM_USER_COUNT) {
    //     (function(s) {
    //         setTimeout(function() {
    //             startGame(s);
    //         }, 5000);
    //     })(socket);
    // }

    return true;
}

setInterval(function() {
    startGame();
}, 20000);

function startGame() {
    var gameSentence = getNewGameSentence();
    setTimeout(function() {
        broadcastReady(3);
        setTimeout(function() {
            broadcastReady(2);
            setTimeout(function() {
                broadcastReady(1);
                setTimeout(function() {
                    broadcastStartGame(gameSentence);
                    setTimeout(function() {
                        broadcastEndGame();
                    }, 10000);
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);
}

function broadcastReady(sec) {
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.READY_GAME, {
            sec: sec
        });
    }
}

function broadcastStartGame(gameSentence) {
    _gameSentence = gameSentence;
    _gameStartTime = new Date().getTime();
    _gameisOn = true;
    _results = new Map();
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.START_GAME, {
            gameSentence: gameSentence
        });
    }
}

function sendResult(socket, speed) {
    socket.emit(emits.EVAL_RESULT, {
        result: speed
    });
}

function onlyOne(socket) {
    socket.emit(emits.ONLY_ONE);
}

function broadcastEndGame() {
    _gameSentence = '';
    _gameisOn = false;

    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.END_GAME, {
            ranking: Array.from(_results)
        });
    }
}

function getNewGameSentence() {
    return "아버지 가방에 들어가신다";
}

function getPlayer(socketId) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].socketId == socketId) {
            return players[i];
        }
    }
}


/*
function startGame(socket) {
    console.log('startGame');
    gameisOn = true;
    socket.broadcast.emit(emits.GAME_READY);
    socket.emit(emits.GAME_READY);
    setRoles();
}

function setRoles() {

    console.log('setRoles');
    var rolesArray = [roles.CONST_MAFIA, roles.CONST_MAFIA, roles.CONST_MAFIA, roles.CONST_CITIZEN, roles.CONST_CITIZEN, roles.CONST_CITIZEN, roles.CONST_POLICER, roles.CONST_DOCTOR];
    var shuffledRole = shuffle(rolesArray);

    var mafiaMembers = '';
    var mafias = [];
    for (var i = 0; i < players.length; i++) {
        players[i].role = shuffledRole[i];
        if (shuffledRole[i] == roles.CONST_MAFIA) {
            mafias.push(players[i]);
            mafiaMembers = mafiaMembers + players[i].name + ',';
        }
    }

    mafiaMembers = mafiaMembers.substring(0, mafiaMembers.length - 1);
    for (var i = 0; i < players.length; i++) {
        roleNotice(players[i].socketId, players[i].role);
    }

    for (var i = 0; i < mafias.length; i++) {
        mafiaNotice(mafias[i].socketId, mafiaMembers);
    }
}

function roleNotice(socketId, role) {
    console.log(socketId + " is " + role);
    io.sockets.connected[socketId].emit(emits.ROLE_NOTICE, {
        roleInfo: role
    });
}

function mafiaNotice(socketId, mafiaMembers) {
    console.log(socketId + " is " + mafiaMembers);
    io.sockets.connected[socketId].emit(emits.MAFIA_NOTICE, {
        mafiaInfo: mafiaMembers
    });
}


function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;

    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}


function becomeNight() {
    dayOrNight = config.CONST_NIGHT;

    policeChance = true;
    doctorChance = true;
    mafiaKill = true;

    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.BECOME_NIGHT);
    }
}

function becomeDay(nightReport) {
    dayOrNight = config.CONST_DAY;

    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.BECOME_DAY, {
            report: nightReport
        });
    }

    if (nightReport.isSomeoneDead) {
        var deadUser;
        var deadUserRole;
        for (var i = 0; i < players.length; i++) {
            if (players[i].name == nightReport.who) {
                deadUser = players[i];
            }
        }
        aliveUser--;
        deadUser.isAlive = false;
        if (deadUser.role == roles.CONST_MAFIA) {
            deadUserRole = '마피아';
            currentMafiaCnt--;
        } else {
            deadUserRole = '선량한 시민';
            currentCitizenCnt--;
        }
        if (currentCitizenCnt == currentMafiaCnt) {
            for (var i = 0; i < players.length; i++) {
                io.sockets.connected[players[i].socketId].emit(emits.MAFIA_WIN);
            }
            gameisOn = false;
        } else if (currentMafiaCnt == 0) {
            for (var i = 0; i < players.length; i++) {
                io.sockets.connected[players[i].socketId].emit(emits.CITIZEN_WIN);
            }
            gameisOn = false;
        } else {
            noticeAliveUsers(currentMafiaCnt);
        }
    }
}


function lastSpeak(mafiaPointTarget, guessResult) {
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.GUESS_OK, {
            result: guessResult
        });
    }
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.LAST_SPEAK, {
            lastSpeakUser: mafiaPointTarget
        });
    }
    setTimeout(function() {
        thumbUpDown = true;
        thumbUpDownCnt = 0;
        thumbUpDownTarget = mafiaPointTarget;
        thumbUpDownReceived.set(config.CONST_LIVE, 0);
        thumbUpDownReceived.set(config.CONST_KILL, 0);
        for (var i = 0; i < players.length; i++) {
            io.sockets.connected[players[i].socketId].emit(emits.THUMB_UPDOWN, {
                lastSpeakUser: mafiaPointTarget
            });
        }
    }, config.LAST_SPEAK_TIME * 1000);
}

function pointMafia(pointer, pointedUser) {
    mafiaPoint = true;
    mafiaPointCnt = 0;
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.POINT_MAFIA, {
            pointerName: pointer,
            pointedUserName: pointedUser
        });
    }
}

function validateUserName(username) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].name == username && players[i].isAlive) {
            return true;
        }
    }
    return false;
}

function validateResult(result) {
    if (result == config.CONST_GUESS_CITIZEN || result == config.CONST_GUESS_MAFIA) {
        return true;
    } else {
        return false;
    }
}

function validateKill(result) {
    if (result == config.CONST_KILL || result == config.CONST_LIVE) {
        return true;
    } else {
        return false;
    }
}




function getRole(username) {
    var user;
    for (var i = 0; i < players.length; i++) {
        if (players[i].name == username) {
            user = players[i];
        }
    }
    return user.role;
}

function noticeDead(username, voteResult) {
    var deadUser;
    var deadUserRole;
    for (var i = 0; i < players.length; i++) {
        if (players[i].name == username) {
            deadUser = players[i];
        }
    }
    aliveUser--;
    deadUser.isAlive = false;
    if (deadUser.role == roles.CONST_MAFIA) {
        deadUserRole = '마피아';
        currentMafiaCnt--;
    } else {
        deadUserRole = '선량한 시민';
        currentCitizenCnt--;
    }
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.NOTICE_DEAD, {
            name: username,
            deadUser: deadUserRole,
            result: voteResult
        });
    }

    if (currentCitizenCnt == currentMafiaCnt) {
        for (var i = 0; i < players.length; i++) {
            io.sockets.connected[players[i].socketId].emit(emits.MAFIA_WIN);
        }
        gameisOn = false;
    } else if (currentMafiaCnt == 0) {
        for (var i = 0; i < players.length; i++) {
            io.sockets.connected[players[i].socketId].emit(emits.CITIZEN_WIN);
        }
        gameisOn = false;
    } else {
        var aliveUsers = getAliveUsers();
        becomeNight();
        noticeDoctor(aliveUsers);
        noticePolice(aliveUsers);
        noticeMafia(aliveUsers);
    }
}



function voteFeedback(voter, pointedUser, vote, citizenGuessCnt, mafiaGuessCnt) {
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.VOTE_FEEDBACK, {
            voterName: voter,
            pointedUserName: pointedUser,
            vote: vote,
            currentCitizenGuess: citizenGuessCnt,
            currentMafiaGuess: mafiaGuessCnt
        });
    }
}

function killFeedback(voter, thumbUpDownTarget, result, liveCnt, killCnt) {
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.KILL_FEEDBACK, {
            voterName: voter,
            pointedUserName: thumbUpDownTarget,
            vote: result,
            currentLive: liveCnt,
            currentKill: killCnt
        });
    }
}

function noticeAlive(username, voteResult) {
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.NOTICE_ALIVE, {
            aliveUser: username,
            result: voteResult
        });
    }
    noticeAliveUsers(currentMafiaCnt);
}

function guessFail(guessResult) {
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.GUESS_FAIL, {
            result: guessResult
        });
    }
    noticeAliveUsers(currentMafiaCnt);
}

function status(socket) {
    var currentStatus = {
        mafia: currentMafiaCnt,
        citizen: currentCitizenCnt
    };
    socket.emit(emits.STATUS, {
        status: currentStatus
    });
}

function nightSleep(socket) {
    socket.emit(emits.NOT_ALLOWED);
}

function doctorConfirm(socket, protectedUser) {
    socket.emit(emits.DOCTOR_CONFIRM, {
        protectedName: protectedUser
    });
}

function policeConfirm(socket, policeCheckUserRole) {
    socket.emit(emits.POLICE_CONFIRM, {
        role: policeCheckUserRole
    });
}

function nightMafiaFeedback(mafia, pointedUser) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].role == roles.CONST_MAFIA) {
            io.sockets.connected[players[i].socketId].emit(emits.MAFIA_FEEDBACK, {
                mafiaName: mafia,
                pointedName: pointedUser
            });
        }
    }
}

function noticeDoctor(aliveUsers) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].role == roles.CONST_DOCTOR) {
            io.sockets.connected[players[i].socketId].emit(emits.DOCTOR_WORK, {
                aliveNames: aliveUsers
            });
        }
    }
}

function noticePolice(aliveUsers) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].role == roles.CONST_POLICER) {
            io.sockets.connected[players[i].socketId].emit(emits.POLICE_WORK, {
                aliveNames: aliveUsers
            });
        }
    }
}

function noticeMafia(aliveUsers) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].role == roles.CONST_MAFIA) {
            io.sockets.connected[players[i].socketId].emit(emits.MAFIA_WORK, {
                aliveNames: aliveUsers
            });
        }
    }
}

function oneOnlyAtNight(socket) {
    socket.emit(emits.ONE_ONLY);
}

function sendHelpManual(socket) {
    socket.emit(emits.HELP_MANUAL);
}

function nonExistUser(socket) {
    socket.emit(emits.USER_NON_EXIST);
}

function invalidVote(socket) {
    socket.emit(emits.INVALID_VOTE);
}

function invalidKill(socket) {
    socket.emit(emits.INVALID_KILL);
}

function checkUser() {

}

function getAliveUsers() {
    var alives = [];
    for (var i = 0; i < players.length; i++) {
        if (players[i].isAlive) {
            alives.push(players[i].name);
        }
    }
    return alives.join();
}

function noticeAliveUsers(currentMafiaCnt) {
    var aliveUsers = getAliveUsers();
    for (var i = 0; i < players.length; i++) {
        io.sockets.connected[players[i].socketId].emit(emits.ALIVE_USERS, {
            names: aliveUsers,
            mafiaCnt: currentMafiaCnt
        });
    }
}
*/
