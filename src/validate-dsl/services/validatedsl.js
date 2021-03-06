'use strict';

/**
 * @ngdoc service
 * @name validateDsl.ValidateDSL
 * @description
 * # ValidateDSL
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('ValidateDSL', function($q, _, Rule, Rules, RewireScope) {

	return function(contextCallback, context) {
		if(typeof contextCallback === 'function') {
			context = context || {};

			// re-wire scope to current scope
			contextCallback = RewireScope.rewire(contextCallback, {
				Rules: Rules,
				Rule: Rule,
				context: context
			});

			return contextCallback();
		}
	}

});
