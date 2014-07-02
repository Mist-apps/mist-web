'use strict';


/**
 * Resize directive to resize automatically textarea's during writing.
 */
webApp.directive('resize', function ($timeout, $rootScope) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			var resize = function () {
				// Resize the element
				element[0].style.height = 'auto';
				element[0].style.height = element[0].scrollHeight + 'px';
				// Refresh grid layout
				$rootScope.masonry.draw();
			};
			element.on('change cut paste drop keyup keydown', resize);
			$timeout(resize);
		}
	};
});

/**
 * Manage grid
 */
webApp.directive('grid', function ($rootScope) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			// Create masonry object
			$rootScope.masonry = new Masonry(element[0]);
		}
	};
});

/**
 * Grid elements
 */
webApp.directive('gridItem', function ($rootScope) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			// Refresh layout when item destroyed
			scope.$on('$destroy', function () {
				$rootScope.masonry.draw();
			});
			// Refresh the grid when item added
			$rootScope.masonry.draw();
		}
	};
});