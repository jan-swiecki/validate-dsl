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
	//      rewire(function() { test(); test2(); }, "Rules", {test: "whatever"})
	//      will return function: function() { Rules.test(); test2(); }
	RewireScope.rewire = function(callback, prefix, newScope) {
		// var code = "(function(){ return "+callback.toString()+"; })()";
		var code = RewireScope.wrapFn(callback.toString());
		var ctx = new esrefactor.Context(code);

		var keys = _.keys(newScope);

		var newCode = code;

		_.each(keys, function(key){
			var indices = RewireScope.getIndices(newCode, key);
			for(var k in indices) {
				if(indices.hasOwnProperty(k)) {
					var index = indices[k];
					var id = ctx.identify(index);
					if(id) {
						var name = _.result(id, "identifier.name");
						if(_.isNull(id.declaration) && name) {
							// newCode = ctx.rename(id, key+"."+name);
							newCode = ctx.rename(id, prefix+"."+name);
							ctx = new esrefactor.Context(newCode);
							break;
						}
					}
				}
			}
		});

		return eval(newCode);
	};

	RewireScope.getIndices = function(text, searchString, indices, start) {
		indices = indices || [];
		start = start || 0;
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
		}
	};

	RewireScope.wrapFn = function(fnString) {
		if(typeof fnString === 'function') {
			fnString = fnString.toString();
		}

		return "(function() { return "+fnString+"; })()";
	}

	function isFromOutsideScope(id) {
		return id ? !!id.declaration : false;
	}


	return RewireScope;
});
