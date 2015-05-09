'use strict';

describe('Service: RewireScope', function () {

  // load the service's module
  beforeEach(module('validateDsl'));

  // instantiate service
  var RewireScope;
  beforeEach(inject(function (_RewireScope_) {
    RewireScope = _RewireScope_;
  }));

  it('should do something', function () {
    (!!RewireScope).should.equal(true);
  });

});
