'use strict';

describe('Service: Rule', function () {

  // load the service's module
  beforeEach(module('validateDsl'));

  // instantiate service
  var Rule;
  beforeEach(inject(function (_Rule_) {
    Rule = _Rule_;
  }));

  it('should do something', function () {
    (!!Rule).should.equal(true);
  });

});
