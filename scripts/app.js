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
 * Application controller. It manages:
 *		- Show/hide all menus
 *		- Logout
 */
webApp.controller('ApplicationController', function ($scope, $location, AuthService) {

	// Try to recover the authentication from the session/local storage
	AuthService.recover().then(function () {
		$location.path('/');
	}, function (reason) {
		console.log('Unable to recover session: ' + reason);
	});

	/**
	 * Hide all menus
	 */
	var _hideMenus = function () {
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
	$scope.toggleLeftMenu = function ($event) {
		if (!$('.menu').hasClass('menu-show')) {
			_hideMenus();
			$('.menu').addClass('menu-show');
			$('html').click(function () {
				_hideMenus();
			});
			$event.stopPropagation();
		} else {
			_hideMenus();
		}
	};

	/**
	 * Show and hide user menu dynamically
	 */
	$scope.toggleUserMenu = function ($event) {
		if ($('#user-menu').is(':hidden')) {
			_hideMenus();
			$('#user-menu').show();
			$('html').click(function () {
				_hideMenus();
			});
			$event.stopPropagation();
		} else {
			_hideMenus();
		}
	};

	/**
	 * Show and hide the add menu dynamically
	 */
	$scope.toggleAddMenu = function ($event) {
		if ($('#add-menu div:first-child').is(':visible')) {
			_hideMenus();
			$('#add-menu div').show();
			$('#add-menu div:first-child').hide();
			$('html').click(function () {
				_hideMenus();
			});
			$event.stopPropagation();
		}
	};

	/**
	 * Show the settings modal and send a broadcast to initialize the
	 * settings controller.
	 */
	$scope.showSettings = function () {
		// Init the settings modal
		$scope.$broadcast('INIT_SETTINGS');
		// Show the user settings modal
		$('.dim').addClass('dim-active');
		$('#user-settings-container').show();
	};

	/**
	 * Log the user out and redirect it to the login page
	 */
	$scope.logout = function () {
		AuthService.logout();
		$location.path('/login');
	};

});


/**
 * Settings modal controller
 */
webApp.controller('SettingsController', function ($scope, toastr, Session, userResource) {

	/**
	 * Init the settings temporary user
	 */
	var initSettings = function () {
		// Clone user in a tmp user to update
		$scope.tmpUser = $.extend(true, {}, Session.user);
		$scope.tmpUser.password = $scope.tmpUser.password2 = '';
	};

	$scope.$on('INIT_SETTINGS', initSettings);

	/**
	 * Save the settings and remove the settings modal
	 * If the settings form is not consistent, does nothing
	 * Show a notification if saved or if an error occurs
	 */
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
		// Remove temporary user and hide modal
		$scope.cancelSettings();
	};

	/**
	 * Cancel the settings modifications: remove temporary user and hide modal
	 */
	$scope.cancelSettings = function () {
		// Remove temporary user
		delete($scope.tmpUser);
		// Hide modal
		$('.dim').removeClass('dim-active');
		$('#user-settings-container').hide();
	};

	/**
	 * Get the image from input, resize it to 85px/85px,
	 * transform it in base64 and update the temporary user
	 */
	$scope.uploadImage = function () {
		var input = $('#user-image-input').get(0);
		if (input.files && input.files[0]) {
			// Create canvas for resizing image
			var canvas = document.getElementById("user-image-canvas");
			canvas.width = 85;
			canvas.height = 85;
			var ctx = canvas.getContext("2d");
			// Create image object with base64 upload
			var image = new Image();
			reader.onload = function (e) {
				image.src = e.target.result;
			};
			// Read the image from the input in base64
			var reader = new FileReader();
			image.onload = function() {
				ctx.drawImage(image, 0, 0, 85, 85);
				$scope.tmpUser.image = canvas.toDataURL();
			};
			reader.readAsDataURL(input.files[0]);
		}
	};

});

/**
 * Authentication service to login/logout and manage the Session.
 */
webApp.factory('AuthService', function ($http, $q, $timeout, $sessionStorage, $localStorage, userResource, Session) {

	return {

		/**
		 * Login by sending the credentials to the API and waiting for a token.
		 * This method returns a promise.
		 *
		 * If ok, store the token into session/local storage and resolve the promise
		 * If not ok, reject the promise with an error code and message
		 */
		login: function (credentials) {
			var promise = $q.defer();
			// If login attempt success
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
			// If login attempt fails
			var error = function (httpResponse) {
				if (httpResponse.status === 401) {
					promise.reject({code: 1, message: "Bad credentials"});
				} else {
					promise.reject({code: 2, message: "Unknown error"});
				}
			};
			// Try to log in
			userResource.login(credentials, success, error);
			// Return a promise
			return promise.promise;
		},

		/**
		 * Logout by destroying the token
		 */
		logout: function () {
			// Destroy session
			Session.destroy();
			// No more send the token on each API request
			delete($http.defaults.headers.common['API-Token']);
			// Delete token in local/session storage
			delete($sessionStorage.token);
			delete($localStorage.token);
		},

		/**
		 * Try to recover the authentication by searching for a token in
		 * session/local storage. If found, ask for user information.
		 */
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
				// If user information retrieval success
				var success = function (data, responseHeaders) {
					// Create the session
					Session.create(token, data);
					// Connected
					promise.resolve();
				};
				// If user information retrieval fails
				var error = function (httpResponse) {
					// No more send the token on each API request
					delete($http.defaults.headers.common['API-Token']);
					// Not connected
					promise.reject("Unknown error when retrieving user");
				};
				userResource.get(success, error);
			}
			// If no token found
			else {
				$timeout(function () {
					promise.reject("No token found in storage");
				});
			}
			// Return a promise
			return promise.promise;
		},

		/**
		 * Check if the user is authenticated or not
		 */
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