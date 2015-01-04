/* exported ImportModalController */
/* global ModalService, NotesController, NoteResource, DownloadService */
'use strict';


var ImportModalController = function () {

	$('#modal-button-import').click(function () {
		var input = $('#modal-notes-import .import-file').get(0);
		if (input.files && input.files[0]) {
			// Prepare reader
			var reader = new FileReader();
			// Import when file read
			reader.onload = function (e) {
				// Callbacks
				var success = function (data) {
					ModalService.hide('import');
					toastr.success('Notes import successful, ' + data.number + ' notes imported.');
					NotesController.load();
				};
				var error = function () {
					ModalService.hide('import');
					toastr.error('Error during notes import');
				};
				// Import
				if (input.files[0].type === 'application/json') {
					NoteResource.importJSON(e.target.result, success, error);
				} else {
					toastr.error('Wrong file type');
				}
			};
			// Read the file
			reader.readAsText(input.files[0]);
		}
	});

	$('#modal-button-export').click(function () {
		NoteResource.exportJSON(
			function (data) {
				ModalService.hide('import');
				DownloadService.download('notes.json', 'data:application/json;base64,' + btoa(JSON.stringify(data)));
			}, function () {
				ModalService.hide('import');
				toastr.error('Error during notes export');
			}
		);
	});

	$('#modal-button-close').click(function () {
		// Hide modal
		ModalService.hide('import');
	});

};