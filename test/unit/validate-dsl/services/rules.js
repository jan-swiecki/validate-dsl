'use strict';

describe('Service: Rules', function () {

  // load the service's module
  beforeEach(module('validateDsl'));

  // instantiate service
  var Rules;
  beforeEach(inject(function (_Rules_) {
    Rules = _Rules_;
  }));

  it('should do something', function () {
    (!!Rules).should.equal(true);
  });

  it('isUndefined', function () {
    Rules.isUndefined.evaluate(undefined).should.equal(true);
    Rules.isUndefined.evaluate(null).should.equal(false);
    Rules.isUndefined.evaluate("x").should.equal(false);
  });

  it('isNullOrUndefined', function () {
    Rules.isNullOrUndefined.evaluate(undefined).should.equal(true);
    Rules.isNullOrUndefined.evaluate(null).should.equal(true);
    Rules.isNullOrUndefined.evaluate("x").should.equal(false);
  });

});
