/* exported EditorController */
/* global SyncService, ModalService, NotesController */
'use strict';


/**
 * Manage the edit process of a note:
 *		- start the editor (dim screen, show menu...)
 *		- stop the edition
 *		- keyboard keys and shortcuts
 *		- tasks merge and split
 */
var EditorController = (function () {

	// Get note menu template
	var templateNoteMenu = _.template($('#template-note-menu').html());
	// Get note task template
	var templateNoteTask = _.template($('#template-note-task').html());
	// Notes containers
	var containers = $('#notes-container, #modal-container');

	/**
	 * Start editing a note
	 */
	var _start = function (event) {
		if (event.target.className !== '' && event.target.className !== 'note-task-icon') {
			// Add menu
			$(this).append(templateNoteMenu($(this).data('resource')));
			// Set tabindex
			$(this).find('.note-title, .note-content, .note-task-content, button').attr('tabindex', 1);
			// Show editor
			ModalService.dim();
			$(this).addClass('note-edit');
			// Remove drag and drop zone
			$(this).find('.drag-drop-zone').hide();
			// Remove the binding to start a new edit
			containers.off('click', _start);
			// Listen to escape key
			containers.on('keydown', _escapeKeyListener);
			// Listen to clicks on dim
			$('.dim').on('click', stop);
		}
	};

	/**
	 * Stop editing the notes
	 */
	var stop = function (event) {
		// Stop focusing the element
		if (event) {
			$(event.target).blur();
		}
		// Remove notes tabindex
		$('.note-title, .note-content, .note-task-content, button').attr('tabindex', -1);
		// Remove editor
		ModalService.clear();
		$('.note').removeClass('note-edit');
		$('.note-menu').remove();
		// Add drag and drop zone
		$('.drag-drop-zone').show();
		// Rebind the listener to start edit a note
		containers.on('click', '.note', _start);
		// Remove the binding to listen to escape key
		containers.off('keydown', _escapeKeyListener);
		// Remove the binding to listen to clicks on dim
		$('.dim').off('click', stop);
	};

	/**
	 * Bind all the actions on the DOM elements
	 */
	var bind = function () {
		// Check and uncheck a task in a todo list
		containers.on('click', '.note-task-icon', function () {
			// Toggle
			$(this).parent().toggleClass('note-task-done');
			// Inform sync service
			SyncService.updateResource('NOTE', $(this).closest('.note').data('resource'));
		});
		// Listen to key events on the note titles
		containers.on('keydown', '.note-title', function (event) {
			// "ENTER" key
			if (event.keyCode === 13) {
				var next = $(this).next();
				// Go to content
				if (next.hasClass('note-content')) {
					next.focus();
				}
				// Go to task
				else if (next.hasClass('note-tasks')) {
					next.find('.note-task-content').first().focus();
				}
				// Stop key default behaviour
				event.preventDefault();
			}
			// Inform sync service if necessary
			else if (!_keyMustBeIgnored(event.keyCode)) {
				SyncService.updateResource('NOTE', $(this).closest('.note').data('resource'));
			}
		});
		// Listen to key events on the note contents
		containers.on('keydown', '.note-content', function (event) {
			// Inform sync service if necessary
			if (!_keyMustBeIgnored(event.keyCode)) {
				SyncService.updateResource('NOTE', $(this).closest('.note').data('resource'));
			}
		});
		// Listen for key events on the task contents
		containers.on('keydown', '.note-task-content', function (event) {
			var target = $(this);
			var resource = target.closest('.note').data('resource');
			// "ENTER" key
			if (event.keyCode === 13) {
				// Get two parts of the task
				var start = target.val().substring(0, target.prop('selectionStart'));
				var end = target.val().substring(target.prop('selectionEnd'));
				// Update and add views
				target.val(start);
				var next = $(templateNoteTask(resource));
				target.parent().after(next);
				next.find('.note-task-content').val(end).focusStart();
				// Stop key default behaviour
				event.preventDefault();
			}
			// "DOWN" key
			else if (event.which === 40) {
				if (target.isCursorOnEndOfTask() && target.parent().next().length) {
					target.parent().next().find('.note-task-content').focusStart();
					event.preventDefault();
				}
			}
			// "UP" key
			else if (event.which === 38) {
				if (target.isCursorOnStartOfTask() && target.parent().prev().length) {
					target.parent().prev().find('.note-task-content').focusEnd();
					event.preventDefault();
				}
			}
			// "BACKSPACE" key
			else if (event.which === 8) {
				var prev = target.parent().prev();
				// If there is a previous task, and the cursor is on the start of the task
				if (target.isCursorOnStartOfTask() && prev.length) {
					var prevContent = prev.find('.note-task-content');
					var pos = prevContent.val().length;
					// Merge the two tasks
					prevContent.val(prevContent.val() + target.val());
					target.parent().remove();
					// Move caret position and resize the input
					prevContent.trigger('input');
					prevContent.focusPosition(pos);
					// Stop key default behaviour
					event.preventDefault();
				}
			}
			// "DELETE" key
			else if (event.which === 46) {
				var next = target.parent().next();
				// If there is a next task, and the cursor is on the end of the task
				if (target.isCursorOnEndOfTask() && next.length) {
					var pos = target.val().length;
					// Merge the two tasks
					target.val(target.val() + next.find('.note-task-content').val());
					next.remove();
					// Move caret position and resize the input
					target.trigger('input');
					target.focusPosition(pos);
					// Stop key default behaviour
					event.preventDefault();
				}
			}
			// Inform sync service if necessary
			if (!_keyMustBeIgnored(event.keyCode)) {
				SyncService.updateResource('NOTE', resource);
			}
		});
		// Resize automatically the notes
		containers.on('change input', 'textarea', function () {
			// Resize the element
			this.style.height = 'auto';
			this.style.height = this.scrollHeight + 'px';
			// Refresh grid layout
			NotesController.refresh();
		});
		// Start editing task
		containers.on('focus', '.note-task-content', function () {
			$(this).parent().addClass('note-task-edit');
		});
		// Stop editing task
		containers.on('blur', '.note-task-content', function () {
			$(this).parent().removeClass('note-task-edit');
		});
		// Listen to clicks on note to start edit it
		$('#notes-container').on('click', '.note', _start);
		$('#notes-container').on('click', '.note-menu button', stop);
	};

	/**
	 * Custom listeners
	 */
	var _escapeKeyListener = function (event) {
		if (event.which === 27) {
			stop(event);
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

	return {
		bind:	bind,
		stop:	stop
	};

})();