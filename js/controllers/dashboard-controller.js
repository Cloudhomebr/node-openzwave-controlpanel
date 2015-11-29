/**
 * Dashboard Controller
 * @path js/controllers/DashboardController.js
 * @author Joao Henrique Bellincanta Gomes <jonnes1@gmail.com>
 */
angular.module('DashboardController', [])
        .controller('DashboardController', function ($scope, $state, $timeout, blockUI, $translate, socket, $filter) {
            $scope.usbDevices    = [];
            $scope.zwaveDevices  = [];
            $scope.homeID        = '';
            $scope.usbZwaveDevice='';
                    
            blockUI.start(); 
            $timeout(function() { 
                socket.emit('zwaveGetUsbDevices');  
                blockUI.stop(); 
            }, 500);
            
            socket.on('zwaveDevicesList', function(devices){
                angular.forEach(devices, function(value, key){
                    if(value != null && value.nodeid != ""){
                        if(angular.isUndefined($scope.zwaveDevices[value.nodeid])===true && value.nodeid != '1'  && value.nodeid != ''){
                            $scope.zwaveDevices.push(value);
                        }
                    }
                });
            });
            
            socket.on('zwaveUsbDevices', function(zwaveUsbDevices){
                var option = {name: zwaveUsbDevices, value: zwaveUsbDevices};
                $scope.usbDevices.push(option);
            });
            
            socket.on('zwaveConected', function(result){
                blockUI.stop();
                socket.emit('zwaveGetDevices');  
            });
            socket.on('zwaveHomeIdInfo', function(homeidZwave){
                $scope.homeID = homeidZwave;
            });
            
            $scope.zwaveConnect = function(){
                if($scope.usbZwaveDevice !== ''){
                  blockUI.start($filter('translate')('networkMessages.start')); 
                  socket.emit('zwaveConnect', $scope.usbZwaveDevice);
                  $timeout(function() {   
                        blockUI.stop(); 
                    }, 60000);
                } else {
                  alert('Select a device from list');
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
