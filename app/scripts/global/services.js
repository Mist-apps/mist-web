'use strict';


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
	return {
		success:	function (message, title) { toastr.success(message, title); },
		info:		function (message, title) { toastr.info(message, title); },
		warning:	function (message, title) { toastr.warning(message, title); },
		error:		function (message, title) { toastr.error(message, title); }
	};
});

/**
 * Authentication service to login/logout and manage the Session.
 */
webApp.factory('AuthService', function ($loader, $http, $q, $timeout, $sessionStorage, $localStorage, userResource, Session) {

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
				// Stop loading
				$loader.stop('AuthService.login');
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
				// Initialize sync service

				// Connected
				promise.resolve();
			};
			// If login attempt fails
			var error = function (httpResponse) {
				// Stop loading
				$loader.stop('AuthService.login');
				if (httpResponse.status === 401) {
					promise.reject({code: 1, message: 'Bad credentials'});
				} else {
					promise.reject({code: 2, message: 'Unknown error'});
				}
			};
			// Try to log in
			userResource.login(credentials, success, error);
			// Start loading
			$loader.start('AuthService.login');
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
			} else if ($localStorage.token) {
				token = $localStorage.token;
			}
			// Send the token on each API request
			$http.defaults.headers.common['API-Token'] = token;
			// If token found
			if (token) {
				// If user information retrieval success
				var success = function (data, responseHeaders) {
					// Stop loading
					$loader.stop('AuthService.recover');
					// Create the session
					Session.create(token, data);
					// Connected
					promise.resolve();
				};
				// If user information retrieval fails
				var error = function (httpResponse) {
					// Stop loading
					$loader.stop('AuthService.recover');
					// No more send the token on each API request
					delete($http.defaults.headers.common['API-Token']);
					// Not connected
					promise.reject('Unknown error when retrieving user');
				};
				// Start loading
				$loader.start('AuthService.recover');
				userResource.get(success, error);
			}
			// If no token found
			else {
				$timeout(function () {
					promise.reject('No token found in storage');
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
	};
	return this;
});

/**
 * Sync service to sync resources with the server.
 *
 * This service is generic so you may pass any resource you want to sync.
 * Keep in mind a Resource provider must be present and named: "{{type}}Resource"
 */
webApp.factory('syncService', function ($interval, $rootScope, $injector, toastr, $loader) {

	// Sync status is shared
	$rootScope.syncStatus = 'synced';

	/**
	 * Initialize the sync service, nothing to sync and status synced
	 */
	var init = function () {
		$rootScope.syncStatus = 'synced';
		resources = {};
		metadata = {};
	};

	/**
	 * Handle sync status
	 */
	var setStatusSyncing = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if ($rootScope.syncStatus === 'stopped') { return; }
		// If the sync is in error, it is not possible to set it to syncing, wait for good sync before
		if ($rootScope.syncStatus === 'error') { return; }
		// Set status
		$rootScope.syncStatus = 'syncing';
	};
	var setStatusSynced = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if ($rootScope.syncStatus === 'stopped') { return; }
		// Set status
		$rootScope.syncStatus = 'synced';
	};
	var setStatusError = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if ($rootScope.syncStatus === 'stopped') { return; }
		// If the sync pass for the first time in error, show an error notification
		if ($rootScope.syncStatus !== 'error') { toastr.error('Unable to sync'); }
		// Set status
		$rootScope.syncStatus = 'error';
	};

	/**
	 * Prevent leave page when not totally synced
	 */
	window.onbeforeunload = function(event) {
		event = event || window.event;
		var message = '';
		switch ($rootScope.syncStatus) {
			case 'syncing':		message = 'Data is syncing, if you leave, you will loose some data...'; break;
			case 'error':		message = 'Error during sync, if you leave, you will loose some data...'; break;
			case 'stopped':		if (_isSynced()) { break; }
								message = 'Sync is stopped, if you leave, you will loose some data...'; break;
		}
		if (message !== '') {
			if (event) { event.returnValue = message; }		// For IE and Firefox
			return message;									// For Safari
		}
	};

	//	Save resources to sync, new resources have no _id but a tmpId
	var resources = {};
	var metadata = {};
	// Save the HTTP resources dynamically injected
	var httpResources = {};

	/**
	 * Handle resource modifications.
	 * Add new recources to sync, updated...
	 */
	var newResource = function (type, resource) {
		resources[resource.tmpId] = resource;
		metadata[resource.tmpId] = {type: type, status: 'ready', action: 'insert'};
		setStatusSyncing();
	};
	var updateResource = function (type, resource) {
		// If the resource is not new and is not already in
		if (resource._id && !resources[resource._id]) {
			// Add resource to sync
			resources[resource._id] = resource;
			// If the resource is syncing
			if (metadata[resource._id] && metadata[resource._id].syncing) {
				metadata[resource._id].action = 'update';
				metadata[resource._id].dirty = true;
			}
			// If not syncing
			else {
				metadata[resource._id] = {type: type, syncing: false, action: 'update'};
			}
			// Set syncing
			setStatusSyncing();
		}
	};
	var deleteResource = function (type, resource) {
		// If the resource is not new
		if (resource._id) {
			// Add resource to sync
			resources[resource._id] = resource;
			// If the resource is syncing
			if (metadata[resource._id] && metadata[resource._id].syncing) {
				metadata[resource._id].action = 'delete';
				metadata[resource._id].dirty = true;
			}
			// If not syncing
			else {
				metadata[resource._id] = {type: type, syncing: false, action: 'delete'};
			}
			// Set syncing
			setStatusSyncing();
		}
	};

	/**
	 * Get sync deep status
	 */
	var _isSynced = function () {
		return Object.keys(metadata).length === 0;
	};
	var _isSyncError = function () {
		for (var key in metadata) {
			if (metadata[key].error) { return true; }
		}
		return false;
	};

	/**
	 * Get the HTTP Resource to sync with
	 */
	var _getHTTPResource = function (type) {
		type = type.toLowerCase();
		if (!httpResources[type]) {
			httpResources[type] = $injector.get(type + 'Resource');
		}
		return httpResources[type];
	};

	/**
	 * Remove a resource from syncing (tables and errors)
	 */
	var _removeResource = function (resource) {
		var id = resource._id ? resource._id : resource.tmpId;
		delete(resources[id]);
		delete(metadata[id]);
	};

	/**
	 * Sync method
	 */
	var _sync = function () {
		// Do not sync if stopped
		if ($rootScope.syncStatus === 'stopped') {
			return;
		}
		// Check if something to do
		if (_isSynced()) {
			setStatusSynced();
			return;
		}
		// If a resource sync success
		var _success = function (resource) {
			var id = resource._id ? resource._id : resource.tmpId;
			// If dirty resource, remove error and set no more syncing
			if (metadata[id].dirty) {
				metadata[id].syncing = false;
				metadata[id].error = false;
			}
			// If the sync in done, remove totally the resource
			else {
				_removeResource(resource);
			}
			// Check end of sync
			_checkEndOfSync();
		};
		// If a resource sync error
		var _error = function (response, resource, action) {
			_checkEndOfSync();
			// Set error and retry
			var id = resource._id ? resource._id : resource.tmpId;
			metadata[id] = {type: metadata[id].type, syncing: false, action: action};
			// Check for conflict (updated)
			if (response.status === 409) {
				$rootScope.syncStatus = 'stopped';
				_removeResource(resource);
				$rootScope.$broadcast('CONFLICT', resource, response.data);
			}
			// Check for conflict (deleted)
			if (response.status === 404) {
				$rootScope.syncStatus = 'stopped';
				_removeResource(resource);
				$rootScope.$broadcast('CONFLICT', resource, null);
			}
		};
		// Check if the sync is done, and set the status
		var _checkEndOfSync = function () {
			if (_isSynced()) {
				setStatusSynced();
			} else if (_isSyncError()) {
				setStatusError();
			}
		};
		// Copy response data in resource
		var _copyDataToResource = function (resource, data) {
			// Copy from data to resource
			for (var property in data) {
				resource[property] = data[property];
			}
			// Delete old properties in resource
			for (var property in resource) {
				// If the property starts not with $ and is not in data, delete it
				if (resource.hasOwnProperty(property) && property.charAt(0) !== '$' && !data.hasOwnProperty(property)) {
					delete(resource[property]);
				}
			}
		};
		// Handle resources
		Object.keys(resources).forEach(function (id) {
			var httpResource = _getHTTPResource(metadata[id].type);
			var resource = resources[id];
			// Insert resource
			if (metadata[id].action === 'insert') {
				var clone = $.extend(true, {}, resource);
				delete(clone.tmpId);
				httpResource.save(clone,
					function (data) {
						_success(resource);
						_copyDataToResource(resource, data);
					}, function (httpResponse) {
						_error(httpResponse, resource, 'insert');
					}
				);
			}
			// Update resource
			else if (metadata[id].action === 'update') {
				httpResource.update({id: id}, resource,
					function (data) {
						_success(resource);
						_copyDataToResource(resource, data);
					}, function (httpResponse) {
						_error(httpResponse, resource, 'update');
					}
				);
			}
			// Delete resource
			else if (metadata[id].action === 'delete') {
				httpResource.delete({id: id},
					function () {
						_success(resource);
					}, function (httpResponse) {
						_error(httpResponse, resource, 'delete');
					}
				);
			}
		});
	};

	/**
	 * Get resources from server and give it through the callback
	 * The callback return an error, or null and the data.
	 */
	var getResources = function (type, callback) {
		var httpResource = _getHTTPResource(type);
		var success = function (data, responseHeaders) {
			$loader.stop('syncService.get' + type);
			callback(null, data);
		};
		var error = function (httpResponse) {
			$loader.stop('syncService.get' + type);
			callback(new Error(httpResponse.status));
		};
		httpResource.query(success, error);
		$loader.start('syncService.get' + type);
	};

	// Sync the changes every X seconds
	$interval(_sync, 2000);

	// Return change handling methods
	return {
		init:				init,
		newResource:		newResource,
		updateResource:		updateResource,
		deleteResource:		deleteResource,
		getResources:		getResources
	};
});

/**
 * Modal service
 */
webApp.service('$modal', function ($rootScope) {

	// Modal template url
	$rootScope.modal = '';

	// Modal parameters
	this.parameters = {};

	// Get the modal url from the name
	var _getModalUrl = function (name) {
		return 'modals/' + name + '.html';
	};

	// Show the modal
	this.show = function (name, params) {
		if (!$rootScope.modal) {
			if (params) {
				this.parameters = params;
			}
			this.dim();
			$rootScope.modal = _getModalUrl(name);
		}
	};

	// Hide the modal
	this.hide = function (name) {
		if (this.isShown(name)) {
			$rootScope.modal = '';
			this.clear();
			this.parameters = {};
		}
	};

	// Dim the screen
	this.dim = function () {
		if (!$rootScope.modal) {
			$('#nav-search-content input').attr('tabindex', -1);
			$('.dim').addClass('dim-active');
		}
	};

	// Clear the screen
	this.clear = function () {
		if (!$rootScope.modal) {
			$('.dim').removeClass('dim-active');
			$('#nav-search-content input').attr('tabindex', 1);
		}
	};

	// Return whether the modal is shown or not
	this.isShown = function (name) {
		return $rootScope.modal === _getModalUrl(name);
	};

	// Export methods
	return this;

});

/**
 * Download service
 */
webApp.service('$download', function () {

	// Return whether the modal is shown or not
	this.download = function (name, data) {
		var link = $('#download-link').get(0);
		link.href = data;
		link.target = '_blank';
		link.download = name;
		link.click();
		link.href = '';
		link.target = '';
		link.download = '';
	};

	// Export methods
	return this;

});

/**
 * Loader service, shows a loading icon
 */
webApp.service('$loader', function ($rootScope) {

	var loader = {};

	this.start = function (name) {
		loader[name] = true;
		$rootScope.loading = this.isLoading();
	};

	this.stop = function (name) {
		delete(loader[name]);
		$rootScope.loading = this.isLoading();
	};

	this.isLoading = function (name) {
		if (!name) {
			return Object.keys(loader).length > 0;
		}
		return loader[name] === true;
	};

	// Export methods
	return this;

});