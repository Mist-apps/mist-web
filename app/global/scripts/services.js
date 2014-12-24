'use strict';


/**
 * Authentication service to login/logout and manage the Session.
 */
var AuthService = {

	/**
	 * Login by sending the credentials to the API and waiting for a token.
	 * This method returns a promise.
	 *
	 * If ok, store the token into session/local storage and resolve the promise
	 * If not ok, reject the promise with an error code and message
	 */
	login: function (credentials) {
		var deferred = $.Deferred();
		// If login attempt success
		var success = function (data) {
			// Create the session
			Session.create(data.token, data.user);
			// Save token in local/session storage
			if (credentials.remember) {
				localStorage.setItem('token', data.token);
			} else {
				sessionStorage.setItem('token', data.token);
			}
			// Connected
			deferred.resolve();
		};
		// If login attempt fails
		var error = function (httpResponse) {
			if (httpResponse.status === 401) {
				deferred.reject({code: 1, message: 'Bad credentials'});
			} else if (httpResponse.status === 404) {
				deferred.reject({code: 2, message: 'Unable to join server'});
			} else {
				deferred.reject({code: 3, message: 'Unknown error'});
			}
		};
		// Try to log in
		UserResource.login(credentials, success, error);
		// Return a promise
		return deferred.promise();
	},

	/**
	 * Logout by destroying the token
	 */
	logout: function () {
		// Destroy session
		Session.destroy();
		// Clear all the local/session storage
		sessionStorage.clear();
		localStorage.clear();
	},

	/**
	 * Try to recover the authentication by searching for a token in
	 * session/local storage. If found, ask for user information.
	 * This method returns a promise.
	 */
	recover: function () {
		var deferred = $.Deferred();
		// Search for token in local/session storage
		var token = sessionStorage.getItem('token');
		if (!token) {
			token = localStorage.getItem('token');
		}
		// If token found
		if (token) {
			// If user information retrieval success
			var success = function (data) {
				// Create the session
				Session.create(token, data);
				// Connected
				deferred.resolve();
			};
			// If user information retrieval fails
			var error = function () {
				// Not connected
				deferred.reject('Unknown error when retrieving user');
			};
			// Get user information
			UserResource.recover(token, success, error);
		}
		// If no token found
		else {
			deferred.reject('No token found in storage');
		}
		// Return a promise
		return deferred.promise();
	},

	/**
	 * Check if the user is authenticated or not
	 */
	isAuthenticated: function () {
		return !!Session.getToken();
	}

};


/**
 * Session containing the user, token...
 */
var Session = (function () {

	// Session state
	var token = null;
	var user = null;

	// Export methods
	return {
		getToken: function () {
			return token;
		},
		getUser: function () {
			return user;
		},
		create: function (newToken, newUser) {
			token = newToken;
			user = newUser;
		},
		destroy: function () {
			token = null;
			user = null;
		},
		update: function (newUser) {
			user = newUser;
		}
	};

})();


/**
 * Modal service
 * Show and hide modals, only one modal at the same time !
 * The modal name must be given, it must be in the modals folder,
 * or in the global/partials folder, but then, the name must start with 'global-'.
 * Dim and clear the screen, only if no modals are shown.
 * When a modal is shown, some parameters may be given.
 * They are accessible through the 'getParameters()' method.
 */
var ModalService = (function () {

	var modal = '';
	var parameters = {};

	// Get the parameters of the modal
	var getParameters = function () {
		return parameters;
	};

	// Get the modal url from the name, if starts with 'global-', look into the global partials folder
	var _getModalUrl = function (name) {
		if (name.indexOf('global-') === 0) {
			return '../global/partials/' + name.substring(7) + '.html';
		}
		return 'partials/' + name + '.html';
	};

	var _getModalController = function (name) {
		if (name.indexOf('global-') === 0) {
			name = name.substring(7)
			return name.charAt(0).toUpperCase() + name.slice(1) + 'Controller';
		}
		return name.charAt(0).toUpperCase() + name.slice(1) + 'Controller';
	}

	// Center the modal
	var _center = function () {
		// Get window height without 2 * 10px for dialog box margin
		var windowHeight = $(window).height() - 20;
		// Get content max height from window height minus the modal header and footer
		var contentMaxHeight = windowHeight - $('.modal-header').outerHeight(true) - $('.modal-footer').outerHeight(true);
		// Set content max-height
		$('.modal-content').css('max-height', (contentMaxHeight - 40) + 'px');
		// Get the modal effective height
		var modalHeight = $('.modal').height();
		// Set top window offset, add the 10px top margin
		$('#modal-container').css('top', ((windowHeight - modalHeight) / 3 + 10) + 'px');
	};

	// Open a modal
	var show = function (name, params) {
		if (!modal) {
			if (params) {
				parameters = params;
			}
			dim();
			modal = name;
			$.get(_getModalUrl(modal)).done(function (html) {
				// Show modal
				$('#modal-container').empty().append(html);
				// Execute controller
				window[_getModalController(name)]();
				// Center the modal
				_center();
				$(window).on('resize', _center);
				$('.modal-content').on('resize', _center);
			}).fail(function () {
				toastr.error('Unable to open modal');
			});
		}
	};

	// Hide a modal
	var hide = function (name) {
		if (isShown(name)) {
			modal = '';
			clear();
			parameters = {};
			$('#modal-container').empty();
			// Stop center the modal
			$(window).off('resize', _center);
			$('.modal-content').off('resize', _center);
		}
	};

	// Return whether the modal is shown or not
	var isShown = function (name) {
		return modal === name;
	};

	// Dim the screen
	var dim = function () {
		if (!modal) {
			$('#nav-search-content input').attr('tabindex', -1);
			$('.dim').addClass('dim-active');
		}
	};

	// Clear the screen
	var clear = function () {
		if (!modal) {
			$('.dim').removeClass('dim-active');
			$('#nav-search-content input').attr('tabindex', 1);
		}
	};

	// Export methods
	return {
		getParameters:	getParameters,
		show:			show,
		hide:			hide,
		isShown:		isShown,
		dim:			dim,
		clear:			clear
	};

})();


/**
 * Sync service to sync resources with the server.
 *
 * This service is generic so you may pass any resource you want to sync.
 * Keep in mind a Resource provider must be present and named: "{{type}}Resource"
 */
var SyncService = (function () {

	// Sync Status
	var syncStatus = 'synced';

	// Sync status access methods
	var getSyncStatus = function () {
		return syncStatus;
	};
	var setSyncStatus = function (newSyncStatus) {
		syncStatus = newSyncStatus;
		$('#menu-sync').children().hide();
		$('#menu-sync-' + syncStatus).show();
	};

	/**
	 * Initialize the sync service, nothing to sync and status synced
	 */
	var init = function () {
		setSyncStatus('synced');
		resources = {};
		metadata = {};
	};

	/**
	 * Handle sync status
	 */
	var _setStatusSyncing = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if (syncStatus === 'stopped') { return; }
		// If the sync is in error, it is not possible to set it to syncing, wait for good sync before
		if (syncStatus === 'error') { return; }
		// Set status
		setSyncStatus('syncing');
	};
	var _setStatusSynced = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if (syncStatus === 'stopped') { return; }
		// Set status
		setSyncStatus('synced');
	};
	var _setStatusError = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if (syncStatus === 'stopped') { return; }
		// If the sync pass for the first time in error, show an error notification
		if (syncStatus !== 'error') { toastr.error('Unable to sync'); }
		// Set status
		setSyncStatus('error');
	};

	/**
	 * Prevent leave page when not totally synced
	 */
	window.onbeforeunload = function(event) {
		event = event || window.event;
		var message = '';
		switch (syncStatus) {
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

	/**
	 * Handle resource modifications.
	 * Add new recources to sync, updated...
	 */
	var newResource = function (type, resource) {
		resources[resource.tmpId] = resource;
		metadata[resource.tmpId] = {type: type, status: 'ready', action: 'insert'};
		_setStatusSyncing();
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
			_setStatusSyncing();
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
			_setStatusSyncing();
		}
		// If the resource is new
		else {
			_removeResource(resource);
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
		type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
		return window[type + 'Resource'];
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
		if (syncStatus === 'stopped') {
			return;
		}
		// Check if something to do
		if (_isSynced()) {
			_setStatusSynced();
			return;
		}
		// If a resource sync success
		var _success = function (resource) {
			var id = resource._id ? resource._id : resource.tmpId;
			// If dirty resource, remove error and set no more syncing
			if (metadata[id].dirty) {
				metadata[id].dirty = false;
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
				setSyncStatus('stopped');
				_removeResource(resource);
				// TODO $broadcast('CONFLICT', resource, response.data);
			}
			// Check for conflict (deleted)
			if (response.status === 404) {
				setSyncStatus('stopped');
				_removeResource(resource);
				// TODO $broadcast('CONFLICT', resource, null);
			}
		};
		// Check if the sync is done, and set the status
		var _checkEndOfSync = function () {
			if (_isSynced()) {
				_setStatusSynced();
			} else if (_isSyncError()) {
				_setStatusError();
			}
		};
		// Handle resources
		Object.keys(resources).forEach(function (id) {
			var httpResource = _getHTTPResource(metadata[id].type);
			var resource = resources[id];
			// Check and set syncing status for resource
			if (metadata[id].syncing) {
				return;
			} else {
				metadata[id].syncing = true;
			}
			// Insert resource
			if (metadata[id].action === 'insert') {
				// Sync the resource with the DOM view
				if (resource.__sync) {
					resource.__sync(resource);
				}
				// Clone the resource to remove the wrong data
				var clone = _.omit(resource, ['tmpId', '__view', '__sync']);
				// Send the request
				httpResource.insert(clone,
					function (data) {
						_success(resource);
						delete(resource.tmpId);
						resource._id = data._id;
						resource._revision = data._revision;
					}, function (httpResponse) {
						_error(httpResponse, resource, 'insert');
					}
				);
			}
			// Update resource
			else if (metadata[id].action === 'update') {
				// Sync the resource with the DOM view
				if (resource.__sync) {
					resource.__sync(resource);
				}
				// Clone the resource to remove the wrong data
				var clone = _.omit(resource, ['__view', '__sync']);
				// Send the request
				httpResource.update(id, clone,
					function (data) {
						_success(resource);
						resource._revision = data._revision;
					}, function (httpResponse) {
						_error(httpResponse, resource, 'update');
					}
				);
			}
			// Delete resource
			else if (metadata[id].action === 'delete') {
				httpResource.delete(id,
					function () {
						_success(resource);
					}, function (httpResponse) {
						_error(httpResponse, resource, 'delete');
					}
				);
			}
		});
	};

	// Sync the changes every X seconds
	setInterval(_sync, 2000);

	/**
	 * Get resources from server and give it through the callback.
	 * The callback return an error, or null and the data.
	 *
	 * The resources are synced automatically from the server to the
	 * client. But not in the other way. To sync from client to server,
	 * use the sync methods.
	 *
	 * If another resource is got, the first one is no more synced.
	 */
	var getResources = function (type, callback) {
		var success = function (data) {
			callback(null, data);
		};
		var error = function (httpResponse) {
			callback(new Error(httpResponse.status));
		};
		// Ask for resources
		var httpResource = _getHTTPResource(type);
		httpResource.get(success, error);
	};

	// Export methods
	return {
		getSyncStatus:		getSyncStatus,
		setSyncStatus:		setSyncStatus,
		init:				init,
		newResource:		newResource,
		updateResource:		updateResource,
		deleteResource:		deleteResource,
		getResources:		getResources
	};

})();


/**
 * Loader service, shows a loading icon
 *
 * Methods:
 * 		- start(identifier) 		Starts the loading process for someone, the caller identifier must be given
 *		- stop(identifier) 			Stop the loading process for someone, the caller identifier must be given
 *		- isLoading([identifier]) 	Is the loading process active for someone ? If no caller identifier fiven, check every caller
 */
var LoaderService = (function () {

	// Loading services
	var loader = {};

	// Export methods
	return {
		start: function (name) {
			loader[name] = true;
			if (this.isLoading()) {
				$('#loader').show();
			}
		},
		stop: function (name) {
			delete(loader[name]);
			if (!this.isLoading()) {
				$('#loader').hide();
			}
		},
		isLoading: function (name) {
			if (!name) {
				return Object.keys(loader).length > 0;
			}
			return loader[name] === true;
		}
	};

})();


/**
 * Download service
 *//*
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
*/