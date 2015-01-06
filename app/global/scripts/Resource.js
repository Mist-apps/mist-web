/* exported Resource */
/* global Config, Session */
'use strict';


// Helper to get a query for a specific method
var _getQueryFor = function (method) {
	return function () { this._query(method, arguments); };
};

/**
 * Resource class definition.
 *
 * A resource can handle additional methods, configured by a method config object:
 *		- path: an additional path to add after the global path (default '')
 *		- method: the method of the query (default GET)
 *		- headers: an object containing key-values pairs of headers (default {})
 *		- auth: whether the method needs authentication or not (default true)
 *
 * When executing the method, params may be given, and will replace the mustaches in the
 * path of the query. They must always be in first position in the function arguments.
 *
 * When executing the method, data may be given, it may be JSON or not. If JSON, content-type
 * is automatically set, and the object stringified. If raw data, the content-type must be set
 * manually in the headers. This argument must always be set between the params and the callbacks.
 *
 * @param path the path of the resource to CRUD (/notes, /contacts...)
 * @param methods additional methods for the resource
 */
function Resource(path, methods) {
	// Set the path
	this.path = path;
	// Set the additional methods
	for (var key in methods) {
		this[key] = _getQueryFor(methods[key]);
	}
}

/**
 * Default query method, it takes the method definition, and the arguments of the call
 */
Resource.prototype._query = function (method, args) {
	// Prepare the query
	var query = {
		url:			Config.api + this.path + (method.path || ''),
		type:			method.method || 'GET',
		headers:		method.headers || {},
	};
	// If authentication needed
	if (method.auth !== false) {
		query.headers['API-Token'] = Session.getToken();
	}
	var currentArg = 0;
	// If there must be parameters
	if (query.url.indexOf('{{') !== -1) {
		for (var key in args[currentArg]) {
			var regexp = new RegExp('{{' + key + '}}', 'g');
			query.url = query.url.replace(regexp, args[currentArg][key]);
		}
		currentArg++;
	}
	// If there is data
	if (!_.isFunction(args[currentArg])) {
		query.processData = false;
		if (_.isObject(args[currentArg])) {
			query.data = JSON.stringify(args[currentArg]);
			query.contentType = 'application/json; charset=utf-8';
		} else {
			query.data = args[currentArg];
		}
		currentArg++;
	}
	// Set callbacks
	if (_.isFunction(args[currentArg])) {
		query.success = args[currentArg];
		currentArg++;
	}
	if (_.isFunction(args[currentArg])) {
		query.error = args[currentArg];
	}
	// Execute query
	$.ajax(query);
};

/**
 * Default CRUD methods for each resource
 */
Resource.prototype.get = _getQueryFor({});
Resource.prototype.insert = _getQueryFor({method: 'POST'});
Resource.prototype.update = _getQueryFor({method: 'PUT', path: '/{{id}}'});
Resource.prototype.delete = _getQueryFor({method: 'DELETE', path: '/{{id}}'});