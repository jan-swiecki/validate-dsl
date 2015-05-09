'use strict';

describe('Service: ValidateDSL', function () {

  // load the service's module
  beforeEach(module('validateDsl'));

  // instantiate service
  var ValidateDSL;
  var textRuleNullable;
  var textRuleNotNullable;

  beforeEach(inject(function (_ValidateDSL_) {
    ValidateDSL = _ValidateDSL_;

    textRuleNullable = ValidateDSL(function(){
      return Rule(true)
        .then(
          Rules.isUndefined
            .then(Rules.True)
            .otherwise(Rules.isString.then(Rules.True).otherwise(Rules.False("$0 is not string")))
        ).otherwise(
          Rules.isUndefined
            .then(Rules.False("$0 is null"))
            .otherwise(Rules.isString.then(Rules.True).otherwise(Rules.False("$0 is not string")))
        );
    });

    textRuleNotNullable = ValidateDSL(function(){
      return Rule(false)
        .then(
          Rules.isUndefined
            .then(Rules.True)
            .otherwise(Rules.isString.then(Rules.True).otherwise(Rules.False("$0 is not string")))
        ).otherwise(
          Rules.isUndefined
            .then(Rules.False("$0 is null"))
            .otherwise(Rules.isString.then(Rules.True).otherwise(Rules.False("$0 is not string")))
        );
    });
  }));

  it('should do something', function () {
    (!!ValidateDSL).should.equal(true);
  });

  it('textRuleNullable to be valid', function () {
    (textRuleNullable.evaluate("text")).should.equal(true);
    (textRuleNullable.evaluate(undefined)).should.equal(true);
  });

  it('textRuleNullable to be valid 2', function () {
    (textRuleNullable.evaluate(123)).should.equal(false);
  });

  it('textRuleNotNullable to be valid', function () {
    (textRuleNotNullable.evaluate("text")).should.equal(true);
    (textRuleNotNullable.evaluate(123)).should.equal(false);
    (textRuleNotNullable.evaluate(undefined)).should.equal(false);
  });

  it('to display valid error message', function () {
    textRuleNotNullable.onError(function(message){
      (message).should.equal("$0 is not string");
    }).evaluate(123);
  });

});
