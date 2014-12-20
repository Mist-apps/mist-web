'use strict';


var API_URL = 'http://localhost:8080';

/*
	// Recover the user credentials
	var recover = function (next) {
		return function () {
			// Promise to return
			var promise = $q.defer();
			// Try to recover the authentication from the session/local storage
			AuthService.recover().then(function () {
				// Session recovered
				console.log('Session recovered');
				// If asking to go to login
				if (next.$$route && next.$$route.originalPath === '/login') {
					$location.path('/');
				}
				// Initialize sync service
				syncService.init();
				// Done
				promise.resolve();
			}, function (reason) {
				// Unable to recover session
				console.log('Unable to recover session: ' + reason);
				// If asking for an authenticated page
				if (next.authenticated) {
					// Go to login page
					$location.path('/login');
					// Error
					promise.reject();
				} else {
					// No problem
					promise.resolve();
				}
			});
			// Send the promise
			return promise.promise;
		};
	};

	// Listen to route changes
	$rootScope.$on('$routeChangeStart', function (event, next, current) {
		// If not authenticated
		if (!AuthService.isAuthenticated()) {
			// Add a resolve method to try to recover authentication
			next.resolve = angular.extend(next.resolve || {}, {
				__authenticating__: recover(next)
			});
		}
	});

*/

/**
 * HTTP Interceptor to catch 401 statuses and redirect the user to the /login page.
 */
/*
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
*/







/**
 * Auto shown/hide the dropdowns on click on the related buttons
 */
$(document).on('click', '.dropdown-button', function () {
	// Get the dropdown
	var dropdown = $(this).next();
	// Check if the dropdown is not already shown
	if (!dropdown.is(':visible')) {
		// Show the dropdown
		dropdown.show();
		// Remove on next click
		$(document).one('click', function () {
			dropdown.hide();
		});
	}
});

/**
 * Configure toastr service
 */
toastr.options = {
	'closeButton': false,
	'debug': false,
	'positionClass': 'toast-top-right',
	'onclick': null,
	'showDuration': 500,
	'hideDuration': 1000,
	'timeOut': 5000,
	'extendedTimeOut': 1000,
	'showEasing': 'swing',
	'hideEasing': 'linear',
	'showMethod': 'fadeIn',
	'hideMethod': 'fadeOut'
};