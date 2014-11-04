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

	// Store the active contact, currently fully shown
	$scope.activeContact = undefined;

	/**
	 * Show the full data of a contact
	 * Warning ! $(event.target) != $(this)
	 */
	$scope.showFullContact = function ($event, contact) {
		// Get the contact DOM object
		var target = $($event.target);
		if (!target.hasClass('contact')) {
			target = target.parents('.contact')
		}
		// If the contact is not fully shown and no current edit
		if ($scope.activeContact !== contact && !$scope.editing && !target.hasClass('contact-full')) {
			// Stop showing other contacts full data
			$scope.stopFullContacts();
			// Set active contact
			$scope.activeContact = contact;
			// Listen to escape key
			$('body').on('keydown', _escapeKeyListenerFull);
		}
	};

	/**
	 * Stop showing the full data of the contacts
	 */
	$scope.stopFullContacts = function (event) {
		// Remove active contact
		$scope.activeContact = undefined;
		// Remove the binding to listen to escape key
		$('body').off('keydown', _escapeKeyListenerFull);
	};

	// Store whether the active contact is edited or not
	$scope.editing = false;

	/**
	 * Start editing a contact
	 */
	$scope.startEditContact = function ($event, contact) {
		// Check if we clicked on a link
		if ($($event.target).is('a')) {
			return;
		}
		// If the contact is active and we are not editing already
		if ($scope.activeContact === contact && !$scope.editing) {
			// Save current edited contact
			$scope.editing = true;
			// Remove the binding to listen to escape key
			$('body').off('keydown', _escapeKeyListenerFull);
			// Listen to escape key
			$('body').on('keydown', _escapeKeyListenerEdit);
		}
	};

	/**
	 * Stop editing the contacts
	 */
	$scope.stopEditContacts = function (event) {
		// Remove the binding to listen to escape key
		$('body').off('keydown', _escapeKeyListenerEdit);
		// Listen to escape key for full
		$('body').on('keydown', _escapeKeyListenerFull);
		// Check if some fields are empty
		_removeEmptyFields($scope.activeContact);
		// Remove current edit
		$scope.editing = false;
	};

	/**
	 * Check in the current contact if some fields are empty and remove it.
	 */
	var _removeEmptyFields = function (contact) {
		var mustSync = false;
		// Check fields
		for (var field in contact) {
			if (contact.hasOwnProperty(field)) {
				// Check normal fields
				if (contact[field] === '') {
					mustSync = true;
					delete(contact[field]);
				}
				// Check phones
				else if (field === 'phones') {
					for (var phone in contact.phones) {
						if (!contact.phones[phone].number || contact.phones[phone].number === '') {
							mustSync = true;
							contact.phones.splice(phone, 1);
						}
					}
				}
				// Check mails
				else if (field === 'mails') {
					for (var mail in contact.mails) {
						if (!contact.mails[mail].address || contact.mails[mail].address === '') {
							mustSync = true;
							contact.mails.splice(mail, 1);
						}
					}
				}
				// Check address
				else if (field === 'addresses') {
					for (var address in contact.addresses) {
						if ((!contact.addresses[address].street || contact.addresses[address].street === '')
							&& (!contact.addresses[address].number || contact.addresses[address].number === '')
							&& (!contact.addresses[address].locality || contact.addresses[address].locality === '')
							&& (!contact.addresses[address].region || contact.addresses[address].region === '')
							&& (!contact.addresses[address].postalCode || contact.addresses[address].postalCode === '')
							&& (!contact.addresses[address].country || contact.addresses[address].country === '')) {
							mustSync = true;
							contact.addresses.splice(address, 1);
						}
					}
				}
			}
		}
		// Sync contact if necessary
		if (mustSync) {
			contact.modificationDate = new Date().getTime();
			syncService.updateResource('CONTACT', contact);
		}
	}

	// Listen to clicks to start edit it or show full data
	$('body').on('click', '.contact .ok', $scope.stopEditContacts);

	/**
	 * Custom listeners
	 */
	var _escapeKeyListenerEdit = function (event) {
		if (event.which === 27) {
			$scope.stopEditContacts(event);
			$scope.$apply();
		}
	};
	var _escapeKeyListenerFull = function (event) {
		if (event.which === 27) {
			$scope.stopFullContacts(event);
			$scope.$apply();
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