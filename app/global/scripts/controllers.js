'use strict';


/**
 * Auto shown/hide the dropdowns on click on the related buttons
 */
$(document).on('click', '.dropdown-button', function () {
	// Get the dropdown
	var dropdown = $(this).next();
	// Check if the dropdown is not already shown
	if (!dropdown.is(':visible')) {
		// Show the dropdown
		dropdown.show();
		// Remove on next click
		$(document).one('click', function () {
			dropdown.hide();
		});
	}
});

/**
 * Hide all menus
 */
var _hideMenus = function () {
	$('.menu').removeClass('menu-show');
	$('#nav-search').css('display', '');	// Remove manually display to recover the class value
	$('#add-menu div').hide();
	$('#add-menu div:first-child').show();
	$('#add-menu div:first-child div').show();
	$('html').unbind('click');
};

/**
 * Show and hide left menu dynamically
 */
$('#nav-menu').click(function (event) {
	if (!$('.menu').hasClass('menu-show')) {
		_hideMenus();
		$('.menu').addClass('menu-show');
		$('html').click(function () {
			_hideMenus();
		});
		event.stopPropagation();
	} else {
		_hideMenus();
	}
});

/**
 * Show and hide the add menu dynamically
 */
$('#add-menu-button').click(function (event) {
	if ($('#add-menu div:first-child').is(':visible')) {
		_hideMenus();
		$('#add-menu div').show();
		$('#add-menu div:first-child').hide();
		$('html').click(function () {
			_hideMenus();
		});
		event.stopPropagation();
	}
});

/**
 * Show and hide the search menu dynamically (small screens)
 */
$('#search-menu').click(function (event) {
	if ($('#nav-search').is(':hidden')) {
		_hideMenus();
		$('#nav-search').show();
		$('html').click(function (event) {
			// Check if we clicked outside of the nav menu
			if ($(event.target).parents('#nav-search').length !== 1) {
				_hideMenus();
			}
		});
		event.stopPropagation();
	} else {
		_hideMenus();
	}
});

/**
 * Show the settings modal and send a broadcast to initialize the
 * settings controller.
 */
$('#user-menu-settings').click(function () {
	// Init the settings modal
	// TODO $scope.$broadcast('INIT_SETTINGS');
	// Show the user settings modal
	ModalService.show('global-settings');
});

/**
 * Log the user out and redirect it to the login page
 */
$('#user-menu-logout').click(function () {
	// If status is not synced, show the confirm dialog
	if (SyncService.getSyncStatus() !== 'synced') {
		ModalService.show('global-confirm');
	}
	// If no confirmation needed, logout and go to the login page
	else {
		AuthService.logout();
		SyncService.init();
		location.replace('/login');
	}
});


/**
 * ===========================================================================================================================================
 * Execution flow
 * ===========================================================================================================================================
 */

// Save recovering state
var _deferred = $.Deferred();
var recovered = _deferred.promise();
// Start recovering
LoaderService.start('recoverSession');
// Recover user session
AuthService.recover().then(function () {
	// If asking to go to login
	if (location.pathname === '/login/') {
		location.replace('/notes');
	}
	// Initialize sync service
	SyncService.init();
	// Recovered
	LoaderService.stop('recoverSession');
	_deferred.resolve();
}, function (reason) {
	// If asking for an authenticated page
	if (location.pathname !== '/login/') {
		location.replace('/login');
	}
	// Failed
	LoaderService.stop('recoverSession');
	_deferred.reject();
});