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
	 * Show the full data of a contact
	 * Warning ! $(event.target) != $(this)
	 */
	$scope.showFullContact = function (event) {
		var target = $(event.target);
		// If menu or link, return
		if (target.hasClass('edit') || target.is('a')) {
			return;
		}
		// If input, start edit contact
		if ((target.is('.name span') || target.is('input') || target.hasClass('address-show') || target.hasClass('mail-show') || target.hasClass('website-show')) && $(this).hasClass('contact-full')) {
			$scope.startEditContact(event);
			return;
		}
		// If the contact is not fully shown
		if (!$(this).hasClass('contact-full')) {
			// Stop showing other contacts full data
			$scope.stopFullContacts();
			// Show full data
			$(this).addClass('contact-full');
			// Listen to escape key
			$('body').on('keydown', _escapeKeyListenerFull);
		}
	};

	/**
	 * Stop showing the full data of the contacts
	 */
	$scope.stopFullContacts = function (event) {
		// Remove full data
		$('.contact').removeClass('contact-full');
		// Remove the binding to listen to escape key
		$('body').off('keydown', _escapeKeyListenerFull);
	};

	/**
	 * Start editing a contact
	 */
	$scope.startEditContact = function (event) {
		// Stop listening to editing or show full demands
		$('body').off('click', '.contact', $scope.showFullContact);
		$('body').off('keydown', _escapeKeyListenerFull);
		// Show editor
		$(event.target).parents('.contact').addClass('contact-edit');
		// Listen to escape key
		$('body').on('keydown', _escapeKeyListenerEdit);
	};

	/**
	 * Stop editing the contacts
	 */
	$scope.stopEditContacts = function (event) {
		// Remove editor
		$('.contact').removeClass('contact-edit');
		// Remove the binding to listen to escape key
		$('body').off('keydown', _escapeKeyListenerEdit);
		// Listen to escape key for full
		$('body').on('keydown', _escapeKeyListenerFull);
		// Re-start listening to editing or show full demands
		$('body').on('click', '.contact', $scope.showFullContact);
	};

	// Listen to clicks to start edit it or show full data
	$('body').on('click', '.contact', $scope.showFullContact);
	$('body').on('click', '.contact .edit', $scope.startEditContact);
	$('body').on('click', '.contact .ok', $scope.stopEditContacts);

	/**
	 * Custom listeners
	 */
	var _escapeKeyListenerEdit = function (event) {
		if (event.which === 27) {
			$scope.stopEditContacts(event);
		}
	};
	var _escapeKeyListenerFull = function (event) {
		if (event.which === 27) {
			$scope.stopFullContacts(event);
		}
	};

	/**
	 * Check whether the key must be ignored or not for informing
	 * the sync service
	 */
	var _keyMustBeIgnored = function (keyCode) {
		var keysToIgnore = [
			37, 38, 39, 40,		// Arrows
			16, 17, 18, 27,		// Shift Control Alt Escape
			9, 19, 91, 92,		// Tab Pause WindowsLeft WindowsRight
			20, 144, 145,		// CapsLock NumLock ScrollLock
			33, 34, 35, 36,		// PageUp PageDown End Home
			45, 93,				// Insert Select
			112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123	// F1 -> F12
		];
		return keysToIgnore.indexOf(keyCode) !== -1;
	};

	/**
	 * Listen to field modifications and inform sync service
	 */
	$scope.fieldKeyListener = function ($event, contact) {
		// Inform sync service and set modification time if necessary
		if (!_keyMustBeIgnored($event.keyCode)) {
			contact.modificationDate = new Date().getTime();
			syncService.updateResource('CONTACT', contact);
		}
	}

});


/**
 * Format an address in a one line way
 */
webApp.filter('formatInlineAddress', function () {
	return function (address) {
		return address.street + ' ' + address.number + ' - ' + address.postalCode + ' ' + address.locality + ' - ' + address.country;
	};
});