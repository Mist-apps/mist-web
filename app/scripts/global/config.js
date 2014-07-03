'use strict';


var API_URL = 'http://localhost:8080';


var webApp = angular.module('webApp', ['ngResource', 'ngRoute', 'ngStorage']);

/**
 * Configure the routes
 */
webApp.config(function ($routeProvider, $locationProvider) {

	$routeProvider.when('/login', {
		templateUrl: 'views/login.html',
		controller: 'LoginController',
		title: 'Login'
	});

	$routeProvider.otherwise({
		redirectTo: '/notes'
	});

	$locationProvider.html5Mode(true);

});

/**
 * Route Change Listener to:
 * 		- Check if the user is authenticated where he must be
 *		- Set the application name
 *		- Set the page title
 */
webApp.run(function ($rootScope, $location, AuthService) {

	$rootScope.$on('$routeChangeStart', function (event, next, current) {
		// Set application name
		$rootScope.appName = next.appName;
		// Set the page title
		$rootScope.title = next.title;
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

	$httpProvider.interceptors.push(function ($rootScope, $location, $q, $sessionStorage, $localStorage, $modal, Session) {
		return {
			responseError: function (rejection) {
				if (rejection.status === 401) {
					// If we were authenticated, show modal (does nothing if already shown)
					if (!!Session.token) {
						$modal.show('global-login');
					}
					// If we were not authenticated, redirect to login form
					else {
						$location.path('/login');
					}
					// No more send the token on each API request
					delete($httpProvider.defaults.headers.common['API-Token']);
					// Delete token in local/session storage
					delete($sessionStorage.token);
					delete($localStorage.token);
				}
				return $q.reject(rejection);
			}
		};
	});

});

/**
 * Auto remove shake class
 */
$('body').on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', '.shake', function() {
	$(this).removeClass('shake');
});