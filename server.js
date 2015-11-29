/**
 * Server for NOZWCP (Express + Socket.io + Node-openzwave-shared)
 * Thanks to ekarak for node-openzwave-shared
 * @author Joao Henrique Bellincanta Gomes <jonnes1@gmail.com>
 */
var express = require('express');
//var socketioJwt = require('socketio-jwt'); //For autenticate sessions
//var jwt         = require('jsonwebtoken');
//var jwt_secret  = 'tokenNozwcp$';
var fs = require('fs');
var http = require('http');
var socketIo = require('socket.io');
var Localize = require('localize');
var shell = require('shelljs');
var bodyParser = require('body-parser');
var ZWave = require('openzwave-shared');
var ip = require('ip');
var myIP = ip.address();
var port = 3000;
var nodes = [];
var homeidZwave = "";
var usbDevice = "";
var zwave;

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
shell.config.silent = true;

/**
 * Settings form language
 */
var language = new Localize(require(__dirname + '/languages/messages.json'));
//language.setLocale("pt"); Portgues - Brasil
//language.setLocale("es"); Español

/**
 * Send Angular SPA file to NOZWCP application
 */
app.get('*', function (req, res) {
    res.sendFile(__dirname + '/index.html'); // load the single view file (angular will handle the page changes on the front-end)
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
        if (typeof zwave === 'undefined' || zwave === '') {
            try {
                zwave = new ZWave({
                    Logging: true,
                    ConsoleOutput: true,
                    NetworkKey: "0x5f,0xca,0xf4,0xa2,0x3e,0xe3,0xd6,0xb4,0x3e,0xe8,0x04,0x5a,0xf4,0x89,0xa7,0x93"//Change for your security
                });
                /*
                 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                 * ++++++++++++++++++++ Zwave Events +++++++++++++++++++++++
                 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                 */
                zwave.on('driver ready', function (homeid) {
                    homeidZwave = homeid.toString(16);
                    console.log('scanning homeid=0x%s...', homeid.toString(16));
                });

                zwave.on('driver failed', function () {
                    console.error(language.translate("zwaveConnectError"));
                    socket.emit('zwaveConected', 'false');
                    socket.emit('zwaveConectedError', 'false');
                    zwave.disconnect();
                });

                zwave.on('node added', function (nodeid) {
                    nodes[nodeid] = {
                        nodeid: '',
                        manufacturer: '',
                        manufacturerid: '',
                        product: '',
                        producttype: '',
                        productid: '',
                        type: '',
                        name: '',
                        loc: '',
                        classes: {},
                        ready: false,
                    };
                });

                zwave.on('value added', function (nodeid, comclass, value) {
                    if (!nodes[nodeid]['classes'][comclass])
                        nodes[nodeid]['classes'][comclass] = {};
                    nodes[nodeid]['classes'][comclass][value.index] = value;
                });

                zwave.on('value changed', function (nodeid, comclass, value) {
                    if (nodes[nodeid]['ready']) {
                        console.log('node%d: changed: %d:%s:%s->%s', nodeid, comclass,
                                value['label'],
                                nodes[nodeid]['classes'][comclass][value.index]['value'],
                                value['value']);
                    }
                    nodes[nodeid]['classes'][comclass][value.index] = value;
                });

                zwave.on('value removed', function (nodeid, comclass, index) {
                    if (nodes[nodeid]['classes'][comclass] &&
                            nodes[nodeid]['classes'][comclass][index])
                        delete nodes[nodeid]['classes'][comclass][index];
                });

                zwave.on('node ready', function (nodeid, nodeinfo) {
                    nodes[nodeid]['nodeid'] = nodeid;
                    nodes[nodeid]['manufacturer'] = nodeinfo.manufacturer;
                    nodes[nodeid]['manufacturerid'] = nodeinfo.manufacturerid;
                    nodes[nodeid]['product'] = nodeinfo.product;
                    nodes[nodeid]['producttype'] = nodeinfo.producttype;
                    nodes[nodeid]['productid'] = nodeinfo.productid;
                    nodes[nodeid]['type'] = nodeinfo.type;
                    nodes[nodeid]['name'] = nodeinfo.name;
                    nodes[nodeid]['loc'] = nodeinfo.loc;
                    nodes[nodeid]['ready'] = true;
                    console.log('node%d: %s, %s', nodeid,
                            nodeinfo.manufacturer ? nodeinfo.manufacturer
                            : 'id=' + nodeinfo.manufacturerid,
                            nodeinfo.product ? nodeinfo.product
                            : 'product=' + nodeinfo.productid +
                            ', type=' + nodeinfo.producttype);
                    console.log('node%d: name="%s", type="%s", location="%s"', nodeid,
                            nodeinfo.name,
                            nodeinfo.type,
                            nodeinfo.loc);
                    for (comclass in nodes[nodeid]['classes']) {
                        switch (comclass) {
                            case 0x25: // COMMAND_CLASS_SWITCH_BINARY
                            case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
                                zwave.enablePoll(nodeid, comclass);
                                break;
                        }
                        var values = nodes[nodeid]['classes'][comclass];
                        console.log('node%d: class %d', nodeid, comclass);
                        for (idx in values)
                            console.log('node%d:   %s=%s', nodeid, values[idx]['label'], values[idx]['value']);
                    }
                });

                zwave.on('notification', function (nodeid, notif) {
                    switch (notif) {
                        case 0:
                            console.log('node%d: message complete', nodeid);
                            break;
                        case 1:
                            console.log('node%d: timeout', nodeid);
                            break;
                        case 2:
                            console.log('node%d: nop', nodeid);
                            break;
                        case 3:
                            console.log('node%d: node awake', nodeid);
                            break;
                        case 4:
                            console.log('node%d: node sleep', nodeid);
                            break;
                        case 5:
                            console.log('node%d: node dead', nodeid);
                            break;
                        case 6:
                            console.log('node%d: node alive', nodeid);
                            break;
                    }
                });

                zwave.on('scan complete', function () {
                    console.log(language.translate("ZwaveNetworkStartHomeID") + homeidZwave);
                    socket.emit('zwaveConected', 'true');
                    socket.emit('zwaveHomeIdInfo', homeidZwave);
                });

                zwave.on('controller command', function (r, s) {
                    console.log('controller commmand feedback: r=%d, s=%d', r, s);
                });
                
                zwave.connect('/dev/' + usbdevice);
                
            } catch (e) {
                socket.emit('zwaveConected', 'false');
                socket.emit('zwaveConectedError', 'false');
            }
        } else {
            socket.emit('zwaveConected', 'true');
            socket.emit('zwaveHomeIdInfo', homeidZwave);
        }

    });

    /**
     * Event to close zwave connection with controller device
     */
    socket.on('zwaveGetDevices', function () {
        socket.emit('zwaveDevicesList', nodes);
    });

    /**
     * Event to close zwave connection with controller device
     */
    socket.on('zwaveDisconnect', function () {
        zwave.disconnect(usbdevice);
    });

    /**
     * Get Zwave USB device
     */
    socket.on('zwaveGetUsbDevices', function () {
        console.log('Get List of USB Serial Devices');
        shell.ls('/sys/bus/usb-serial/devices/').forEach(function (device) {
            console.log('Serial device found: ' + device);
            socket.emit('zwaveUsbDevices', device);
        });
    });
});

server.listen(port, function () {
    console.log("Server start on: http://" + myIP + ":" + port);
});