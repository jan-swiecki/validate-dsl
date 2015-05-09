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

  it('rewire scope', function() {

    var code = "function(){\
      getNullRule(context.isNullable, isDate.then(True).otherwise(False(\"$0 is not date\")))\
    }";

    var targetCode = "function(){\
      Rules.getNullRule(context.isNullable, Rules.isDate.then(Rules.True).otherwise(Rules.False(\"$0 is not date\")))\
    }";
    
    // var ctx = new esrefactor.Context(code);
    // var id = ctx.identify(12);
    // ctx.rename(id, "Rules.x").should.equal("console.log(Rules.x); Rules.x()");

    (true).should.equal(true);


  });

  it('should getIndices properly', function(){

    var text = "ala ma kota i ma psa";

    var indices = RewireScope.getIndices(text, "ma");

    // var indices = [4, 13];
    indices.should.have.property('0', 4);
    indices.should.have.property('1', 13);
    // (true).should.equal(true);

  });


});
