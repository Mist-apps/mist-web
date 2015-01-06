/* exported SyncService */
'use strict';


/**
 * Sync service to sync resources with the server.
 *
 * This service is generic so you may pass any resource you want to sync.
 * Keep in mind a Resource provider must be present and named: "{{type}}Resource"
 */
var SyncService = (function () {

	// Sync Status
	var syncStatus = 'synced';
	//	Save resources to sync, new resources have no _id but a tmpId
	var resources = {};
	var metadata = {};
	// Timer to sync every x seconds
	var timer;
	// Config
	var syncInterval = 2000;

	/**
	 * Sync status access methods
	 */
	var getSyncStatus = function () {
		return syncStatus;
	};
	var _setSyncStatus = function (newSyncStatus) {
		syncStatus = newSyncStatus;
		$('#menu-sync').children().hide();
		$('#menu-sync-' + syncStatus).show();
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
		_setSyncStatus('syncing');
	};
	var _setStatusSynced = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if (syncStatus === 'stopped') { return; }
		// Set status
		_setSyncStatus('synced');
	};
	var _setStatusError = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if (syncStatus === 'stopped') { return; }
		// If the sync pass for the first time in error, show an error notification
		if (syncStatus !== 'error') { toastr.error('Unable to sync'); }
		// Set status
		_setSyncStatus('error');
	};

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
				stop();
				_removeResource(resource);
				_trigger('conflict', {local: resource, remote: JSON.parse(response.responseText)});
			}
			// Check for conflict (deleted)
			if (response.status === 404) {
				stop();
				_removeResource(resource);
				_trigger('conflict', {local: resource, remote: null});
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
				httpResource.update({id: id}, clone,
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

	/**
	 * Start and stop the sync service: set the status, and start/stop the timer
	 */
	var start = function () {
		_setSyncStatus(_isSynced() ? 'synced' : 'syncing');
		timer = setInterval(_sync, syncInterval);
	};
	var stop = function () {
		clearInterval(timer);
		_setSyncStatus('stopped');
	};

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

	/**
	 * Observer pattern
	 */
	var observers = {};
	var on = function (event, callback) {
		if (observers[event]) {
			observers[event].push(callback);
		} else {
			observers[event] = [callback];
		}
	};
	var _trigger = function (event, args) {
		if (observers[event]) {
			for (var key in observers[event]) {
				observers[event][key](args);
			}
		}
	};

	// Export methods
	return {
		start:				start,
		stop:				stop,
		getSyncStatus:		getSyncStatus,
		newResource:		newResource,
		updateResource:		updateResource,
		deleteResource:		deleteResource,
		getResources:		getResources,
		on:					on
	};

})();