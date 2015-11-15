/**
 * Dashboard Controller
 * @path js/controllers/DashboardController.js
 * @author Joao Henrique Bellincanta Gomes <jonnes1@gmail.com>
 */
angular.module('DashboardController', [])
        .controller('DashboardController', function ($scope, $state, $timeout, blockUI, $translate) {
            /*blockUI.start(); 

            $timeout(function() { 
              blockUI.stop(); 
            }, 2000);*/
            $scope.teste = 'xxxx';
            /**
             * Funcao para trocar a linguagem
             * @param {siglaLang} langKey
             * @returns void
             */
            $scope.changeLanguage = function (langKey) {
                $translate.use(langKey);
            };
        });
