'use strict';



var API_URL = {{API_URL}};



var webApp = angular.module('webApp', ['ngResource', 'ngRoute', 'ngStorage']);

/**
 * Configure the routes
 */
webApp.config(function ($routeProvider, $locationProvider) {

	$routeProvider.when('/notes', {
		templateUrl: 'views/notes.html',
		controller: 'NotesCtrl',
		authenticated: true
	});

	$routeProvider.when('/login', {
		templateUrl: 'views/login.html',
		controller: 'LoginCtrl'
	});

	$routeProvider.otherwise({
		redirectTo: '/notes'
	});

	$locationProvider.html5Mode(true);

});

/**
 * Users resource
 */
webApp.factory('userResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/user/:id', {id: '@id'}, {
		update: {method: 'PUT'},
		login: {method: 'POST', url: API_URL + '/login'}
	});
}]);

/**
 * Toast notifications service
 * This service loads some configuration like, the show duration,
 * timeout... This toastr methods are available:
 *		- success(message, title)
 *		- info(message, title)
 *		- warning(message, title)
 *		- error(message, title)
 */
webApp.factory('toastr', function() {
	toastr.options = {
		"closeButton": false,
		"debug": false,
		"positionClass": "toast-top-right",
		"onclick": null,
		"showDuration": "10000",
		"hideDuration": "1000",
		"timeOut": "5000",
		"extendedTimeOut": "1000",
		"showEasing": "swing",
		"hideEasing": "linear",
		"showMethod": "fadeIn",
		"hideMethod": "fadeOut"
	};
	return {
		success:	function (message, title) { toastr.success(message, title) },
		info:		function (message, title) { toastr.info(message, title) },
		warning:	function (message, title) { toastr.warning(message, title) },
		error:		function (message, title) { toastr.error(message, title) }
	};
});

/**
 * User controller
 */
webApp.controller('UserCtrl', function ($scope, $location, AuthService, Session) {
	$scope.logout = function () {
		AuthService.logout();
		$location.path('/');
	};

	// Try to recover the authentication from the session/local storage
	AuthService.recover().then(function () {
		$location.path('/');
	}, function (reason) {
		//$location.path('/login');
	});
});

/**
 * Login controller
 */
webApp.controller('LoginCtrl', function ($scope, $location, AuthService, Session) {
	$scope.credentials = {
		username: '',
		password: '',
		remember: false
	};
	$scope.login = function (credentials) {
		AuthService.login(credentials).then(function () {
			$location.path('/');
		}, function (reason) {
			console.log(reason);
		});
	};
});

/**
 * Authentication service to login/logout and manage the Session.
 */
webApp.factory('AuthService', function ($http, $q, $timeout, $sessionStorage, $localStorage, userResource, Session) {
	return {
		login: function (credentials) {
			var promise = $q.defer();
			var success = function (data, responseHeaders) {
				// Create the session
				Session.create(data.token, data.user);
				// Send the token on each API request
				$http.defaults.headers.common['API-Token'] = data.token;
				// Save token in local/session storage
				if (credentials.remember) {
					$localStorage.token = data.token;
				} else {
					$sessionStorage.token = data.token;
				}
				// Connected
				promise.resolve();
			};
			var error = function (httpResponse) {
				// Not connected
				promise.reject("Bad credentials");
			};
			userResource.login(credentials, success, error);
			// Return a promise
			return promise.promise;
		},
		logout: function () {
			// Destroy session
			Session.destroy();
			// No more send the token on each API request
			delete($http.defaults.headers.common['API-Token']);
			// Delete token in local/session storage
			delete($sessionStorage.token);
			delete($localStorage.token);
			return true;
		},
		recover: function () {
			var promise = $q.defer();
			// Search for token in local/session storage
			var token = null;
			if ($sessionStorage.token) {
				token = $sessionStorage.token;
			} else if($localStorage.token) {
				token = $localStorage.token;
			}
			// If token found
			if (token) {
				var success = function (data, responseHeaders) {
					// Create the session
					Session.create(token, data);
					// Send the token on each API request
					$http.defaults.headers.common['API-Token'] = token;
					// Connected
					promise.resolve();
				};
				var error = function (httpResponse) {
					// Not connected
					promise.reject("Unknown error when retrieving user");
				};
				userResource.get(success, error);
			} else {
				$timeout(function () {
					promise.reject("No token found in storage");
				});
			}
			return promise.promise;
		},
		isAuthenticated: function () {
			return !!Session.token;
		}
	};
});

/**
 * Session containing the user, token...
 */
webApp.service('Session', function ($rootScope) {
	this.create = function (token, user) {
		this.token = $rootScope.token = token;
		this.user = $rootScope.user = user;
	};
	this.destroy = function () {
		this.token = $rootScope.token = null;
		this.user = $rootScope.user = null;
	};
	return this;
});

/**
 * Route Change Listener to check if the user is authenticated where he must be
 */
webApp.run(function ($rootScope, $location, AuthService) {
	$rootScope.$on('$routeChangeStart', function (event, next, current) {
		// If not authenticated and asking for an authenticated page
		if (next.authenticated && !AuthService.isAuthenticated()) {
			// Stop routing
			event.preventDefault();
			// Go to login page
			$location.path('/login');
		}
		// If authenticated and going on the login page
		else if (AuthService.isAuthenticated() && next.$$route && next.$$route.originalPath === '/login') {
			// Stop routing
			event.preventDefault();
			// Go to home page
			$location.path('/');
		}
	});
});

/**
 * HTTP Interceptor to catch 401 statuses and redirect the user to the /login page.
 */
webApp.config(function ($httpProvider) {
	$httpProvider.interceptors.push(function ($location, $q, $sessionStorage, $localStorage, Session) {
		return {
			responseError: function (rejection) {
				if (rejection.status === 401) {
					// Destroy session
					Session.destroy();
					// No more send the token on each API request
					delete($httpProvider.defaults.headers.common['API-Token']);
					// Delete token in local/session storage
					delete($sessionStorage.token);
					delete($localStorage.token);
					// Redirect to login form
					$location.path('/login');
				}
				return $q.reject(rejection);
			}
		};
	});
});



/**
 * =================================
 *         Normal Javascript
 * =================================
 */



/**
 * Hide all menus
 */
var hideMenus = function () {
	$('.menu').removeClass('menu-show');
	$('#user-menu').hide();
	$('#add-menu div').hide();
	$('#add-menu div:first-child').show();
	$('#add-menu div:first-child div').show();
	$('html').unbind('click');
};

/**
 * Show and hide left menu dynamically
 */
var handleLeftMenu = function (event) {
	if (!$('.menu').hasClass('menu-show')) {
		hideMenus();
		$('.menu').addClass('menu-show');
		$('html').click(function () {
			hideMenus();
		});
		event.stopPropagation();
	} else {
		hideMenus();
	}
};

/**
 * Show and hide user menu dynamically
 */
var handleUserMenu = function (event) {
	if ($('#user-menu').is(':hidden')) {
		hideMenus();
		$('#user-menu').show();
		$('html').click(function () {
			hideMenus();
		});
		event.stopPropagation();
	} else {
		hideMenus();
	}
};

/**
 * Show and hide the add menu dynamically
 */
var handleAddMenu = function (event) {
	if ($('#add-menu div:first-child').is(':visible')) {
		hideMenus();
		$('#add-menu div').show();
		$('#add-menu div:first-child').hide();
		$('html').click(function () {
			hideMenus();
		});
		event.stopPropagation();
	}
};

/**
 * Set the handlers when page loaded
 */
$('body').on('click', '#nav-menu', handleLeftMenu);
$('body').on('click', '#nav-user', handleUserMenu);
$('body').on('click', '#add-menu div:first-child div', handleAddMenu);