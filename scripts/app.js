'use strict';


var webApp = angular.module('webApp', ['ngResource', 'ngRoute']);

webApp.constant('USER_ROLES', {
	all:		'*',
	admin:		'admin',
	user:		'user',
	guest:		'guest'
});

/**
 * Configure the routes
 */
webApp.config(function ($routeProvider, $locationProvider, USER_ROLES) {

	$routeProvider.when('/notes', {
		templateUrl: 'views/notes.html',
		controller: 'NotesCtrl',
		data: {
			authorizedRoles: [USER_ROLES.admin, USER_ROLES.user]
		}
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
	return $resource('http://localhost:8081/user/:id', {id: '@id'}, {
		update: {method: 'PUT'}
	});
}]);

/**
 * Notes resource
 */
webApp.factory('noteResource', ['$resource', function ($resource) {
	return $resource('http://localhost:8081/note/:id', {id: '@id'}, {
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
webApp.controller('UserCtrl', function ($scope, userResource, toastr, AuthService) {

	$scope.user = null;
	$scope.isAuthorized = AuthService.isAuthorized;

});

/**
 * Login controller
 */
webApp.controller('LoginCtrl', function ($scope, $location , AuthService, Session) {
	$scope.credentials = {
		username: '',
		password: ''
	};
	$scope.login = function (credentials) {
		if (AuthService.login(credentials)) {
			$scope.$parent.user = Session.user;
			console.log('go to /');
			$location.path('/');
		} else {
			$scope.$parent.user = null;
		}
	};
})

webApp.factory('AuthService', function ($http, Session) {
	return {
		login: function (credentials) {
			Session.create(1, {
				"_id" : "538c331956f47c5338ca9985",
				"firstName" : "Laurent",
				"lastName" : "Leleux",
				"mail" : "lolo88l@hotmail.com",
				"login" : "laurent",
				"password" : "e93e656e4144cd4a59f7d8d886bdb3b59b8f8ae9",
				"role" : "admin"});
			return true;
		},
		isAuthenticated: function () {
			return !!Session.id;
		},
		isAuthorized: function (authorizedRoles) {
			if (!angular.isArray(authorizedRoles)) {
				authorizedRoles = [authorizedRoles];
			}
			return (this.isAuthenticated() && authorizedRoles.indexOf(Session.user.role) !== -1);
		}
	};
});

webApp.service('Session', function () {
	this.create = function (sessionId, user) {
		this.id = sessionId;
		this.user = user;
	};
	this.destroy = function () {
		this.id = null;
		this.user = null;
	};
	return this;
});

webApp.run(function ($rootScope, $location, AuthService) {
	$rootScope.$on('$routeChangeStart', function (event, next) {
		// Check authorisation
		console.log("DATA: " + JSON.stringify(next.data));
		if (next.data && !AuthService.isAuthorized(next.data.authorizedRoles)) {
			// Stop routing
			event.preventDefault();
			// If user is not allowed
			if (AuthService.isAuthenticated()) {
				console.log('A');
				$location.path('/login');
			}
			// If user is not logged in
			else {
				console.log('B');
				$location.path('/login');
			}
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