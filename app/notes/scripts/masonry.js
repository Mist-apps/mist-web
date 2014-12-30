/**
 * Library to control the notes on a grid:
 * 		- Show them on a beatifull
 */
var Masonry = function (container) {

	var container = container;
	var pageWidth;
	var itemWidth = 250;
	var gap = 20;
	var columnNumber;
	var offsetTop = 80;
	var offsetLeft = 35;
	var drawDebounce = 100;
	var drawing;


	var init = function () {
		pageWidth = $(container).parent().width();
		columnNumber = Math.floor((pageWidth + gap) / (itemWidth + gap));
		if (columnNumber < 1) {
			columnNumber = 1;
		}
	};

	this.draw = _.debounce(function (toShow, toHide, moreToShow) {
		// If no arguments, create them
		if (!toShow && !toHide) {
			toShow = _getItemsToShow();
			toHide = [];
			moreToShow = $('#more').is(':visible');
		}
		// Initialize the columns height to 0
		var columns = [];
		for (var i = 0; i < columnNumber; i++) {
			columns[i] = 0;
		}
		// Set items to 0,0 position and hide them
		for (var i = 0; i < toHide.length; i++) {
			toHide[i].__view.css('top', '');
			toHide[i].__view.css('left', '');
			toHide[i].__view.removeClass('note-visible');
		}
		// Set items position and show them
		for (var i = 0; i < toShow.length; i++) {
			var col = _getSmallestCol(columns);
			toShow[i].__view.css('top', columns[col]);
			toShow[i].__view.css('left', ((itemWidth + gap) * col));
			toShow[i].__view.addClass('note-visible');
			// Remove the menu height if necessary
			if (toShow[i].__view.find('.note-menu').is(':visible')) {
				columns[col] += gap + toShow[i].__view.height() - toShow[i].__view.find('.note-menu').height();
			} else {
				columns[col] += gap + toShow[i].__view.height();
			}
		}
		// Prepare height
		var height = columns[_getHighestCol(columns)];
		height = height > gap ? height - gap : height;
		// Set container size
		container.style.height = height + 'px';
		container.style.width = (columnNumber * (itemWidth + gap) - gap) + 'px';
		// If there are more notes to show
		if (moreToShow) {
			$('#more').show();
		} else {
			$('#more').hide();
		}
	}, drawDebounce);

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

	var _getHighestCol = function (columns) {
		var highestCol = 0;
		var maxColSize = 0;
		for (var key in columns) {
			if (columns[key] > maxColSize) {
				maxColSize = columns[key];
				highestCol = key;
			}
		}
		return highestCol;
	};

	var _getItemsToShow = function () {
		var toShow = [];
		_.each(container.children, function (item) {
			if ($(item).hasClass('note-visible')) {
				toShow.push($(item).data('resource'));
			}
		})
		return toShow;
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

	this.dragStart = function (event) {
		// Wait sensitivity before start dragging
		senseTimeout = setTimeout(function () {
			// Get note
			var note = $(event.target).parent();
			// Set note in front and disable transitions
			note.addClass('note-edit note-dragging');
			// Save offsets
			offsetTop = note.parent().offset().top;
			offsetLeft = note.parent().offset().left;
			// Save relative position of the note from the mouse
			var relX = event.pageX - note.offset().left;
			var relY = event.pageY - note.offset().top;
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

	this.dragEnd = function (event) {
		// Clear the timeout if needed
		clearTimeout(senseTimeout);
		// Stop listening to mouse move
		$(document).unbind('mousemove');
		// Get note
		var note = $(event.target).parent();
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
			$(event.target).one('click', false);
			// Set note order
			var noteOrder = parseInt($(note).find('input[name="order"]').val());
			var previousOrder = parseInt($(previous).find('input[name="order"]').val());
			if (isNaN(previousOrder)) {
				previousOrder = 0;
			}
			callback(noteOrder, previousOrder);
			// Draw the grid
			this.draw();
		}
	};

	var _move = function (note) {
		var columns = [];
		for (var i = 0; i < columnNumber; i++) {
			columns[i] = 0;
		}
		// Set each item position
		var items = _getItemsToShow();
		var lastDrawn = undefined;
		var skipped = false;
		for (var i = 0; i < items.length; i++) {
			// Skip the dragging item
			if (note.data('resource') === items[i]) {
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
				items[i].__view.get(0).style.top = itemY + 'px';
				items[i].__view.get(0).style.left = itemX + 'px';
				items[i].__view.addClass('note-visible');
				// Add the note height in the column
				columns[col] += gap + items[i].__view.height();
				// Keep the last item drawn
				lastDrawn = items[i].__view;
			}
		}
		// If no place for note were skipped, then the note must be set at the end of the grid
		if (!skipped) {
			afterItem = lastDrawn;
		}
	}

};