
var Masonry = function (container) {

	var container = container;
	var pageWidth;
	var itemWidth = 250;
	var gap = 20;
	var columnNumber;

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
			items[i].className += ' note-visible';
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

};