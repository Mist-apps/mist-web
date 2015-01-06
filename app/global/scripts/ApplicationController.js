/* exported ApplicationController */
/* global AuthService, ModalService, SyncService, Application, Session, LoaderService */
'use strict';


var ApplicationController = (function () {

	/**
	 * Bind all the functions on the buttons and other DOM elements
	 */
	var bind = function () {
		// Auto shown/hide the dropdowns on click on the related buttons
		$(document).on('click', '.dropdown-button', function () {
			// Get the dropdown
			var dropdown = $(this).next();
			// Check if the dropdown is not already shown
			if (!dropdown.is(':visible')) {
				// Show the dropdown
				dropdown.show(200);
				// Remove on next click
				$(document).one('click', function () {
					dropdown.hide(200);
				});
			}
		});
		// Hide all menus
		var _hideMenus = function () {
			$('.menu').removeClass('menu-show');
			$('#nav-search').css('display', '');	// Remove manually display to recover the class value
			$('#add-menu div').hide();
			$('#add-menu div:first-child').show();
			$('#add-menu div:first-child div').show();
		};
		// Show and hide left menu dynamically
		$('#nav-menu').click(function (event) {
			if (!$('.menu').hasClass('menu-show')) {
				_hideMenus();
				$('.menu').addClass('menu-show');
				$(document).one('click', _hideMenus);
				event.stopPropagation();
			} else {
				_hideMenus();
			}
		});
		// Show and hide the add menu dynamically
		$('#add-menu-button').click(function (event) {
			if ($('#add-menu div:first-child').is(':visible')) {
				_hideMenus();
				$('#add-menu div').show();
				$('#add-menu div:first-child').hide();
				$(document).one('click', _hideMenus);
				event.stopPropagation();
			}
		});
		// Show and hide the search menu dynamically (small screens)
		$('#search-menu').click(function (event) {
			if ($('#nav-search').is(':hidden')) {
				_hideMenus();
				$('#nav-search').show();
				$(document).one('click', function (event) {
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
		// Show the settings modal
		$('#user-menu-settings').click(function () {
			ModalService.show('global-settings', Session.getUser());
		});
		// Log the user out and redirect it to the login page
		$('#user-menu-logout').click(function () {
			// If status is not synced, show the confirm dialog
			if (SyncService.getSyncStatus() !== 'synced') {
				ModalService.show('global-confirm');
			}
			// If no confirmation needed, logout and go to the login page
			else {
				AuthService.logout();
				location.replace('/login');
			}
		});
		// Stop/start syncing when clicking on the "sync status" message.
		$('#menu-sync').children().click(function () {
			if (SyncService.getSyncStatus() === 'stopped') {
				SyncService.start();
			} else {
				SyncService.stop();
			}
		});
		// Change the active menu item (left menu) on click.
		$('.menu-item').click(function () {
			// Set active menu item
			Application.activeMenuItem = $(this).data('item');
			$('.menu-item').removeClass('menu-item-active');
			$('#menu-item-' + Application.activeMenuItem).addClass('menu-item-active');
			// Set menu title
			var title = $('#menu-item-' + Application.activeMenuItem).text();
			$('#nav-menu-title').html(title);
		});
		// Listen to the search field
		$('#nav-search-content input').on('change input', function () {
			Application.search = $(this).val();
			if (Application.search === '') {
				$('#nav-search-stop').hide();
			} else {
				$('#nav-search-stop').show();
			}
		});
		$('#nav-search-stop').click(function () {
			Application.search = '';
			$('#nav-search-content input').val('');
			$('#nav-search-stop').hide();
		});
	};

	/**
	 * Populate the user fields
	 */
	var populateUser = function () {
		var user = Session.getUser();
		if (user.image) {
			$('#user-menu img').attr('src', user.image);
		} else {
			$('#user-menu img').attr('src', '../global/images/user.png');
		}
		$('#user-menu-name').html(user.firstName + ' ' + user.lastName);
		$('#user-menu-mail').html(user.mail);
	};

	var recoverSession = function () {
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
			// Start sync service
			SyncService.start();
			// Recovered
			LoaderService.stop('recoverSession');
			_deferred.resolve();
		}, function (reason) {	// TODO Handle reason when unable to recover (no token, or unable to get user)
			// If asking for an authenticated page
			if (location.pathname !== '/login/') {
				location.replace('/login');
			}
			// Failed
			LoaderService.stop('recoverSession');
			_deferred.reject();
		});
		// Populate user data
		recovered.done(populateUser);
		// Return the promise
		return recovered;
	};

	return {
		bind:				bind,
		populateUser:		populateUser,
		recoverSession: 	recoverSession
	};

})();