/**
 * *
 * @author Joao Henrique Bellincanta Gomes <jonnes1@gmail.com>
 */
(function () {
    var app = angular.module('app', ['ui.router',
        'navController',
        'DashboardController',
        'ngAnimate',
        'ui.bootstrap',
        'btford.socket-io',
        'blockUI',
        'pascalprecht.translate',
        'uiSwitch',
        'toaster',
        'ui.bootstrap.modal',
        'confirm']);

    app.factory('socket', function (socketFactory) {
        return socketFactory({
            ioSocket: io.connect(location.host)
        });
    });

    // define for requirejs loaded modules
    define('app', [], function () {
        return app;
    });

    function req(deps) {
        if (typeof deps === 'string')
            deps = [deps];
        return {
            deps: function ($q, $rootScope) {
                var deferred = $q.defer();
                require(deps, function () {
                    $rootScope.$apply(function () {
                        deferred.resolve();
                    });
                    deferred.resolve();
                });
                return deferred.promise;
            }
        };
    }

    app.config(function ($translateProvider) {
        $translateProvider.useStaticFilesLoader({
            prefix: 'lib/translate/',
            suffix: '.json'
        });
        $translateProvider.preferredLanguage('ptBR');
        //$translateProvider.preferredLanguage('enUS');
    });
    app.config(function ($stateProvider, $urlRouterProvider, $controllerProvider) {
        var origController = app.controller
        app.controller = function (name, constructor) {
            $controllerProvider.register(name, constructor);
            return origController.apply(this, arguments);
        }

        var viewsPrefix = 'views/';

        // For any unmatched url, send to /
        $urlRouterProvider.otherwise("/");

        $stateProvider
                // you can set this to no template if you just want to use the html in the page
                .state('home', {
                    url: "/",
                    templateUrl: viewsPrefix + "dashboard.html",
                    controller: "DashboardController"
                });

    });
    app.directive('updateTitle', ['$rootScope', '$timeout',
        function ($rootScope, $timeout) {
            return {
                link: function (scope, element) {
                    var listener = function (event, toState) {
                        var title = 'NOZWCP - By CloudHome';
                        if (toState.data && toState.data.pageTitle)
                            title = toState.data.pageTitle + ' - ' + title;
                        $timeout(function () {
                            element.text(title);
                        }, 0, false);
                    };

                    $rootScope.$on('$stateChangeSuccess', listener);
                }
            };
        }
    ]);
}());