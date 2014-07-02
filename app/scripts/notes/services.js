'use strict';


/**
 * Nots web service to handle the web behaviour of the notes
 * This service show methods that can be re-used in other controllers
 */
webApp.service('NotesWebService', function ($timeout, syncService) {

	/**
	 * Check and uncheck a task in a todo list
	 */
	var toggleTaskDone = function (note, task) {
		// Toggle
		task.done = !task.done;
		// Set modification date
		note.modificationDate = new Date().getTime();
		// Inform sync service
		syncService.updateResource('NOTE', note);
	};

	/**
	 * Listen to key events on the note titles
	 */
	var titleKeyListener = function ($event, note) {
		// "ENTER" key
		if ($event.keyCode === 13) {
			var next = $($event.target).next();
			// Go to content
			if (next.hasClass('note-content')) {
				next.focus();
			}
			// Go to task
			else if (next.hasClass('note-tasks')) {
				next.find('.note-task-content').focus();
			}
			// Stop key default behaviour
			$event.preventDefault();
		}
		// Inform sync service and set modification time if necessary
		if (!_keyMustBeIgnored($event.keyCode)) {
			note.modificationDate = new Date().getTime();
			syncService.updateResource('NOTE', note);
		}
	};

	/**
	 * Listen to key events on the note contents
	 */
	var contentKeyListener = function ($event, note) {
		// Inform sync service and set modification time if necessary
		if (!_keyMustBeIgnored($event.keyCode)) {
			note.modificationDate = new Date().getTime();
			syncService.updateResource('NOTE', note);
		}
	};

	/**
	 * Listen for key events on the task contents
	 */
	var taskKeyListener = function ($event, note, index) {
		var target = $($event.target);
		var tasks = note.tasks;

		// "ENTER" key
		if ($event.keyCode === 13) {
			// Get two parts of the task
			var start = target.val().substring(0, target.prop('selectionStart'));
			var end = target.val().substring(target.prop('selectionEnd'));
			// Update model
			tasks[index].content = start;
			tasks.splice(index + 1, 0, {done: false, content: end});
			// Stop key default behaviour
			$event.preventDefault();
			// Wait rendering to go to the created task
			$timeout(function () {
				target.change();
				target.parent().next().find('.note-task-content').focusStart();
			});
		}
		// "DOWN" key
		else if ($event.which === 40) {
			if (target.isCursorOnEndOfTask() && target.parent().next().length) {
				// Focus out of the digest, because focus has a callback
				$timeout(function () {
					target.parent().next().find('.note-task-content').focusStart();
				});
				$event.preventDefault();
			}
		}
		// "UP" key
		else if ($event.which === 38) {
			if (target.isCursorOnStartOfTask() && target.parent().prev().length) {
				// Focus out of the digest, because focus has a callback
				$timeout(function () {
					target.parent().prev().find('.note-task-content').focusEnd();
				});
				$event.preventDefault();
			}
		}
		// "BACKSPACE" key
		else if ($event.which === 8) {
			// If there is a previous task, and the cursor is on the start of the task
			if (target.isCursorOnStartOfTask() && target.parent().prev().length) {
				// Move caret position after rendering
				var pos = tasks[index - 1].content.length;
				var elem = target.parent().prev().find('.note-task-content');
				$timeout(function() {
					elem.focusPosition(pos);
				});
				// Merge the two tasks
				tasks[index - 1].content += tasks[index].content;
				tasks.splice(index, 1);
				// Stop key default behaviour
				$event.preventDefault();
			}
		}
		// "DELETE" key
		else if ($event.which === 46) {
			// If there is a next task, and the cursor is on the end of the task
			if (target.isCursorOnEndOfTask() && target.parent().next().length) {
				// Move caret position after rendering
				var pos = tasks[index].content.length;
				$timeout(function() {
					target.focusPosition(pos);
				});
				// Merge the two tasks
				tasks[index].content += tasks[index + 1].content;
				tasks.splice(index + 1, 1);
				// Stop key default behaviour
				$event.preventDefault();
			}
		}
		// Inform sync service and set modification time if necessary
		if (!_keyMustBeIgnored($event.keyCode)) {
			note.modificationDate = new Date().getTime();
			syncService.updateResource('NOTE', note);
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

	/**
	 * Start editing task
	 */
	var startEditTask = function ($event) {
		$($event.target).parent().addClass('note-task-edit');
	};

	/**
	 * Stop editing task
	 */
	var stopEditTask = function ($event) {
		$($event.target).parent().removeClass('note-task-edit');
	};

	// Return methods
	return {
		toggleTaskDone:		toggleTaskDone,
		titleKeyListener:	titleKeyListener,
		contentKeyListener:	contentKeyListener,
		taskKeyListener: 	taskKeyListener,
		startEditTask:		startEditTask,
		stopEditTask:		stopEditTask
	};

});