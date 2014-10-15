'use strict';


/**
 * Contacts resource
 */
webApp.factory('contactResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/contact/:id', {id: '@id'}, {
		update: { method: 'PUT' }
	});
}]);