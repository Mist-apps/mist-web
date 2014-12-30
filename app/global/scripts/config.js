'use strict';


var API_URL = 'http://localhost:8080';


/**
 * HTTP Interceptor to catch 401 statuses and redirect the user to the /login page.
 */
$.ajaxSetup({
	statusCode: {
		401: function () {
			// If we were authenticated, show modal (does nothing if already shown)
			if (AuthService.isAuthenticated()) {
				ModalService.show('global-login');
			}
			// If we were not authenticated, and not on a login page, redirect to login form
			else if (location.pathname !== '/login/' && !ModalService.isShown('global-login')) {
				location.replace('/login');
			}
			// Logout the user properly (delete token, user...)
			AuthService.logout();
		}
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


/**
 * Underscore settings
 */
_.templateSettings.variable = 'rc';