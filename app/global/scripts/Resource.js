/* exported Resource */
/* global Config, Session */
'use strict';


/**
 * Resource class definition
 *
 * @param path the path of the resource to CRUD (/notes, /contacts...)
 * @param methods additional methods for the resource
 */
function Resource(path, methods) {
	// Set the path
	this.path = path;
	// Make function for ajax calls
	var getFunctionFor = function (method) {
		// Prepare the query
		var query = {
			url:			Config.api + this.path + method.path,
			type:			method.method || 'GET',
			headers:		method.headers || {},
		}
		// If authentication needed
		if (method.auth !== false) {
			query.headers['API-Token'] = Session.getToken();
		}
		// Return function
		return function (params, data, success, error) {
			// If there are parameters
			if (method.params) {
				for (var key in method.params) {
					var regexp = new RegExp('{{' + key + '}}', 'g');
					query.url = query.url.replace(regexp, method.params[key]);
				}
			}
			// If there is data
			if (method.data) {
				query.processData = false;
				if (_.isObject(method.data)) {
					query.data = JSON.stringify(data);
					query.contentType = 'application/json; charset=utf-8';
				} else {
					query.data = data;
				}
			}
			// Set callbacks
			query.success = success;
			query.error = error;
			// Execute query
			$.ajax(query);
		}
	};
	// Set the additional methods
	for (var key in methods) {
		this[key] = getFunctionFor(methods[key]);
	}
};

/**
 * Get all the resources
 *
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
Resource.prototype.get = function (success, error) {
	var request = {
		url:		Config.api + this.path,
		type:		'GET',
		headers:	{'API-Token': Session.getToken()},
		success:	success,
		error:		error
	};
	$.ajax(request);
};

/**
 * Insert a resource
 *
 * @param data the data to insert
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
Resource.prototype.insert = function (data, success, error) {
	$.ajax({
		url:			Config.api + this.path,
		type:			'POST',
		headers:		{'API-Token': Session.getToken()},
		data:			JSON.stringify(data),
		contentType:	'application/json; charset=utf-8',
		processData:	false,
		success:		success,
		error:			error
	});
};

/**
 * Update a resource by it's id
 *
 * @param id the id of the resource to update
 * @param data the data to insert
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
Resource.prototype.update = function (id, data, success, error) {
	$.ajax({
		url:			Config.api + this.path + '/' + id,
		type:			'PUT',
		headers:		{'API-Token': Session.getToken()},
		data:			JSON.stringify(data),
		contentType:	'application/json; charset=utf-8',
		processData:	false,
		success:		success,
		error:			error
	});
};

/**
 * Delete a resource by it's id
 *
 * @param id the id of the resource to delete
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
Resource.prototype.delete = function (id, success, error) {
	$.ajax({
		url:			Config.api + this.path + '/' + id,
		type:			'DELETE',
		headers:		{'API-Token': Session.getToken()},
		success:		success,
		error:			error
	});
};