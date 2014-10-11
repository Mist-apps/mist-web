
var Masonry = function (container) {

	var container = container;
	var pageWidth;
	var itemWidth = 250;
	var gap = 20;
	var columnNumber;
	var offsetTop = 80;
	var offsetLeft = 35;

	var timeout;

	var init = function () {
		pageWidth = $(container).width();
		columnNumber = Math.floor((pageWidth + gap) / (itemWidth + gap));
		if (columnNumber < 1) {
			columnNumber = 1;
		}
	};

	this.draw = function () {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(_draw, 100);
	}

	var _draw = function () {
		var columns = [];
		for (var i = 0; i < columnNumber; i++) {
			columns[i] = 0;
		}
		// Set each item position
		var items = container.children;
		for (var i = 0; i < items.length; i++) {
			var col = _getSmallestCol(columns);
			items[i].style.top = columns[col] + 'px';
			items[i].style.left = ((itemWidth + gap) * col) + 'px';
			$(items[i]).addClass('note-visible');
			columns[col] += gap + $(items[i]).height();
		}
	};

	var _getSmallestCol = function (columns) {
		var smallestCol = 0;
		var minColSize = 9999999;
		for (var key in columns) {
			if (columns[key] < minColSize) {
				minColSize = columns[key];
				smallestCol = key;
			}
		}
		return smallestCol;
	};

	// Check window resizing
	var _onWindowResizeDraw = this.draw;
	window.onresize = function () {
		init();
		_onWindowResizeDraw();
	}

	// Initialize the grid
	init();




	/**
	 * Drag and drop
	 */

	var dragging = false;
	var interval;
	var mouse;
	var afterItem = undefined;
	var SENSITIVITY = 100;
	var senseTimeout;

	this.dragStart = function ($event) {
		// Wait sensitivity before start dragging
		senseTimeout = setTimeout(function () {
			// Get note
			var note = $($event.target).parent();
			// Set note in front and disable transitions
			note.addClass('note-edit note-dragging');
			// Save relative position of the note from the mouse
			var relX = $event.pageX - note.offset().left;
			var relY = $event.pageY - note.offset().top;
			// Listen to mouse move
			$(document).bind('mousemove', function (event) {
				dragging = true;
				var diffX = event.pageX - relX - offsetLeft;
				var diffY = event.pageY - relY - offsetTop;
				note.css('left', diffX + 'px').css('top', diffY + 'px');
				mouse = {x: event.pageX, y: event.pageY};
				// Start moving other items
				if (!interval) {
					interval = setInterval(function () {
						_move(note);
					}, 50);
				}
			});
		}, SENSITIVITY);
	};

	this.dragEnd = function ($event, callback) {
		// Clear the timeout if needed
		clearTimeout(senseTimeout);
		// Stop listening to mouse move
		$(document).unbind('mousemove');
		// Get note
		var note = $($event.target).parent();
		// Remove note from front
		note.removeClass('note-edit note-dragging');
		// If we were dragging
		if (dragging) {
			// Save afterItem
			var previous = afterItem;
			// We are no more dragging
			dragging = false;
			// Clear some variables
			afterItem = undefined;
			// Stop moving other items
			clearInterval(interval);
			interval = null;
			// Cancel click event if dragged
			$($event.target).one('click', false);
			// Callback
			if (callback) {
				var noteOrder = parseInt($(note).find('input[name="order"]').val());
				var previousOrder = parseInt($(previous).find('input[name="order"]').val());
				if (isNaN(previousOrder)) {
					previousOrder = 0;
				}
				callback(noteOrder, previousOrder);
			}
		}
	};

	var _move = function (note) {
		var columns = [];
		for (var i = 0; i < columnNumber; i++) {
			columns[i] = 0;
		}
		// Set each item position
		var items = container.children;
		var lastDrawn = undefined;
		var skipped = false;
		for (var i = 0; i < items.length; i++) {
			// Skip the dragging item
			if (note.get(0) === items[i]) {
				continue;
			}
			// Get col to draw into
			var col = _getSmallestCol(columns);
			// Get variables
			var mouseX = mouse.x - offsetLeft;
			var mouseY = mouse.y - offsetTop;
			var itemX = ((itemWidth + gap) * col);
			var itemY = columns[col];
			var noteItemHeight = note.height();
			// If the mouse is in a place where a note can be drawn, skip the place
			if (mouseX >= itemX && mouseX <= itemX + itemWidth && mouseY >= itemY && mouseY <= itemY + noteItemHeight) {
				// Add the note in the column (without drawing it, so it is skipped)
				columns[col] += gap + noteItemHeight;
				// Redraw the current element we have not drawn
				i--;
				// The dragged note is just after the last drawn item
				afterItem = lastDrawn ? lastDrawn : null;
				// No note drawn this time
				lastDrawn = undefined;
				// A note place has been skipped
				skipped = true;
			}
			// If
			else if (afterItem !== undefined && afterItem === lastDrawn) {
				// Add the note in the column (without drawing it, so it is skipped)
				columns[col] += gap + noteItemHeight;
				// Redraw the current element we have not drawn
				i--;
				// No note drawn this time
				lastDrawn = undefined;
				// A note place has been skipped
				skipped = true;
			}
			// Draw item
			else {
				// Set position and css
				items[i].style.top = itemY + 'px';
				items[i].style.left = itemX + 'px';
				$(items[i]).addClass('note-visible');
				// Add the note height in the column
				columns[col] += gap + $(items[i]).height();
				// Keep the last item drawn
				lastDrawn = items[i];
			}
		}
		// If no place for note were skipped, then the note must be set at the end of the grid
		if (!skipped) {
			afterItem = lastDrawn;
		}
	}

};