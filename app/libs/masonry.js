
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
	var afterItem;

	this.dragStart = function ($event) {
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
	};

	this.dragEnd = function ($event, callback) {
		// Stop listening to mouse move
		$(document).unbind('mousemove');
		// Stop moving other items
		clearInterval(interval);
		interval = null;
		// Get note
		var note = $($event.target).parent();
		// Remove note from front
		note.removeClass('note-edit note-dragging');
		// Cancel click event if dragged
		if (dragging) {
			dragging = false;
			$($event.target).one('click', false);
			callback();
		}
	};

	var _move = function (note) {
		var columns = [];
		for (var i = 0; i < columnNumber; i++) {
			columns[i] = 0;
		}
		// Set each item position
		var items = container.children;
		var lastDrawn = null;
		for (var i = 0; i < items.length; i++) {
			if (afterItem) {
				console.log('after: ' + $(afterItem).find('input[name=id]').val());
			} else if (afterItem === null) {
				console.log('after: nothing');
			}
			// Skip the dropping item
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
			// Check if we are in a note place to skip the place
			if (mouseX >= itemX && mouseX <= itemX + itemWidth && mouseY >= itemY && mouseY <= itemY + noteItemHeight) {
				columns[col] += gap + noteItemHeight;
				i--;
				afterItem = lastDrawn;
				lastDrawn = null;
			}
			// Draw item
			else {
				items[i].style.top = itemY + 'px';
				items[i].style.left = itemX + 'px';
				$(items[i]).addClass('note-visible');
				columns[col] += gap + $(items[i]).height();
				lastDrawn = items[i];
			}
		}	
	}

};