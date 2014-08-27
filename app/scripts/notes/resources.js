'use strict';


/**
 * Notes resource
 */
webApp.factory('noteResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/note/:id', {id: '@id'}, {
		update: { method: 'PUT' },
		exportJSON: { method: 'GET', url: API_URL + '/note/export', headers: {'Accept': 'application/json'}, isArray: true }
	});
}]);