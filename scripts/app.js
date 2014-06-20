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
	return $resource(API_URL + '/user', {}, {
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
webApp.controller('UserCtrl', function ($scope, $location, AuthService, Session, userResource) {
	$scope.logout = function () {
		AuthService.logout();
		$location.path('/login');
	};

	$scope.showSettings = function () {
		// Clone user in a tmp user to update
		$scope.tmpUser = $.extend(true, {}, Session.user);
		$scope.tmpUser.password = $scope.tmpUser.password2 = '';
		// Show the user settings modal
		$('.dim').addClass('dim-active');
		$('#user-settings-container').show();
	};

	$scope.saveSettings = function () {
		// Check password
		if ($scope.tmpUser.password !== $scope.tmpUser.password2 || ($scope.tmpUser.password !== '' && $scope.tmpUser.password < 6)) {
			return;
		}
		// Remove login, password2, and password if empty
		delete($scope.tmpUser.login);
		delete($scope.tmpUser.password2);
		if (!$scope.tmpUser.password) {
			delete($scope.tmpUser.password);
		}
		// Update the user
		userResource.update($scope.tmpUser,
			function (data) {
				Session.update(data);
				toastr.success('Settings saved');
			}, function () {
				toastr.error('Unable to save settings');
			}
		);
		$('.dim').removeClass('dim-active');
		$('#user-settings-container').hide();
	};

	$scope.cancelSettings = function () {
		$('.dim').removeClass('dim-active');
		$('#user-settings-container').hide();
	};

	// Try to recover the authentication from the session/local storage
	AuthService.recover().then(function () {
		$location.path('/');
	}, function (reason) {
		//$location.path('/login');
	});
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
				if (httpResponse.status === 401) {
					promise.reject({code: 1, message: "Bad credentials"});
				} else {
					promise.reject({code: 2, message: "Unknown error"});
				}
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
			// Send the token on each API request
			$http.defaults.headers.common['API-Token'] = token;
			// If token found
			if (token) {
				var success = function (data, responseHeaders) {
					// Create the session
					Session.create(token, data);
					// Connected
					promise.resolve();
				};
				var error = function (httpResponse) {
					// No more send the token on each API request
					delete($http.defaults.headers.common['API-Token']);
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
	this.update = function (user) {
		this.user = $rootScope.user = user;
	}
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