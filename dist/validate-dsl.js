(function (angular) {

  // Create all modules and define dependencies to make sure they exist
  // and are loaded in the correct order to satisfy dependency injection
  // before all nested files are concatenated by Gulp

  // Config
  angular.module('validateDsl.config', [])
      .value('validateDsl.config', {
          debug: true
      });

  // Modules
  angular.module('validateDsl.services', []);
  angular.module('validateDsl',
      [
          'validateDsl.config',
          'validateDsl.services'
      ]);

})(angular);

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.
 * @description
 * # 
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('_', function () {
	return _;
});

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.esprima
 * @description
 * # esprima
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('esprima', function() {
	console.log("esprima-->", esprima);
	return esprima;
});

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.moment
 * @description
 * # moment
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('moment', function() {
	return moment;
});

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.RewireScope
 * @description
 * # RewireScope
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('RewireScope', function() {

	var RewireScope = {};

	RewireScope.getSimpleWrapper = function(callback) {
		return "(function() { return "+callback.toString()+"})()";
	}


	return RewireScope;
});

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.Rule
 * @description
 * # Rule
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('Rule', function(_) {
	function Rule(check, errorMessage) {
		var debug = false;

		var checkFn;
		if(typeof check !== 'function') {
			checkFn = function() {
				return check;
			}
		} else {
			checkFn = check;
		}

		function RuleClass(thenRule, otherwiseRule, errorMessage, errorHandler) {
			this.thenRule = thenRule;
			this.otherwiseRule = otherwiseRule;
			this.errorMessage = errorMessage;
			this.errorHandler = errorHandler;
		}

		RuleClass.prototype.then = function(rule) {
			return new RuleClass(rule, this.otherwiseRule, this.errorMessage, this.errorHandler);
		};

		RuleClass.prototype.otherwise = function(rule) {
			// console.log("otherwise", rule, errorMessage);
			return new RuleClass(this.thenRule, rule, this.errorMessage, this.errorHandler);
		};

		RuleClass.prototype.onError = function(errorHandler) {
			return new RuleClass(this.thenRule, this.otherwiseRule, this.errorMessage, errorHandler);
		};

		RuleClass.prototype.withErrorMessage = function(errorMessage) {
			this.errorMessage = errorMessage;
			return this;
		}

		RuleClass.prototype.evaluate = function(value) {
			var r = checkFn(value);

			// debug && console.log("[Rule] checkFn("+value+") --> "+r, "["+checkFn+"]", check);
			debug && console.log("[Rule] checkFn("+value+") --> "+r);

			var nextRule;

			if(r) {
				if(this.thenRule) {
					nextRule = this.thenRule;
				}
			} else {
				if(this.otherwiseRule) {
					nextRule = this.otherwiseRule;
				}
			}

			if(nextRule) {
				r = nextRule.evaluate(value);

				if(! r) {
					if(! this.errorMessage) {
						this.errorMessage = nextRule.errorMessage;
					} else {
						this.errorMessage += ", "+nextRule.errorMessage;
					}
				}
			}

			if(! r && typeof this.errorHandler === 'function') {
				this.errorHandler(this.errorMessage);
			}

			return r;
		};

		return new RuleClass().withErrorMessage(errorMessage);
	}

	return Rule;
});

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.Rules
 * @description
 * # Rules
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('Rules', function(moment, _, Rule) {

	var Rules = {};

	function pipe(expr, callback) {
		return callback(expr);
	}

	Rules.isUndefined = Rule(_.isUndefined);
	Rules.isNullOrUndefined = Rule(fOr(_.isUndefined, _.isNull));
	Rules.isString = Rule(_.isString);
	Rules.not = Rule(function(x) { return !x; });
	Rules.True = Rule(true);
	Rules.False = function(errorMessage) {
		return Rule(false, errorMessage);
	}
	Rules.isSimpleDate = Rule(function(x) {
		pipe(x.split("-"), function(xs){
			return _.all([
				xs.length === 3,
				xs[0].match(/^[0-9]{4}$/),
				isNumber(xs[1]),
					xs[1].length == 2,
					pipe(parseInt(xs[1], 10), function(month) { return month <= 12 && month >= 1 }),
					(xs[1][0] === "0" || xs[1][0] === "1"),
				isNumber(xs[2]),
					xs[2].length == 2,
					pipe(parseInt(xs[2], 10), function(day) { return day <= 31 && day >= 1; }),
					(["0", "1", "2", "3"].indexOf(xs[2][0]) !== -1)
			]);
		});
	});
	function isNumber(x) { return x.match(/^[0-9]*\.?[0-9]*$/, x); }
	Rules.isNumber = Rule(isNumber);
	Rules.isDate = Rule(function(x) {
		return _.isDate(x) && !_.isNaN(x.getTime());
	});
	Rules.getNullRule = function(test, innerRule) {
		return Rule(test)
			.then(
				Rules.isNullOrUndefined
					.then(Rules.True)
					.otherwise(innerRule)
			).otherwise(
				Rules.isNullOrUndefined
					.then(Rules.False("$0 is null"))
					.otherwise(innerRule)
			);
	};

	function fAnd(f1, f2) {
		return function() {
			var args = Array.prototype.slice.call(arguments);
			return f1.apply(undefined, args) && f2.apply(undefined, args);
		}
	}

	function fOr(f1, f2) {
		return function() {
			var args = Array.prototype.slice.call(arguments);
			return f1.apply(undefined, args) || f2.apply(undefined, args);
		}
	}

	return Rules;
});

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
			// contextCallback = RewireScope.toCurrentScope(contextCallback)();
			contextCallback = eval(RewireScope.getSimpleWrapper(contextCallback));

			// return eval("("+contextCallback.toString()+")()");
			return contextCallback();
		}
	}

});
