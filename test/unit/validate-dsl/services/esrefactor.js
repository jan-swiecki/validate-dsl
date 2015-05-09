'use strict';

describe('Service: esrefactor', function () {

  // load the service's module
  beforeEach(module('validateDsl'));

  // instantiate service
  var esrefactor;

  beforeEach(inject(function(_esrefactor_) {
    esrefactor = _esrefactor_;
  }));

  it('should exist', function() {
    (!!esrefactor).should.equal(true);
  });

  it('change variable name', function() {

    var code = "console.log(x); x()";
    var ctx = new esrefactor.Context(code);
    var id = ctx.identify(12);
    ctx.rename(id, "Rules.x").should.equal("console.log(Rules.x); Rules.x()");

  });

});
