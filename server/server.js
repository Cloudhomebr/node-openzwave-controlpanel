/**
 * Server for NOZWCP (Express + Socket.io + Node-openzwave-shared)
 * Thanks to ekarak for node-openzwave-shared
 * @author Joao Henrique Bellincanta Gomes <jonnes1@gmail.com>
 */
var express = require('express');
var fs = require('fs');
var http = require('http');
var socketIo = require('socket.io');
//var socketioJwt = require('socketio-jwt');
//var jwt         = require('jsonwebtoken');
//var jwt_secret  = 'tokenNozwcp$';
var bodyParser = require('body-parser');
var ZWave = require('openzwave-shared');
var ip = require('ip');
var myIP = ip.address();
var port = 3000;
var nodes = [];
var homeidZwave = "";
var usbDevice = "";
var zwave = new ZWave({
    Logging: true,
    ConsoleOutput: true,
    NetworkKey: "0x5f,0xca,0xf4,0xa2,0x3e,0xe3,0xd6,0xb4,0x3e,0xe8,0x04,0x5a,0xf4,0x89,0xa7,0x93" // <16 bytes total>
});
/**
 * Settings for server application (express) and socket.io
 */
var app = express();
var server = http.createServer(app);
var socketIoServer = socketIo.listen(server);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

/**
 * Send Angular SPA file to NOZWCP application
 */
app.get('*', function (req, res) {
    res.sendfile('../index.html'); // load the single view file (angular will handle the page changes on the front-end)
});

/**
 * Socket.io server events and emmiters
 */
socketIoServer.sockets.on('connection', function (socket) {

    /**
     * Event for zwave connect
     * @param: USB device
     */
    socket.on('zwaveConnect', function (usbdeviceSelect) {
        usbdevice = usbdeviceSelect;
        if (typeof zwave === 'undefined') {
            zwave.connect(usbdevice);
        } else {
            socket.broadcast.emit('zwaveConected', '');
        }
    });

    /**
     * Event to close zwave connection with controller device
     */
    socket.on('zwaveDisconnect', function () {
        zwave.disconnect(usbdevice);
    });
    /**
     * Zwave events to socket.io
     */
    zwave.on('scan complete', function () {
        socket.broadcast.emit('zwaveConected', '');
        console.log('====> scan complete, hit ^C to finish.');
        // Add a new device to the ZWave controller
        //zwave.beginControllerCommand('AddDevice', true);
        //zwave.removeNode();
        //zwave.setValue(2,      38,           1,        0,     50);
        console.log("Home ID: " + homeidZwave);
        zwave.setValue(3, 98, 1, 0, true);
        //zwave.addNode(homeidZwave, true); 
    });



});



