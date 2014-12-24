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