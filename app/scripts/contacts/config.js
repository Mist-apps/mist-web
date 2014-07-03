'use strict';


/**
 * Configure the routes
 */
webApp.config(function ($routeProvider) {

	$routeProvider.when('/contacts', {
		templateUrl: 'views/contacts.html',
		controller: 'ContactsController',
		authenticated: true,
		appName: 'contacts',
		title: 'Contacts'
	});

});