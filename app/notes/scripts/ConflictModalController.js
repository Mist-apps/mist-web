/* exported ConflictModalController */
/* global SyncService, ModalService, NotesController, EditorController */
'use strict';

/**
 * Conflict controller (modal)
 */
var ConflictModalController = function () {

	// Set textarea height
	$('#modal-container .note textarea').each(function () {
		this.style.height = this.scrollHeight + 'px';
	});

	// Get conflicted notes
	var local = ModalService.getParameters().local;
	var remote = ModalService.getParameters().remote;

	/**
	 * Resolve the conflict by selecting the local option
	 */
	$('.modal-button-local').click(function () {
		// Sync the view
		local.__sync(local, $('#local-note'));
		// Keep local version
		if (remote) {
			local._revision = remote._revision;
			SyncService.updateResource('NOTE', local);
		}
		// Insert new note
		else {
			delete(local._revision);
			delete(local._id);
			delete(local._user);
			local.tmpId = '' + _.now() + _.uniqueId();
			SyncService.newResource('NOTE', local);
		}
		// Restart syncing
		SyncService.start();
		// Hide modal
		ModalService.hide('conflict');
	});

	/**
	 * Resolve the conflict by selecting the remote option
	 */
	$('.modal-button-remote').click(function () {
		// Keep remote version, so copy remote in local
		if (remote) {
			local.__sync(remote, $('#remote-note'));
			for (var key in remote) {
				local[key] = remote[key];
			}
			var old = local.__view;
			NotesController.newNote(local);
			old.remove();
			NotesController.refresh();
			SyncService.updateResource('NOTE', local);
		}
		// Delete note locally (reload them all, to be sure the order is ok)
		else {
			// Stop edit the note
			EditorController.stop();
			// Reload notes
			NotesController.load();
		}
		// Restart syncing
		SyncService.start();
		// Hide modal
		ModalService.hide('conflict');
	});

};