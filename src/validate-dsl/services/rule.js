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
