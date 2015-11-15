angular.module('navController', [])
        .controller('nav', function ($scope, $state, $translate) {
            $scope.title = 'NOZWCP';

            $scope.isUrl = function (url) {
                if (url === '#')
                    return false;
                return ('#' + $state.$current.url.source + '/').indexOf(url + '/') === 0;
            };

            $scope.pages = [
                {
                    name: 'Home',
                    url: '#/'
                },
                {
                    name: 'Language',
                    url: '#',
                    subPages: [
                        {
                            name: 'English',
                            url: '#/us'
                        },
                        {
                            name: 'Portuguese(BR)',
                            url: '#/ptBR'
                        }
                    ]
                }
            ];
        });
