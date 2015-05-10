'use strict';

describe('Service: RewireScope', function () {

  // load the service's module
  beforeEach(module('validateDsl'));

  // instantiate service
  var RewireScope;
  var esprima;
  var esrefactor;
  var _;
  beforeEach(inject(function (_RewireScope_, _esprima_, ___, _esrefactor_) {
    RewireScope = _RewireScope_;
    esprima = _esprima_;
    _ = ___;
    esrefactor = _esrefactor_;
  }));

  it('should do something', function () {
    (!!RewireScope).should.equal(true);
  });

  it('should getIndices properly 1', function(){
    var text = "ala ma kota i ma psa";
    var indices = RewireScope.getIndices(text, "ma");
    indices.should.have.property('0', 4);
    indices.should.have.property('1', 13);
    indices.should.have.property('length', 2);
  });

  it('should getIndices properly 2', function(){
    var text = "ala ma kota i ma psa";
    var indices = RewireScope.getIndices(text, "ala");
    indices.should.have.property('0', 0);
    indices.should.have.property('length', 1);
  });

  it('should getIndices properly 3', function(){
    var text = "";
    var indices = RewireScope.getIndices(text, "ala");
    indices.should.have.property('length', 0);
  });

  it('should getIndices with new line', function(){
    var text = "ala ma kota\
    i ma psa";
    var indices = RewireScope.getIndices(text, "ma");
    indices.should.have.property('length', 2);
  });

  it('should getIndices in function', function(){
    var text = "(function() { return function () {\
      getNullRule(context.isNullable, isDate.then(True).otherwise(False(\"$0 is not date\")));\
    }; })()";
    var indices = RewireScope.getIndices(text, "isDate");
    indices.should.have.property('length', 1);
  });

  // it('should parse True', function() {
  //   var fn = function(){
  //     getNullRule(context.isNullable, isDate.then(True).otherwise(False("$0 is not date")));
  //   };

  //   var code = RewireScope.wrapFn(fn.toString());
  //   var ctx = new esrefactor.Context(code);

  //   console.log(code);

  //   var id = ctx.identify(86);

  //   // console.log("-------->", id);
  //   // console.log("-------->", ctx.rename(id, "ASD"));
  // });

  it('should rewire scope', function() {
    var fn = function(){
      getNullRule(context.isNullable, isDate.then(True).otherwise(False("$0 is not date")));
    };

    var targetFn = function() {
      Rules.getNullRule(context.isNullable, Rules.isDate.then(Rules.True).otherwise(Rules.False("$0 is not date")));
    }

    var key = "Rules";
    var newScope = {
      isDate: "",
      True: "",
      False: "",
      getNullRule: ""
    };

    var fnNew = RewireScope.rewire(fn, "Rules", newScope);

    var ast = esprima.parse(RewireScope.wrapFn(fnNew.toString()));
    var targetAst = esprima.parse(RewireScope.wrapFn(targetFn.toString()));

    _.isEqual(ast, targetAst).should.equal(true);
  });

  function deepEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

});
