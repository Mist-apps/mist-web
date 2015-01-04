/* exported LoaderService */
'use strict';


/**
 * Loader service, shows a loading icon
 *
 * Methods:
 * 		- start(identifier) 		Starts the loading process for someone, the caller identifier must be given
 *		- stop(identifier) 			Stop the loading process for someone, the caller identifier must be given
 *		- isLoading([identifier]) 	Is the loading process active for someone ? If no caller identifier fiven, check every caller
 */
var LoaderService = (function () {

	// Loading services
	var loader = {};

	// Export methods
	return {
		start: function (name) {
			loader[name] = true;
			if (this.isLoading()) {
				$('#loader').show();
			}
		},
		stop: function (name) {
			delete(loader[name]);
			if (!this.isLoading()) {
				$('#loader').hide();
			}
		},
		isLoading: function (name) {
			if (!name) {
				return Object.keys(loader).length > 0;
			}
			return loader[name] === true;
		}
	};

})();