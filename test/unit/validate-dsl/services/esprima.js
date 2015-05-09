'use strict';

describe('Service: esprima', function () {

  // load the service's module
  beforeEach(module('validateDsl'));

  // instantiate service
  var esprima;
  beforeEach(inject(function (_esprima_) {
    esprima = _esprima_;
  }));

  it('should do something', function () {
    (!!esprima).should.equal(true);
  });

});
