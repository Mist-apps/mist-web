/* exported ContactsController */
/* global Application, SyncService, LoaderService, ModalService */
'use strict';


/**
 * contacts controller
 */
var ContactsController = (function () {

	// Store the contacts
	Application.contacts = [];
	// Store the groups
	Application.groups = [];
	// Get menu item template
	var templateMenuItem = _.template($('#template-menu-item').html());
	// Get contacts template
	var templateContact = _.template($('#template-contact').html());

	/**
	 * Get contacts from API
	 */
	var load = function () {
		// Start load
		LoaderService.start('ContactsController.load');
		// Clean the previous contacts
		Application.contacts = [];
		$('#contacts-container').empty();
		// Ask for the contacts
		SyncService.getResources('CONTACT', function (err, data) {
			if (err) {
				toastr.error('Unable to get contacts (' + err.message + ')');
			} else {
				// Separate contacts and groups
				var partition = _.partition(data, function (item) { return !item.name; });
				Application.contacts = partition[0];
				Application.groups = partition[1];
				// Sort the contacts
				Application.contacts = _.sortBy(Application.contacts, function (item) {return '' + item.firstName + item.lastName;});
				// Show groups
				_showGroups();
				// Show contacts, after...
				var showContacts = _.after(Application.contacts.length, _showContacts);
				// Prepare the contacts in the container
				_.each(Application.contacts, function (contact, index) {
					_.delay(function (contact) {
						_prepareContact(contact);
						showContacts();
					}, index * 5, contact);
				});
			}
		});
	};

	/**
	 * Method for the SyncService, to sync the contact view with the resource
	 */
	var _syncContact = function (contact, view) {
		if (!view) {
			view = contact.__view;
		}
		/*contact.title = view.find('.contact-title').val();
		if (!contact.tasks) {
			contact.content = view.find('.contact-content').val();
		} else {
			contact.tasks = [];
			view.find('.contact-task').each(function () {
				contact.tasks.push({
					done: 		$(this).hasClass('contact-task-done'),
					content: 	$(this).find('.contact-task-content').val()
				});
			});
		}*/
	};

	/**
	 * Prepare one contact with it's DOM view and it's sync function.
	 */
	var _prepareContact = function (contact) {
		// Create DOM element, and bind it
		var item = $(templateContact(contact));
		contact.__view = item;
		contact.__sync = _syncContact;
		// Set data to bind the resource
		item.data('resource', contact);
		// Add DOM element to contacts container
		$('#contacts-container').append(contact.__view);
	};

	/**
	 * Show the groups in the menu
	 */
	var _showGroups = function () {
		$('#menu-groups').empty();
		Application.groups = _.sortBy(Application.groups, 'name');
		_.each(Application.groups, function (group) {
			$('#menu-groups').append($(templateMenuItem(group)));
		});
	};

	/**
	 * Show the contacts on the grid
	 */
	var _showContacts = function () {
		// Check if contact is in group
		var isInGroup = function (contact) {
			for (var key in Application.groups) {
				if (Application.activeMenuItem === Application.groups[key]._id) {
					return contact.groups.indexOf(Application.groups[key].name) > -1;
				}
			}
		};
		// Create the search function
		var search = function (item) {
			return !Application.search || (item.firstName && item.firstName.indexOf(Application.search) !== -1) || (item.lastName && item.lastName.indexOf(Application.search) !== -1);
		};
		// Filter the contacts
		var partitions = [];
		switch (Application.activeMenuItem) {
			case 'all':			partitions = _.partition(Application.contacts, function (item) {return !item.deleteDate && search(item);});
								break;
			case 'ungrouped':	partitions = _.partition(Application.contacts, function (item) {return (!item.groups || item.groups.length === 0) && search(item);});
								break;
			case 'starred':		partitions = _.partition(Application.contacts, function (item) {return item.groups && item.groups.indexOf('Starred') > -1 && search(item);});
								break;
			case 'trash':		partitions = _.partition(Application.contacts, function (item) {return !!item.deleteDate && search(item);});
								break;
			default:			partitions = _.partition(Application.contacts, function (item) {return item.groups && isInGroup(item) && search(item);}); // TODO not active menu item, but group name
								break;
		}
		// If there are contacts to shown
		if (partitions[0].length > 0) {
			// Remove the "No contacts" message
			$('#nothing-message').hide();
		} else {
			// Show the "No contacts" message
			$('#nothing-message').show();
		}
		// If there are more contacts to show than the maximum authorized, transfer them in the second array (to hide)
		var moreToShow = false;
		if (partitions[0].length > Application.maxToShow) {
			$('#more #nbr-total').html(partitions[0].length);
			partitions[1] = partitions[1].concat(partitions[0].slice(Application.maxToShow));
			partitions[0] = partitions[0].slice(0, Application.maxToShow);
			$('#more #nbr-shown').html(partitions[0].length);
			moreToShow = true;
		}
		// Stop loading
		LoaderService.stop('ContactsController.load');
		// Show and hide
		_.each(partitions[1], function (contact) { contact.__view.hide(); });
		_.each(partitions[0], function (contact) { contact.__view.show(); });
		// Show or hide the ellipsis button
		if (moreToShow) {
			$('#more').show();
		} else {
			$('#more').hide();
		}
	};

	/**
	 * Bind the actions on the DOM elements
	 */
	var bind = function () {
		// On clicking on the left menu, refresh the contacts
		$('.menu').on('click', '.menu-item', function () {
			Application.maxToShow = 15;
			_showContacts();
		});
		// On clicking on the "ellipsis" button, increase the max number of contacts to show
		$('#more span').click(function () {
			Application.maxToShow += 10;
			_showContacts();
		});
		// Infinite scroll
		$(window).scroll(function () {
			if ($(window).height() + $(window).scrollTop() === $(document).height()) {
				Application.maxToShow += 10;
				_showContacts();
			}
		});
/*		// Add a new empty contact
		$('#add-menu-contact').click(function () {
			// Add new contact
			var date = _.now();
			var tmpId = '' + date + _.uniqueId();
			var order = Application.contacts.length + 1;
			var contact = {tmpId: tmpId, title: '', content: '', creationDate: date, order: order};
			Application.contacts.push(contact);
			_prepareContact(contact);
			_showContacts();
			// Inform sync service
			SyncService.newResource('contact', contact);
		});
		// Add a new empty todo list
		$('#add-menu-group').click(function () {
			// Add new group
			var date = _.now();
			var tmpId = '' + date + _.uniqueId();
			var order = Application.contacts.length + 1;
			var contact = {tmpId: tmpId, title: '', tasks: [{content: '', done: false}], creationDate: date, order: order};
			Application.contacts.push(contact);
			_prepareContact(contact);
			_showContacts();
			// Inform sync service
			SyncService.newResource('contact', contact);
		});*/
		// Import/Export
		$('#add-menu-import').click(function () {
			ModalService.show('import');
		});
/*		// When a conflict is detected, stop edit the contact and show modal
		SyncService.on('conflict', function (contacts) {
			EditorController.stop();
			ModalService.show('conflict', contacts);
		});*/
		// Listen to the search field
		$('#nav-search-content input').on('change input', function () {
			_showContacts();
		});
	};

	/**
	 * Format an address in a one line way
	 */
	var formatInlineAddress = function (address) {
		// Clean an address to remove unused spaces and '-' characters
		var _clean = function (address) {
			return address.replace(/-\s+-/g, ' ').replace(/\s{2,}/g, ' ').trim().replace(/-$/, '').trim();
		};
		// Format
		if (address) {
			return _clean((address.street || '') + ' ' + (address.number || '') + ' - ' + (address.postalCode || '') + ' ' + (address.locality || '') + ' - ' + (address.country || ''));
		}
		return '';
	};

	/**
	 * Exports
	 */
	return {
		bind:					bind,
		load:					load,
		refresh:				_showContacts,
		formatInlineAddress: 	formatInlineAddress
	};

})();