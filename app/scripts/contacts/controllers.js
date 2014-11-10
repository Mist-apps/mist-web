'use strict';


/**
 * Contacts controller
 */
webApp.controller('ContactsController', function ($rootScope, $scope, syncService) {

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
	 * Filter the contacts from the menu selection
	 */
	$scope.filterContacts = function (value) {
		if ($rootScope.location === 'all') {
			return !value.deleteDate;
		} else if ($rootScope.location === 'trash') {
			return value.deleteDate;
		} else {
			return false;
		}
	};

	/**
	 * Add a new empty contact
	 */
	$scope.addNewContact = function () {
		// Stop edit another contact
		$scope.stopEditContact();
		$scope.stopFullContact();
		// Add new contact
		var date = new Date().getTime();
		var tmpId = '' + date + Math.floor(Math.random() * 1000000);
		var contact = {tmpId: tmpId, creationDate: date};
		$scope.contacts.push(contact);
		// Inform sync service
		syncService.newResource('CONTACT', contact);
		// Start edit the new contact
		$scope.showFullContact(contact);
		$scope.startEditContact(null, contact);
	};

	/**
	 * Delete a contact
	 */
	$scope.deleteContact = function (contact) {
		// Update contact
		contact.deleteDate = new Date().getTime();
		// Stop edit the contact
		$scope.stopEditContact();
		$scope.stopFullContact();
		// Inform sync service
		syncService.updateResource('CONTACT', contact);
	};

	/**
	 * Delete definitively a contact
	 */
	$scope.destroyContact = function (contact) {
		// Search for contact to delete
		for (var key in $scope.contacts) {
			// If the contact has an id, search if id match, else, search if tmpId match
			if ((contact._id && $scope.contacts[key]._id === contact._id) || (!contact._id && $scope.contacts[key].tmpId === contact.tmpId)) {
				$scope.contacts.splice(key, 1);
				break;
			}
		}
		// Stop edit the contact
		$scope.stopEditContact();
		$scope.stopFullContact();
		// Inform sync service
		syncService.deleteResource('CONTACT', contact);
	};

	/**
	 * Restore a deleted contact
	 */
	$scope.restoreContact = function (contact) {
		// Update contact
		delete(contact.deleteDate);
		// Stop edit the contact
		$scope.stopEditContact();
		$scope.stopFullContact();
		// Inform sync service
		syncService.updateResource('CONTACT', contact);
	};

	// Store the active contact, currently fully shown
	$scope.activeContact = undefined;

	/**
	 * Show the full data of a contact
	 * Warning ! $(event.target) != $(this)
	 */
	$scope.showFullContact = function (contact) {
		// If the contact is not fully shown and no current edit
		if ($scope.activeContact !== contact && !$scope.editing) {
			// Stop showing other contacts full data
			$scope.stopFullContact();
			// Set active contact
			$scope.activeContact = contact;
			// Listen to escape key
			$('body').on('keydown', _escapeKeyListenerFull);
		}
	};

	/**
	 * Stop showing the full data of the contacts
	 */
	$scope.stopFullContact = function () {
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
		if ($event && $($event.target).is('a')) {
			return;
		}
		// If the contact is active and we are not editing already and it is not deleted
		if ($scope.activeContact === contact && !$scope.editing && !contact.deleteDate) {
			// Save current edited contact
			$scope.editing = true;
			// Set Date
			if ($scope.activeContact.birthday) {
				var tmp = new Date(parseInt($scope.activeContact.birthday));
				$scope.date = {
					day:	tmp.getDate(),
					month:	tmp.getMonth() + 1,
					year:	tmp.getFullYear()
				};
				console.log(JSON.stringify($scope.date))
			} else {
				$scope.date = {};
			}
			// Remove the binding to listen to escape key
			$('body').off('keydown', _escapeKeyListenerFull);
			// Listen to escape key
			$('body').on('keydown', _escapeKeyListenerEdit);
		}
	};

	/**
	 * Stop editing the contacts
	 */
	$scope.stopEditContact = function () {
		if ($scope.activeContact && $scope.editing) {
			// Remove current edit
			$scope.editing = false;
			// Remove the binding to listen to escape key
			$('body').off('keydown', _escapeKeyListenerEdit);
			// Listen to escape key for full
			$('body').on('keydown', _escapeKeyListenerFull);
			// Check if some fields are empty
			_removeEmptyFields($scope.activeContact);
			// Check if the contact is empty
			if (_isContactEmpty($scope.activeContact)) {
				$scope.destroyContact($scope.activeContact);
			}
		}
	};

	/**
	 * Add fields in contact
	 */
	$scope.addPhone = function () {
		if (!$scope.activeContact.phones) {
			$scope.activeContact.phones = [];
		}
		$scope.activeContact.phones.push({'type': 'home'});
	};
	$scope.addMail = function () {
		if (!$scope.activeContact.mails) {
			$scope.activeContact.mails = [];
		}
		$scope.activeContact.mails.push({'type': 'personnal'});
	};
	$scope.addAddress = function () {
		if (!$scope.activeContact.addresses) {
			$scope.activeContact.addresses = [];
		}
		$scope.activeContact.addresses.push({'type': 'home'});
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
	};

	var _isContactEmpty = function (contact) {
		for (var field in contact) {
			if (contact.hasOwnProperty(field)
				&& !field.startsWith('_')
				&& !field.startsWith('$')
				&& field !== 'creationDate' && field !== 'modificationDate' && field !== 'deleteDate') {
				// If array, check if it is empty
				if (Array.isArray(contact[field])) {
					if (contact[field].length > 0) {
						return false;
					}
				}
				// If simple field
				else if (contact[field]) {
					return false;
				}
			}
		}
		return true;
	};

	/**
	 * Custom listeners
	 */
	var _escapeKeyListenerEdit = function (event) {
		if (event.which === 27) {
			$scope.stopEditContact();
			$scope.$apply();
		}
	};
	var _escapeKeyListenerFull = function (event) {
		if (event.which === 27) {
			$scope.stopFullContact();
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
	};

});


/**
 * Format an address in a one line way
 */
webApp.filter('formatInlineAddress', function () {
	// Print a field only if not undefined or null
	var _print = function (field) {
		if (field) {
			return field;
		}
		return '';
	};
	// Clean an address to remove unused spaces and '-' characters
	var _clean = function (address) {
		return address.replace(/-\s+-/g, ' ').replace(/\s{2,}/g, ' ').trim().replace(/-$/, '').trim();
	};
	return function (address) {
		if (address) {
			return _clean(_print(address.street) + ' ' + _print(address.number) + ' - ' + _print(address.postalCode) + ' ' + _print(address.locality) + ' - ' + _print(address.country));
		}
		return '';
	};
});

webApp.filter('range', function () {
	return function (input, min, max) {
		min = parseInt(min);
		max = parseInt(max);
		for (var i=min; i<=max; i++) {
			input.push(i);
		}
		return input;
	};
});