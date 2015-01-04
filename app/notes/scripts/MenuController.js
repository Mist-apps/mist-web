/* exported MenuController */
/* global Application, SyncService, NotesController, EditorController */
'use strict';


var MenuController = (function () {

	/**
	 * Bind all the actions on the DOM elements
	 */
	var bind = function () {
		// Delete a note
		$('#notes-container').on('click', '#note-menu-delete', function () {
			// Update note
			var note = $(this).closest('.note').data('resource');
			note.deleteDate = _.now();
			// Stop edit the note
			EditorController.stop();
			// Show or hide the note
			NotesController.refresh();
			// Inform sync service
			SyncService.updateResource('NOTE', note);
		});
		// Delete definitively a note
		$('#notes-container').on('click', '#note-menu-destroy', function () {
			// Get note
			var jqNote = $(this).closest('.note');
			var note = jqNote.data('resource');
			// Search for note to delete
			for (var key in Application.notes) {
				// If the note has an id, search if id match, else, search if tmpId match
				if ((note._id && Application.notes[key]._id === note._id) || (!note._id && Application.notes[key].tmpId === note.tmpId)) {
					Application.notes.splice(key, 1);
					break;
				}
			}
			// Pack the order numbers
			for (var key in Application.notes) {
				if (Application.notes[key].order > note.order) {
					// Change order number
					Application.notes[key].order--;
					// Inform sync service
					SyncService.updateResource('NOTE', Application.notes[key]);
				}
			}
			// Stop edit the note
			EditorController.stop();
			// Remove note
			jqNote.remove();
			NotesController.refresh();
			// Inform sync service
			SyncService.deleteResource('NOTE', note);
		});
		// Restore a deleted note
		$('#notes-container').on('click', '#note-menu-restore', function () {
			// Update note
			var note = $(this).closest('.note').data('resource');
			delete note.deleteDate;
			// Stop edit the note
			EditorController.stop();
			// Show or hide the note
			NotesController.refresh();
			// Inform sync service
			SyncService.updateResource('NOTE', note);
		});
		// Change color of note
		$('#notes-container').on('click', '.note-menu ul .fa', function () {
			var view = $(this).closest('.note');
			var note = view.data('resource');
			// Update button
			$(this).removeClass('fa-square').addClass('fa-check-square');
			$(this).siblings('.fa').removeClass('fa-check-square').addClass('fa-square');
			// Update note color
			view.removeClass('note-' + note.color);
			note.color = $(this).data('color');
			view.addClass('note-' + note.color);
			// Inform sync service
			SyncService.updateResource('NOTE', note);
		});
	};

	return {
		bind:	bind
	};

})();