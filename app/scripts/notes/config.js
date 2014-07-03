'use strict';


/**
 * Configure the routes
 */
webApp.config(function ($routeProvider) {

	$routeProvider.when('/notes', {
		templateUrl: 'views/notes.html',
		controller: 'NotesCtrl',
		authenticated: true,
		appName: 'notes',
		title: 'Notes'
	});

});