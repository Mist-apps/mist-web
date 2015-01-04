/* exported ModalService */
'use strict';


/**
 * Modal service
 * Show and hide modals, only one modal at the same time !
 * The modal name must be given, it must be in the modals folder,
 * or in the global/partials folder, but then, the name must start with 'global-'.
 * Dim and clear the screen, only if no modals are shown.
 * When a modal is shown, some parameters may be given.
 * They are accessible through the 'getParameters()' method.
 */
var ModalService = (function () {

	var modal = '';
	var parameters = {};

	// Get the parameters of the modal
	var getParameters = function () {
		return parameters;
	};

	// Get the modal url from the name, if starts with 'global-', look into the global partials folder
	var _getModalUrl = function (name) {
		if (name.indexOf('global-') === 0) {
			return '../global/partials/' + name.substring(7) + '.html';
		}
		return 'partials/' + name + '.html';
	};

	var _getModalController = function (name) {
		if (name.indexOf('global-') === 0) {
			name = name.substring(7);
		}
		return name.charAt(0).toUpperCase() + name.slice(1) + 'ModalController';
	};

	// Center the modal
	var _center = function () {
		// Get window height without 2 * 10px for dialog box margin
		var windowHeight = $(window).height() - 20;
		// Get content max height from window height minus the modal header and footer
		var contentMaxHeight = windowHeight - $('.modal-header').outerHeight(true) - $('.modal-footer').outerHeight(true);
		// Set content max-height
		$('.modal-content').css('max-height', (contentMaxHeight - 40) + 'px');
		// Get the modal effective height
		var modalHeight = $('.modal').height();
		// Set top window offset, add the 10px top margin
		$('#modal-container').css('top', ((windowHeight - modalHeight) / 3 + 10) + 'px');
	};

	// Open a modal
	var show = function (name, params) {
		if (!modal) {
			parameters = params ? params : {};
			dim();
			modal = name;
			$.get(_getModalUrl(modal)).done(function (html) {
				// Show modal (template with parameters)
				$('#modal-container').empty().append(_.template(html)(params));
				// Execute controller
				window[_getModalController(name)]();
				// Center the modal
				_center();
				$(window).on('resize', _center);
				$('.modal-content').on('resize', _center);
			}).fail(function () {
				toastr.error('Unable to open modal');
			});
		}
	};

	// Hide a modal
	var hide = function (name) {
		if (isShown(name)) {
			modal = '';
			clear();
			parameters = {};
			$('#modal-container').empty();
			// Stop center the modal
			$(window).off('resize', _center);
			$('.modal-content').off('resize', _center);
		}
	};

	// Return whether the modal is shown or not
	var isShown = function (name) {
		return modal === name;
	};

	// Dim the screen
	var dim = function () {
		if (!modal) {
			$('#nav-search-content input').attr('tabindex', -1);
			$('.dim').addClass('dim-active');
		}
	};

	// Clear the screen
	var clear = function () {
		if (!modal) {
			$('.dim').removeClass('dim-active');
			$('#nav-search-content input').attr('tabindex', 1);
		}
	};

	// Export methods
	return {
		getParameters:	getParameters,
		show:			show,
		hide:			hide,
		isShown:		isShown,
		dim:			dim,
		clear:			clear
	};

})();