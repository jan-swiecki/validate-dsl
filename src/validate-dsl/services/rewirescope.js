'use strict';

/**
 * @ngdoc service
 * @name validateDsl.RewireScope
 * @description
 * # RewireScope
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('RewireScope', function(esrefactor, _) {

	var RewireScope = {};

	RewireScope.getSimpleWrapper = function(callback) {
		return "(function() { return "+callback.toString()+"})()";
	}

	// e.g.
	//      rewireScope(function() { test(); test2(); }, "Rules", {test: "whatever"})
	//      will return function: function() { Rules.test(); test2(); }
	RewireScope.rewireScope = function(callback, key, newScope) {
		var code = callback.toString();
		var ctx = new esrefactor.Context(code);

		var keys = _.keys(newScope);

		// _.each
		
		var id = ctx.identify(12);
	}

	RewireScope.getIndices = function(text, searchString, indices, start) {
		indices = indices || [];
		start = start || 0;
		console.log("getIndices", text, searchString);
		if(text.length === 0) {
			return indices;
		} else {
			var index = text.indexOf(searchString);
			if(index !== -1) {
				indices.push(start+index);
				return RewireScope.getIndices(text.substr(index+1), searchString, indices, start+index);
			} else {
				return RewireScope.getIndices("", searchString, indices, start);
			}
			// if(index !== -1) {
			// 	indices.push(index);
			// }
			// return RewireScope.getIndices(text.substr(index+1), searchString, indices);
		}

	}

	function isFromOutsideScope(id) {
		return id ? !!id.declaration : false;
	}


	return RewireScope;
});
