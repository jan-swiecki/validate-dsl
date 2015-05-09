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
