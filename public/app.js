var kainosApp = angular.module('kainosApp', ['ngRoute', 'ngAnimate', 'ngSanitize', 'ui.bootstrap', 'ngResource']);

kainosApp
    .controller("DashboardController", function($rootScope, $scope, $location, $uibModal, AuthService, Session, Offer) {
        console.info("DashboardController has been fired");

        $rootScope.$on("offerListChanged", function(event, data) {
            $scope.reloadOffers();
        });

        $scope.logout = function(){
            Session.destroy();
            $location.path("/login")
        };

        $scope.open = function (size) {
            $uibModal.open({
                templateUrl: 'views/new-entity-dialog.html',
                controller: 'NewEntityDialogController'
            });
        };

        $scope.reloadOffers = function(offerSearch) {
            $scope.offers = [];
            Offer.get(_.pickBy(offerSearch), function(data) {
                $scope.offers = data.Items;
            })
        }
    })
    .controller("NewEntityDialogController", function($rootScope, $scope, $uibModalInstance, Offer) {

        $scope.submit = function(){
            if($scope.signupForm.$valid) {
                $scope.offer.offerId = Math.floor((Math.random()*1024)+1);
                Offer.save($scope.offer, function(data) {
                    $uibModalInstance.close();
                    $rootScope.$emit("offerListChanged", true);
                }, function(err) {
                    alert("An error occurred")
                });
            }
        }
    })
    .controller("LoginController", function($scope, $location, AuthService) {
        console.info("LoginController has been fired");

        $scope.login = function(user){
            if ($scope.signinForm.$valid) {
                AuthService.login(user.username, user.password).then(
                    function(){$location.path("/");},
                    function(){$scope.invalidCredentials = true;}
                );
            }
        }
    })
    .factory("Offer", function($resource){
        return $resource("https://wk1sh33jib.execute-api.us-west-2.amazonaws.com/prod/offers");
    })
    .config(function ($routeProvider){
        $routeProvider
            .when("/", {
                controller: "DashboardController",
                templateUrl : "views/dashboard.html"
            })
            .when("/login", {
                controller: "LoginController",
                templateUrl : "views/login.html"
            })
    })
    .run(function (AuthService) {
        AuthService.redirectToLoginIfNeeded();
    })

    .factory('AuthService', function ($http, $location, $q, Session) {
        var authService = {};

        authService.login = function (username, password) {

            AWSCognito.config.region = 'eu-west-1'; // Region
            AWSCognito.config.credentials = new AWSCognito.CognitoIdentityCredentials({
                IdentityPoolId: 'eu-west-1:3a14ca99-c44d-4dd9-a914-5ac1a10eb5bc'
            });

            var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails({
                Username : username,
                Password : password
            });

            var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool({
                UserPoolId : 'eu-west-1_Pk7Cy4IjK',
                ClientId : '36oebr844llc951quvceo9vevm'
            });

            var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser({
                Username : username,
                Pool : userPool
            });

            var deferred = $q.defer();

            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function (result) {
                    Session.create(username, result.getIdToken().getJwtToken());
                    deferred.resolve(Session.cognito)
                },

                onFailure: function(err) {
                    deferred.reject(err)
                }
            });

            return deferred.promise;
        };

        authService.redirectToLoginIfNeeded = function() {
            if(!authService.isAuthenticated()) {
                $location.path("/login");
            } else {
                $location.path("/");
            }
        };

        authService.isAuthenticated = function () {
            return Session.cognito !== null;
        };

        return authService;
    })
    .service('Session', function () {

        var localStorageUsernameKey = "kainosPocUsernameData";
        var localStorageCognitoKey = "kainosPocCognitoData";

        this.username = localStorage.getItem(localStorageUsernameKey);
        this.cognito = localStorage.getItem(localStorageCognitoKey);

        this.create = function (username, cognito) {
            localStorage.setItem(localStorageUsernameKey, username);
            localStorage.setItem(localStorageCognitoKey, cognito);
            this.username = username;
            this.cognito = cognito;
        };
        this.destroy = function () {
            localStorage.removeItem(localStorageUsernameKey);
            localStorage.removeItem(localStorageCognitoKey);
            this.username = null;
            this.cognito = null;
        };
    });


kainosApp.factory('httpRequestInterceptor', function (Session) {
    return {
        request: function (config) {

            config.headers = {
                Authorization: Session.cognito,
                'Content-Type': 'application/json'
            };

            return config;
        }
    };
});

kainosApp.config(function ($httpProvider) {
    $httpProvider.interceptors.push('httpRequestInterceptor');
});