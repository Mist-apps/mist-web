'use strict';


/**
 * Contacts controller
 */
webApp.controller('ContactsController', function ($scope, syncService) {

	/**
	 * Get Contacts from API
	 */
	$scope.contacts = [];
	syncService.getResources('CONTACT', function (err, data) {
		if (err) {
			toastr.error('Unable to get contacts (' + err.message + ')');
		} else {
			$scope.contacts = data;
		}
	});

	/**
	 * Start editing a contact
	 */
	$scope.startEditContact = function (event) {
		if ($(this).hasClass('contact-edit')) {
			// Stop editing other contacts
			$scope.stopEditContacts();
		} else {
			// Stop editing other contacts
			$scope.stopEditContacts();
			// Show editor
			$(this).addClass('contact-edit');
			// Listen to escape key
			$('body').on('keydown', _escapeKeyListener);
		}
	};

	/**
	 * Stop editing the contacts
	 */
	$scope.stopEditContacts = function (event) {
		// Remove editor
		$('.contact').removeClass('contact-edit');
		// Remove the binding to listen to escape key
		$('body').off('keydown', _escapeKeyListener);
	};

	// Listen to clicks on contact to start edit it
	$('body').on('click', '.contact', $scope.startEditContact);

	/**
	 * Custom listeners
	 */
	var _escapeKeyListener = function (event) {
		if (event.which === 27) {
			$scope.stopEditContacts(event);
		}
	};

});


/**
 * Format an address in a one line way
 */
webApp.filter('formatInlineAddress', function () {
	return function (address) {
		return address.street + ' ' + address.number + ' - ' + address.postalCode + ' ' + address.locality + ' - ' + address.country;
	};
});