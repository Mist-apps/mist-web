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

webApp.directive('resize', function ($timeout) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			var resize = function () {
				element[0].style.height = 'auto';
				element[0].style.height = element[0].scrollHeight+'px';
			};
			element.on('change cut paste drop keyup keydown', resize);
			$timeout(resize);
		}
	};
});

/**
 * Users resource
 */
webApp.factory('userResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/user/:id', {id: '@id'}, {
		update: {method: 'PUT'}
	});
}]);

/**
 * Notes resource
 */
webApp.factory('noteResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/note/:id', {id: '@id'}, {
		update: {method: 'PUT'}
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
	$scope.user = null;
	$scope.isAuthorized = AuthService.isAuthorized;

	$scope.logout = function () {
		AuthService.logout();
		$scope.user = Session.user;
		$location.path('/');
	};

	// Try to recover the authentication from the session/local storage
	if (AuthService.recover()) {
		$scope.user = Session.user;
		$location.path('/');
	}
});

/**
 * Login controller, child of User controller
 */
webApp.controller('LoginCtrl', function ($scope, $location, AuthService, Session) {
	$scope.credentials = {
		username: '',
		password: '',
		remember: false
	};
	$scope.login = function (credentials) {
		if (AuthService.login(credentials)) {
			$scope.$parent.user = Session.user;
			$location.path('/');
		} else {
			$scope.$parent.user = Session.user;
		}
	};
});

/**
 * Authentication service to login/logout and manage the Session.
 */
webApp.factory('AuthService', function ($http, $sessionStorage, $localStorage, Session) {
	return {
		login: function (credentials) {
			var token = 'e93e656e4144cd4a59f7d8d886bdb3b59b8f8ae9';
			// Create the session
			Session.create(token, {
				"_id" : "538c331956f47c5338ca9985",
				"firstName" : "Laurent",
				"lastName" : "Leleux",
				"mail" : "lolo88l@hotmail.com",
				"login" : "laurent"
			});
			// Send the token on each API request
			$http.defaults.headers.common['API-Token'] = token;
			// Save token in local/session storage
			if (credentials.remember) {
				$localStorage.token = token;
			} else {
				$sessionStorage.token = token;
			}
			return true;
		},
		logout: function () {
			Session.destroy();
			// No more send the token on each API request
			delete($http.defaults.headers.common['API-Token']);
			// Delete token in local/session storage
			delete($sessionStorage.token);
			delete($localStorage.token);
			return true;
		},
		recover: function () {
			// Search for token in local/session storage
			var token = null;
			if ($sessionStorage.token) {
				token = $sessionStorage.token;
			} else if($localStorage.token) {
				token = $localStorage.token;
			}
			// If token found
			if (token) {
				// Create the session
				Session.create(token, {
					"_id" : "538c331956f47c5338ca9985",
					"firstName" : "Laurent",
					"lastName" : "Leleux",
					"mail" : "lolo88l@hotmail.com",
					"login" : "laurent"
				});
				// Send the token on each API request
				$http.defaults.headers.common['API-Token'] = token;
				return true;
			}
			return false;
		},
		isAuthenticated: function () {
			return !!Session.token;
		}
	};
});

/**
 * Session containing the user, token...
 */
webApp.service('Session', function () {
	this.create = function (token, user) {
		this.token = token;
		this.user = user;
	};
	this.destroy = function () {
		this.token = null;
		this.user = null;
	};
	return this;
});

/**
 * Route Change Listener to check if the user is authenticated where he must be
 */
webApp.run(function ($rootScope, $location, AuthService) {
	$rootScope.$on('$routeChangeStart', function (event, next) {
		// Check authentication
		if (next.authenticated && !AuthService.isAuthenticated()) {
			// Stop routing
			event.preventDefault();
			// Go to login page
			$location.path('/login');
		}
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