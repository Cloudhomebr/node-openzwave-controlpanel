/**
 * Server for NOZWCP (Express + Socket.io + Node-openzwave-shared)
 * Thanks to ekarak for node-openzwave-shared
 * @author Joao Henrique Bellincanta Gomes <jonnes1@gmail.com>
 */
var express = require('express');
//var socketioJwt = require('socketio-jwt'); //For autenticate sessions
//var jwt         = require('jsonwebtoken');
//var jwt_secret  = 'tokenNozwcp$';
//var sequelize   = new Sequelize('DATABASE', 'USER', 'PASSWORD', {host: 'localhost', dialect: 'mysql', define: {timestamps: false},logging: console.log, pool: {max: 5, min: 0, idle: 10000}}); //To connect on database
var path    = require('path');
var async = require("async");
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
var zwaveNetworkStart = false;

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
app.use(express.static(__dirname));
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
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html')); // load the single view file (angular will handle the page changes on the front-end)
});

/**
 * Socket.io server events and emmiters
 */
socketIoServer.sockets.on('connection', function (socket) {

    /**
     * Event to start zwave network
     * @param: USB device
     */
    socket.on('zwaveConnect', function (usbdeviceSelect) {
        usbdevice = usbdeviceSelect;
        if (typeof zwave === 'undefined' || zwave === '') {
            try {
                zwave = new ZWave({
                    Logging: true, // To log errors
                    ConsoleOutput: true, // To output console log and messages
                    NetworkKey: "0x5f,0xca,0xf4,0xa2,0x3e,0xe3,0xd6,0xb4,0x3e,0xe8,0x04,0x5a,0xf4,0x89,0xa7,0x93"//Change for your security
                });
                /*
                 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                 * ++++++++++++++++++++ Zwave Events +++++++++++++++++++++++
                 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                 */
                
                /**
                * Zwave Event on driver is ready
                * @param: string homeid
                */
                zwave.on('driver ready', function (homeid) {
                    homeidZwave = '0x'+homeid.toString(16);
                });
                
                /**
                * Zwave Event on driver failed to start
                */
                zwave.on('driver failed', function () {
                    console.error(language.translate("zwaveConnectError"));
                    socket.emit('zwaveConnected', 'false');
                    socket.emit('zwaveConnectedError', 'false');
                    zwave.disconnect();
                });
                
                /**
                * Zwave Event on node add to network
                * @param: string nodeid
                */
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
                        ready: false
                    };
                });
                
                /**
                * Zwave Event data add to nodeid, as class and value
                * @param: string comclass
                * @param: string value
                */
                zwave.on('value added', function (nodeid, comclass, value) {
                    if (!nodes[nodeid]['classes'][comclass])
                        nodes[nodeid]['classes'][comclass] = {};
                    nodes[nodeid]['classes'][comclass][value.index] = value;
                });
                
                /**
                * Zwave Event data on value change
                * @param: string nodeid
                * @param: string comclass
                * @param: string value
                */
                zwave.on('value changed', function (nodeid, comclass, value) {
                    if (nodes[nodeid]['ready']) {
                        var nodeDevice = {
                            nodeId: nodeid,
                            nodeValueLabel: value['label'],
                            nodeValue: value['value'],
                            comClass: comclass,
                            comClassIndex: nodes[nodeid]['classes'][comclass][value.index]['value']
                        };
                        socket.emit('zwaveDeviceValueChange', nodeDevice);
                        //console.log('node%d: changed: %d:%s:%s->%s', nodeid, comclass,value['label'],nodes[nodeid]['classes'][comclass][value.index]['value'],value['value']);
                    }
                    nodes[nodeid]['classes'][comclass][value.index] = value;
                });
                /**
                * Zwave Event data on value removed
                * @param: string nodeid
                * @param: string comclass
                * @param: string value
                */
                zwave.on('value removed', function (nodeid, comclass, index) {
                    if (nodes[nodeid]['classes'][comclass] && nodes[nodeid]['classes'][comclass][index]){
                        var nodeDevice = {
                            nodeId: nodeid,
                            comClass: comclass,
                            comClassIndex: nodes[nodeid]['classes'][comclass][index],
                            index: index
                        };
                        socket.emit('zwaveDeviceValueRemove', nodeDevice);
                        delete nodes[nodeid]['classes'][comclass][index];
                    }
                });
                
                /**
                * Zwave Event zwave device is ready on the network to receive commands
                * @param: string nodeid
                * @param: string nodeinfo
                */
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
                    //console.log('node%d: %s, %s', nodeid, nodeinfo.manufacturer ? nodeinfo.manufacturer : 'id=' + nodeinfo.manufacturerid, nodeinfo.product ? nodeinfo.product : 'product=' + nodeinfo.productid +', type=' + nodeinfo.producttype);
                    //console.log('node%d: name="%s", type="%s", location="%s"', nodeid, nodeinfo.name, nodeinfo.type, nodeinfo.loc);
                    for (comclass in nodes[nodeid]['classes']) {
                        switch (comclass) {
                            case 0x25: // COMMAND_CLASS_SWITCH_BINARY
                            case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
                                zwave.enablePoll(nodeid, comclass);
                                break;
                        }
                        var values = nodes[nodeid]['classes'][comclass];
                        //console.log('node%d: class %d', nodeid, comclass);
                        for (idx in values){
                            //console.log('node%d:   %s=%s', nodeid, values[idx]['label'], values[idx]['value']);
                        }
                    }
                    if(zwaveNetworkStart){
                        //Send a list of zwave devices
                        socket.emit('zwaveDevicesList', nodes);
                    }
                });
                
                /**
                * TODO 
                * Zwave Notifications
                * @param: string nodeid
                * @param: string nodeinfo
                */
                zwave.on('notification', function (nodeid, notif) {
                    switch (notif) {
                        case 0:
                            //console.log('node%d: message complete', nodeid);
                            break;
                        case 1:
                            //console.log('node%d: timeout', nodeid);
                            break;
                        case 2:
                            //console.log('node%d: nop', nodeid);
                            break;
                        case 3:
                            //console.log('node%d: node awake', nodeid);
                            break;
                        case 4:
                            //console.log('node%d: node sleep', nodeid);
                            break;
                        case 5:
                            //console.log('node%d: node dead', nodeid);
                            break;
                        case 6:
                            //console.log('node%d: node alive', nodeid);
                            break;
                    }
                });
                /**
                * Zwave network scan complete and up to send and receive command
                */
                zwave.on('scan complete', function () {
                    console.log(language.translate("Zwave network start with HomeID: ") + homeidZwave);
                    //Send socket.io event of connect true
                    socket.emit('zwaveConected', 'true');
                    //Send socket.io homeID info
                    socket.emit('zwaveHomeIdInfo', homeidZwave);
                    zwaveNetworkStart = true;
                });
                
                /**
                * Zwave return of command executed
                */
                zwave.on('controller command', function (r, s) {
                    console.log('controller commmand feedback: r=%d, s=%d', r, s);
                });
                
                /**
                 * Start zwave network and connect with controller device
                 */
                zwave.connect('/dev/' + usbdevice);
                
            } catch (e) {
                //In case of error throw
                socket.emit('zwaveConnected', 'false');
                socket.emit('zwaveConnectedError', 'false');
            }
        } else {
            /**
             * When network already started
             */
            //Send socket.io event of connect true
            socket.emit('zwaveConected', 'true');
            //Send socket.io homeID info
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
        zwaveNetworkStart = false;
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
    
    /**
     * Reset USB network device
     */
    socket.on('zwaveResetFactory', function () {
        socket.emit('zwaveReConnect', 'false');
        async.series([
            function(callback){
                zwave.hardReset();
                callback(null, 'one');
            },
            function(callback){
                zwave.disconnect(usbdevice);
                callback(null, 'two');
            },
            function(callback){
                zwave.connect('/dev/' + usbdevice);
                callback(null, 'three');
            }
        ]);
    });
});

/**
 * Start Express and Socket.io Server
 */
server.listen(port, function () {
    console.log("Server start on: http://" + myIP + ":" + port);
});