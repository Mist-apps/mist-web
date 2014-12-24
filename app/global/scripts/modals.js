/**
 * Confirmation controller
 */
var ConfirmController = function () {

	$('#modal-button-logout').click(function () {
		// Hide modal
		ModalService.hide('global-confirm');
		// Logout
		AuthService.logout();
		// Initialize sync service
		SyncService.init();
		// Go to login page
		location.replace('/login');
	});

	$('#modal-button-cancel').click(function () {
		// Hide modal
		ModalService.hide('global-confirm');
	});

};


/**
 * Settings controller
 */
var SettingsController = function () {

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
		image.src = '../global/images/user.png';
		image.onload = function () {
			var canvas = document.getElementById('image-canvas');
			canvas.width = 85;
			canvas.height = 85;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(image, 0, 0, 85, 85);
			$('#image-preview > img').attr('src', canvas.toDataURL());
		}
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
	}

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
	$('#user-image-input').change(function () {
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
	});

	/**
	 * Remove the current image button
	 */
	$('#image-preview span').click(function () {
		_removeJcrop();
		_setDefault();
	});

	/**
	 * Watch the password inputs for errors
	 */
	var inputPassword = $('input:password[name=password]');
	var inputPassword2 = $('input:password[name=password2]');
	var checkPasswords = function () {
		if (inputPassword.val() !== '' && inputPassword.val().length < 6) {
			inputPassword.addClass('form-input-error');
		} else {
			inputPassword.removeClass('form-input-error');
		}
		if (inputPassword.val() !== inputPassword2.val()) {
			inputPassword2.addClass('form-input-error');
		} else {
			inputPassword2.removeClass('form-input-error');
		}
	}
	inputPassword.on('input', checkPasswords);
	inputPassword2.on('input', checkPasswords);

	/**
	 * Save the settings and remove the settings modal
	 * If the settings form is not consistent, does nothing
	 * Show a notification if saved or if an error occurs
	 */
	$('#modal-button-save').click(function () {
		// If default image
		if (isDefault) {
			user.image = null;
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
			user.image = canvas.toDataURL();
		}
		// Get data
		user.firstName = $('input:text[name=firstName]').val();
		user.lastName = $('input:text[name=lastName]').val();
		user.mail = $('input[name=mail]').val();
		user.password = $('input:password[name=password]').val();
		user.password2 = $('input:password[name=password2]').val();
		// Check password
		if (user.password !== user.password2 || (user.password !== '' && user.password < 6)) {
			return;
		}
		// Remove login, password2, and password if empty
		delete(user.login);
		delete(user.password2);
		if (!user.password) {
			delete(user.password);
		}
		// Update the user
		UserResource.update(user,
			function (data) {
				Session.update(data);
				populateUser();
				toastr.success('Settings saved');
			}, function () {
				toastr.error('Unable to save settings');
			}
		);
		// Hide modal
		ModalService.hide('global-settings');
	});

	/**
	 * Cancel the settings modifications: hide modal
	 */
	$('#modal-button-cancel').click(function () {
		// Hide modal
		ModalService.hide('global-settings');
	});

	/**
	 * Execution
	 */

	// Clone the user
	var user = $.extend(true, {}, Session.getUser());
	user.password = user.password2 = '';

	// Populate the modal
	$('input:text[name=firstName]').val(user.firstName);
	$('input:text[name=lastName]').val(user.lastName);
	$('input[name=mail]').val(user.mail);

	// Initialize image
	if (user.image) {
		$('#image-preview > img').attr('src', user.image);
	} else {
		_setDefault();
	}

};


/**
 * Login Controller
 */
var LoginController = function () {

	/**
	 * Try to login by calling the AuthService with the credentials
	 */
	$('form').on('submit', function () {
		// Get credentials
		var credentials = {
			login:		$('input:text[name=login]').val(),
			password:	$('input:password[name=password]').val(),
			remember:	$('input:checkbox[name=remember]').is(":checked")
		};
		// Try to log in
		AuthService.login(credentials).then(
			// If login success
			function () {
				// Remove modal
				ModalService.hide('global-login');
			},
			// If login error
			function (reason) {
				if (reason.code === 1) {
					$('.login-form-input').addClass('shake login-form-input-error');
				} else {
					$('.login-form-input').removeClass('login-form-input-error');
				}
				$('#login-error').html(reason.message).show();
			}
		);
		// Do not redirect to "action" page
		return false;
	});

	/**
	 * Auto remove shake class
	 */
	$('body').on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', '.shake', function () {
		$(this).removeClass('shake');
	});

	/**
	 * Execution
	 */

	// Auto-focus the login field
	$('input[name="login"]').focus();

};