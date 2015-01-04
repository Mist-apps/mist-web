'use strict';


/**
 * Contacts controller
 */
webApp.controller('ContactsController', function ($scope, $modal, syncService) {

	/**
	 * Left menu location
	 */
	$scope.location = 'all';
	$scope.$watch('location', function () {
		var interval = setInterval(function () {
			var title = $('#menu-item-' + $scope.location).text();
			if (title && $('#nav-menu-title').html() !== undefined) {
				$('#nav-menu-title').html(title);
				clearInterval(interval);
			}
		}, 10);
	});

	/**
	 * Get Contacts from API
	 */
	$scope.getContacts = function () {
		$scope.contacts = [];
		syncService.getResources('CONTACT', function (err, data) {
			if (err) {
				toastr.error('Unable to get contacts (' + err.message + ')');
			} else {
				$scope.contacts = data;
			}
		});
	};
	$scope.getContacts();

	/**
	 * Filter the contacts from the menu selection
	 */
	$scope.filterContacts = function (value) {
		// If it is a group
		if (value.name) {
			return false;
		}
		// If it is a contact
		if ($scope.location === 'all') {
			return !value.deleteDate;
		} else if ($scope.location === 'trash') {
			return value.deleteDate;
		} else if ($scope.location === 'ungrouped') {
			return !value.groups || value.groups.length === 0;
		} else if ($scope.location === 'Starred') {
			return value.groups && value.groups.indexOf('Starred') > -1;
		} else {
			return value.groups && value.groups.indexOf($scope.groupName) > -1;
		}
	};

	/**
	 * Filter the groups
	 */
	$scope.filterGroups = function (value) {
		return value.name;
	};

	/**
	 * Import/Export
	 */
	$scope.importExport = function () {
		$modal.show('contacts-import');
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
		$scope.toggleFullContact(null, contact);
		$scope.startEditContact(contact);
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
	 * Show the full data of a contact or hide it.
	 * Warning ! $(event.target) != $(this)
	 */
	$scope.toggleFullContact = function ($event, contact) {
		// Check if we clicked on a link
		if ($event && $($event.target).is('a')) {
			return;
		}
		// If the contact is not fully shown and no current edit
		if ($scope.activeContact !== contact && !$scope.editing) {
			// Stop showing other contacts full data
			$scope.stopFullContact();
			// Set active contact
			$scope.activeContact = contact;
			// Listen to escape key
			$('body').on('keydown', _escapeKeyListenerFull);
		}
		// If the contact is currently fully chown, and not editing
		else if ($scope.activeContact === contact && !$scope.editing) {
			$scope.stopFullContact();
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
	$scope.startEditContact = function (contact) {
		// If the contact is active and we are not editing already and it is not deleted
		if ($scope.activeContact === contact && !$scope.editing && !contact.deleteDate) {
			// Save current edited contact
			$scope.editing = true;
			// Set tmpDate
			if ($scope.activeContact.birthday) {
				var tmp = new Date(parseInt($scope.activeContact.birthday));
				var _zero = function (number) {
					if (number <= 9) {
						return '0' + number;
					} else {
						return number;
					}
				};
				$scope.tmpDate = tmp.getFullYear() + '-' + _zero(tmp.getMonth() + 1) + '-' + _zero(tmp.getDate());
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
			// Set birthday
			if ($scope.tmpDate) {
				var tmp = Date.parse($scope.tmpDate);
				if (tmp !== $scope.activeContact.birthday) {
					$scope.activeContact.birthday = tmp;
					syncService.updateResource('CONTACT', $scope.activeContact);
				}
			} else {
				$scope.activeContact.birthday = '';
			}
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
	 * Start uploading new image
	 */
	$scope.uploadImage = function (contact) {
		if ($scope.activeContact === contact && $scope.editing) {
			$modal.show('contacts-image-picker', {contact: contact});
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
		$scope.activeContact.mails.push({'type': 'personal'});
	};
	$scope.addAddress = function () {
		if (!$scope.activeContact.addresses) {
			$scope.activeContact.addresses = [];
		}
		$scope.activeContact.addresses.push({'type': 'home'});
	};

	/**
	 * Set type in field
	 */
	$scope.setPhoneType = function (contact, phone, type) {
		phone.type = type;
		syncService.updateResource('CONTACT', contact);
	};
	$scope.setAddressType = function (contact, address, type) {
		address.type = type;
		syncService.updateResource('CONTACT', contact);
	};
	$scope.setMailType = function (contact, mail, type) {
		mail.type = type;
		syncService.updateResource('CONTACT', contact);
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
				&& field.charAt(0) !== '_'
				&& field.charAt(0) !== '$'
				&& field !== 'tmpId'
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

	/**
	 * Listen to broadcasts
	 */
	$scope.$on('REFRESH', function (event) {
		$scope.getContacts();
	});

});

webApp.controller('ImagePickerController', function ($scope, $modal, syncService) {

	// Boundaries for cropping
	var imagePreviewWidth = $('#image-preview').width();
	var imagePreviewHeight = $('#image-preview').height();
	var coordinates;
	// Cropping library
	var jcrop;
	// Is default image
	var isDefault = false;

	/**
	 * Set the default image
	 */
	var _setDefault = function () {
		// If already default, does nothing
		if (isDefault) {
			return;
		} else {
			isDefault = true;
		}
		// Create image object with base64 upload
		var image = new Image();
		image.src = 'images/user.png';
		image.onload = function () {
			var canvas = document.getElementById('image-canvas');
			canvas.width = 85;
			canvas.height = 85;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(image, 0, 0, 85, 85);
			$('#image-preview > img').attr('src', canvas.toDataURL());
		};
	};

	/**
	 * Remove Jcrop if it was set
	 */
	var _removeJcrop = function () {
		// If there was a previous image cropping
		if (jcrop) {
			// Destroy the jcrop objects
			jcrop.destroy();
			jcrop = undefined;
			// Clean the DOM
			$('#upload-preview').empty();
			$('#upload-preview').append('<img />');
			$('#upload-preview').hide();
			$('#image-preview > img').remove();
			$('#image-preview').prepend('<img />');
			// Send the resize event, for centering the modal
			$('.modal-content').resize();
		}
	};

	/**
	 * Preview the result of the crop operation
	 */
	var _preview = function (coords) {
		// Save coordinates
		coordinates = coords;
		// Calculate deplacement
		var rx = imagePreviewWidth / coords.w;
		var ry = imagePreviewHeight / coords.h;
		// Get upload preview boundaries
		var uploadPreviewWidth = $('#upload-preview > img').width();
		var uploadPreviewHeight = $('#upload-preview > img').height();
		// Set image preview
		$('#image-preview > img').css({
			width: Math.round(rx * uploadPreviewWidth) + 'px',
			height: Math.round(ry * uploadPreviewHeight) + 'px',
			marginLeft: '-' + Math.round(rx * coords.x) + 'px',
			marginTop: '-' + Math.round(ry * coords.y) + 'px'
		});
	};

	/**
	 * Upload the file on the client for cropping and preview
	 */
	$scope.upload = function () {
		isDefault = false;
		var input = $('#user-image-input').get(0);
		if (input.files && input.files[0]) {
			// Remove previous jcrop
			_removeJcrop();
			// Read the file input
			var reader = new FileReader();
			reader.onload = function (e) {
				// Set the image for previews
				$('#upload-preview').show();
				$('#upload-preview > img').attr('src', e.target.result);
				$('#image-preview > img').attr('src', e.target.result);
				// Add jcrop behaviour
				$('#upload-preview > img').Jcrop({
					aspectRatio:	1,
					boxWidth:		350,
					boxHeight:		350,
					onChange:		_preview,
					onSelect:		_preview
				}, function () {
					jcrop = this;
				});
				// Send the resize event, for centering the modal
				$('.modal-content').resize();
			};
			reader.readAsDataURL(input.files[0]);
		}
	};

	/**
	 * Save the image in the contact
	 */
	$scope.save = function (contact) {
		// If default image
		if (isDefault) {
			delete($modal.parameters.contact.image);
		}
		// If new image
		else if (coordinates) {
			// Create canvas for resizing image
			var canvas = document.getElementById('image-canvas');
			canvas.width = 85;
			canvas.height = 85;
			var ctx = canvas.getContext('2d');
			// Create image object with base64 upload
			var image = $('#image-preview > img').get(0);
			ctx.drawImage(image, coordinates.x, coordinates.y, coordinates.w, coordinates.h, 0, 0, 85, 85);
			$modal.parameters.contact.image = canvas.toDataURL();
		}
		// Notify sync service
		syncService.updateResource('CONTACT', $modal.parameters.contact);
		// Hide modal
		$modal.hide('contacts-image-picker');
	};

	/**
	 * Remove the current image
	 */
	$scope.remove = function () {
		_removeJcrop();
		_setDefault();
	};

	/**
	 * Cancel the image upload: hide modal
	 */
	$scope.cancel = function () {
		$modal.hide('contacts-image-picker');
	};

	// Initialize image
	if ($modal.parameters.contact.image) {
		$('#image-preview > img').attr('src', $modal.parameters.contact.image);
	} else {
		_setDefault();
	}

});


/**
 * Import/Export controller (modal)
 */
webApp.controller('ContactsImportController', function ($rootScope, $scope, $http, $modal, $download, toastr, contactResource) {

	$scope.importType = 'mist';

	$scope.import = function () {
		var input = $('#modal-contacts-import .import-file').get(0);
		if (input.files && input.files[0]) {
			// Prepare reader
			var reader = new FileReader();
			// Import when file read
			reader.onload = function (e) {
				// Callbacks
				var success = function (data) {
					$modal.hide('contacts-import');
					toastr.success('Contacts import successful, ' + data.number + ' contacts imported.');
					$rootScope.$broadcast('REFRESH');
				};
				var error = function (httpResponse) {
					$modal.hide('contacts-import');
					toastr.error('Error during contacts import');
				};
				// Import
				if (input.files[0].type === 'application/json' && $scope.importType === 'mist') {
					contactResource.importMist(e.target.result, success, error);
				} else if (input.files[0].type === 'text/csv' && $scope.importType === 'google') {
					contactResource.importGoogle(e.target.result, success, error);
				} else if (input.files[0].type === 'text/csv' && $scope.importType === 'outlook') {
					contactResource.importOutlook(e.target.result, success, error);
				} else {
					toastr.error('Wrong file type');
				}
			};
			// Read the file
			reader.readAsText(input.files[0]);
		}
	};

	$scope.export = function () {
		contactResource.exportJSON(
			function (data) {
				$modal.hide('contacts-import');
				$download.download('contacts.json', 'data:application/json;base64,' + btoa(JSON.stringify(data)));
			}, function (httpResponse) {
				$modal.hide('contacts-import');
				toastr.error('Error during contacts export');
			}
		);
	};

	$scope.close = function () {
		// Hide modal
		$modal.hide('contacts-import');
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