/* exported ImportModalController */
/* global ModalService, contactsController, NoteResource, DownloadService */
'use strict';


/**
 * ImportModalController to manage import and export of
 * contacts to JSON/CSV files.
 */
var ImportModalController = function () {

	// Import button binding
	$('#modal-button-import').click(function () {
		var input = $('#modal-contacts-import .import-file').get(0);
		if (input.files && input.files[0]) {
			// Prepare reader
			var reader = new FileReader();
			// Import when file read
			reader.onload = function (e) {
				// Callbacks
				var success = function (data) {
					ModalService.hide('import');
					toastr.success('Contacts import successful, ' + data.number + ' contacts imported.');
					ContactsController.load();
				};
				var error = function () {
					ModalService.hide('import');
					toastr.error('Error during contacts import');
				};
				// Import
				var importType = $('#modal-contacts-import input[name=import-type]:checked').val();
				if (input.files[0].type === 'application/json' && importType === 'mist') {
					ContactResource.importMist(e.target.result, success, error);
				} else if (input.files[0].type === 'text/csv' && importType === 'google') {
					ContactResource.importGoogle(e.target.result, success, error);
				} else if (input.files[0].type === 'text/csv' && importType === 'outlook') {
					ContactResource.importOutlook(e.target.result, success, error);
				} else {
					toastr.error('Wrong file type');
				}
			};
			// Read the file
			reader.readAsText(input.files[0]);
		}
	});

	// Export button binding
	$('#modal-button-export').click(function () {
		ContactResource.exportJSON(
			function (data) {
				ModalService.hide('import');
				DownloadService.download('contacts.json', 'data:application/json;base64,' + btoa(JSON.stringify(data)));
			}, function () {
				ModalService.hide('import');
				toastr.error('Error during contacts export');
			}
		);
	});

	// Close modal button
	$('#modal-button-close').click(function () {
		// Hide modal
		ModalService.hide('import');
	});

};