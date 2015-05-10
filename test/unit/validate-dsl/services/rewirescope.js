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

  it('should rename properly', function() {
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

    var fnNew = RewireScope.rewire(fn, {Rules: newScope});

    var ast = esprima.parse(RewireScope.wrapFn(fnNew.toString()));
    var targetAst = esprima.parse(RewireScope.wrapFn(targetFn.toString()));

    _.isEqual(ast, targetAst).should.equal(true);
  });

  it('should rewire properly', function() {
    var fn = function(){
      Rule(true)
        .then(
          isUndefined
            .then(True)
            .otherwise(isString.then(True).otherwise(False("$0 is not string")))
        ).otherwise(
          isUndefined
            .then(False("$0 is null"))
            .otherwise(isString.then(True).otherwise(False("$0 is not string")))
        );
    };

    var targetFn = function() {
      Rule.Rule(true)
        .then(
          Rules.isUndefined
            .then(Rules.True)
            .otherwise(Rules.isString.then(Rules.True).otherwise(Rules.False("$0 is not string")))
        ).otherwise(
          Rules.isUndefined
            .then(Rules.False("$0 is null"))
            .otherwise(Rules.isString.then(Rules.True).otherwise(Rules.False("$0 is not string")))
        );
    };

    // var targetFnStr = "("+targetFn+")(Rules, Rule)";

    var key = "Rules";
    var newScope = {
      isDate: "",
      isString: "",
      isUndefined: "",
      True: "",
      False: "",
      getNullRule: ""
    };

    var fnNew = RewireScope.rewire(fn, {Rules: newScope, Rule: {Rule: {}}});

    var fnNewStr = RewireScope.wrapFn(fnNew.toString());
    var targetFnStr = RewireScope.wrapFn(targetFn.toString());

    var ast = esprima.parse(fnNewStr);
    var targetAst = esprima.parse(targetFnStr);

    _.isEqual(ast, targetAst).should.equal(true);
  });
});
