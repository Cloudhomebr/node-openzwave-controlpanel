/**
 * Dashboard Controller
 * @path js/controllers/DashboardController.js
 * @author Joao Henrique Bellincanta Gomes <jonnes1@gmail.com>
 */
angular.module('DashboardController', [])
        .controller('DashboardController', function ($scope, $state, $timeout, blockUI, $translate, socket, $filter, toaster, $confirm) {
            $scope.usbDevices = [];
            $scope.zwaveDevices = [];
            $scope.homeID = '';
            $scope.usbZwaveDevice = '';
            $scope.showLogs = false;
            $scope.zwaveConnected = false;
            $scope.networkOption = '';
            $scope.admCommand = '';
            
            //Blockui to get USB controllers devices 
            blockUI.start();
            
            /**
             * Async function to get USB Controllers devices
             */
            $timeout(function () {
                socket.emit('zwaveGetUsbDevices');
                blockUI.stop();
            }, 800);
            /**
             * Socket.io Event to receive USB Controllers devices
             */
            socket.on('zwaveUsbDevices', function (zwaveUsbDevices) {
                var option = {name: '/dev/' + zwaveUsbDevices, value: zwaveUsbDevices};
                $scope.usbDevices.push(option);
            });
            
            /**
             * Socket.io Event to receive zwave devices nodes
             */
            socket.on('zwaveDevicesList', function (devices) {
                angular.forEach(devices, function (value, key) {
                    if (value != null && value.nodeid != "") {
                        if (angular.isUndefined($scope.zwaveDevices[value.nodeid]) === true && value.nodeid != '1' && value.nodeid != '') {
                            $scope.zwaveDevices[value.nodeid] = value;
                        }
                    }
                });
            });
            
            /**
             * Socket.io Event to receive zwave devices nodes
             */
            socket.on('zwaveConnected', function (result) {
                blockUI.stop();
                console.log('Zwave connected with success');
                if (result === 'true') {
                    if(!$scope.zwaveConnected){
                        $scope.zwaveConnected = true;
                        toaster.pop({
                            type: 'success',
                            title: $filter('translate')('networkMessages.title'),
                            body: $filter('translate')('networkMessages.connectSuccess'),
                            showCloseButton: true,
                            timeOut: "200"
                        });
                    }
                    //Send get zwave devices nodes
                    socket.emit('zwaveGetDevices');
                } else {
                    toaster.pop({
                        type: 'error',
                        title: $filter('translate')('networkMessages.title'),
                        body: $filter('translate')('networkMessages.connectError'),
                        showCloseButton: true,
                        timeOut: "200"
                    });
                }
            });
            
            /**
             * Socket.io Event after connect receive ZwaveHomeID
             */
            socket.on('zwaveHomeIdInfo', function (homeidZwave) {
                blockUI.stop();
                $scope.zwaveConnected = true;
                toaster.pop({
                    type: 'success',
                    title: $filter('translate')('networkMessages.title'),
                    body: $filter('translate')('networkMessages.connectSuccess'),
                    showCloseButton: true,
                    timeOut: "200"
                });
                $scope.homeID = homeidZwave;
            });
            
            //####################################################
            //############## Ui Functions ########################
            //####################################################

            /**
             * Function to connect on the zwave network
             */
            $scope.zwaveConnect = function () {
                if ($scope.usbZwaveDevice !== '') {
                    blockUI.start($filter('translate')('networkMessages.start'));
                    socket.emit('zwaveConnect', $scope.usbZwaveDevice);
                    $timeout(function () {
                        blockUI.stop();
                    }, 160000);
                } else {
                    alert('Select a device from list');
                }
            };
            
            /**
             * Function to connect on the zwave network
             */
            $scope.doNetworkCommand = function () {
                if ($scope.doNetworkCommand !== '0') {
                    blockUI.start($filter('translate')('networkMessages.start'));
                    switch(admCommand){
                        case 'add_node':
                            break;
                        case 'remove_node':
                            $confirm({text: 'Are you sure you want to delete?', ok: 'Yes', no:'Cancel'})
                                .then(function() {
                                    alert('yes');
                                });
                            break;
                    }
                    socket.emit('zwaveConnect', $scope.usbZwaveDevice);
                    
                    $timeout(function () {
                        blockUI.stop();
                    }, 160000);
                } else {
                    alert('Select a ADM command from list');
                }
            };
            
            /**
             * Function to connect on the zwave network
             */
            $scope.admCommand = function () {
                if ($scope.admCommand !== '0') {
                    blockUI.start($filter('translate')('networkMessages.start'));
                    switch(admCommand){
                        case 'add_second':
                            break;
                        case 'reset':
                            $confirm({text: 'Are you sure you want to delete?', ok: 'Yes', no:'Cancel'})
                                .then(function() {
                                    alert('yes');
                                });
                            break;
                    }
                    socket.emit('zwaveConnect', $scope.usbZwaveDevice);
                    
                    $timeout(function () {
                        blockUI.stop();
                    }, 160000);
                } else {
                    alert('Select a ADM command from list');
                }
            };


            /**
             * Funcao para trocar a linguagem
             * @param {siglaLang} langKey
             * @returns void
             */
            $scope.changeLanguage = function (langKey) {
                $translate.use(langKey);
            };

        });
