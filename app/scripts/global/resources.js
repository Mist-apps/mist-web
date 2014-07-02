'use strict';


/**
 * User resource
 */
webApp.factory('userResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/user', {}, {
		update: {method: 'PUT'},
		login: {method: 'POST', url: API_URL + '/login'}
	});
}]);