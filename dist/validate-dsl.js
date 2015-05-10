(function (angular) {

  // Create all modules and define dependencies to make sure they exist
  // and are loaded in the correct order to satisfy dependency injection
  // before all nested files are concatenated by Gulp

  // Config
  angular.module('validateDsl.config', [])
      .value('validateDsl.config', {
          debug: true
      });

  // Modules
  angular.module('validateDsl.services', []);
  angular.module('validateDsl',
      [
          'validateDsl.config',
          'validateDsl.services'
      ]);

})(angular);

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// window.esrefactor = require("esrefactor");
// console.log("esrefactor", window.esrefactor);

angular.module('validateDsl').service('esrefactor', function() {
	return require("esrefactor");
});

// var code = "console.log(x); x()";

// var ctx = new esrefactor.Context(code);

// var id = ctx.identify(12);

// console.log(ctx.rename(id, "Rules.x"));
}).call(this,require("ngpmcQ"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_f7301600.js","/")
},{"buffer":6,"esrefactor":2,"ngpmcQ":9}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*
  Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*global esprima:true, estraverse:true, escope: true,
 define:true, require:true, exports:true */

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) {
        define('esrefactor', ['exports', 'esprima', 'estraverse', 'escope'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports, require('esprima'), require('estraverse'), require('escope'));
    } else {
        factory((root.esrefactor = {}), esprima, estraverse, escope);
    }
}(this, function (exports, esprima, estraverse, escope) {
    'use strict';

    function Context(code) {
        this._code = null;
        this._syntax = null;
        this._scopeManager = null;
        if (code) {
            this.setCode(code);
        }
    }

    Context.prototype.setCode = function (code) {
        this._code = null;
        this._syntax = null;
        this._scopeManager = null;
        if (typeof code === 'string') {
            this._code = code;
            this._syntax = esprima.parse(code, { range: true });
        } else if (typeof code === 'object' && code.type === 'Program') {
            if (typeof code.range !== 'object' || code.range.length !== 2) {
                throw new Error('esrefactor.Context only accepts a syntax tree with range information');
            }
            this._syntax = code;
        }
        this._scopeManager = escope.analyze(this._syntax);
    };

    function locateDeclaration(ref) {
        var node, scope, i, v;

        if (ref.resolved) {
            return ref.resolved.defs[ref.resolved.defs.length - 1].name;
        }

        scope = ref.from;
        do {
            for (i = 0; i < scope.variables.length; ++i) {
                v = scope.variables[i];
                if (v.name === ref.identifier.name && v.defs.length) {
                    return v.defs[v.defs.length - 1].name;
                }
            }
            scope = scope.upper;
        } while (scope);

        return null;
    }

    // Given the scope, look up the reference which corresponds to the identifier
    // in the specified cursor position. If possible, find also the corresponding
    // declaration for that reference.

    Context.prototype._lookup = function (scope, identifier) {
        var i, j, ref;

        for (i = 0; i < scope.references.length; ++i) {
            ref = scope.references[i];
            if (ref.identifier === identifier) {
                return {
                    identifier: identifier,
                    declaration: locateDeclaration(ref)
                };
            }
        }

        for (i = 0; i < scope.variableScope.variables.length; ++i) {
            ref = scope.variableScope.variables[i];
            for (j = 0; j < ref.identifiers.length; ++j) {
                if (ref.identifiers[j] === identifier) {
                    return {
                        identifier: identifier,
                        declaration: identifier
                    };
                }
            }
        }

    };

    // Given the cursor position, locate the identifier in that position.
    // If there is no identifier in that position, undefined will be returned.
    //
    // The returned object will have the following property:
    //    identifier: the syntax node associated with the identifier
    //   declaration: the syntax node where the identifier is declared
    //    references: an array of the references of the identifier
    //
    // Note that the references array also includes the identifier but it
    // does exclude the declaration.
    //
    // Example:
    //     var ctx = new esrefactor.Context('var x; x; x = 42');
    //     var id = ctx.identify(10);
    //
    //  id will have the value of:
    //      {
    //        identifier: {
    //          type: 'Identifier',
    //          name: 'x',
    //          range: [10, 11]
    //        },
    //        declaration: {
    //          type: 'Identifier',
    //          name: 'x',
    //          range: [4, 5]
    //        },
    //        references: [{
    //          type: 'Identifier',
    //          name: 'x',
    //          range: [7, 8]
    //        }, {
    //          type: 'Identifier',
    //          name: 'x',
    //          range: [10, 11]
    //        }]
    //      }

    Context.prototype.identify = function (pos) {
        var identifier, scopeManager, lookup, result, scope;

        if (!this._syntax) {
            throw new Error('Unable to identify anything without a syntax tree');
        }
        if (!this._scopeManager) {
            throw new Error('Unable to identify anything without a valid scope manager');
        }

        scopeManager = this._scopeManager;
        lookup = this._lookup;

        scopeManager.attach();
        estraverse.traverse(this._syntax, {
            enter: function (node) {
                scope = scopeManager.acquire(node) || scope;
                if (node.type === esprima.Syntax.Identifier) {
                    if (node.range[0] <= pos && node.range[1] >= pos) {
                        identifier = node;
                        return estraverse.VisitorOption.Break;
                    }
                }
            },
            leave: function (node) {
                scope = scopeManager.release(node) || scope;
            }
        });
        scopeManager.detach();

        if (!identifier) {
            return;
        }

        result = lookup(scope, identifier);

        if (result) {
            // Search for all other identical references (same scope).
            result.references = [];
            scopeManager.attach();
            estraverse.traverse(this._syntax, {
                enter: function (node) {
                    var scope, i, ref, d;
                    scope = scopeManager.acquire(node);
                    for (i = 0; i < (scope ? scope.references.length : 0); ++i) {
                        ref = scope.references[i];
                        if (ref.identifier.name === identifier.name) {
                            d = lookup(scope, ref.identifier);
                            if (d && d.declaration === result.declaration) {
                                result.references.push(ref.identifier);
                            }
                        }
                    }
                }
            });
            scopeManager.detach();
        }


        return result;
    };

    // Rename the identifier and its reference to a new specific name.
    // The return value is the new code after the identifier is renamed.
    //
    // This functions needs identification, which is obtain using identify() function.
    //
    // Example:
    //   var ctx = new esrefactor.Context('var x; x = 42');
    //   var id = ctx.identify(4);
    //   var code = ctx.rename(id, 'y');
    //
    // code will be `var y; y = 42'.

    Context.prototype.rename = function (identification, name) {
        var result, list, set, i, id, entry;

        if (!this._code) {
            throw new Error('Unable to rename without the original source');
        }

        result = this._code;
        if (typeof identification === 'undefined') {
            return result;
        }

        list = [identification.identifier.range];
        if (identification.declaration) {
            list.push(identification.declaration.range);
        }
        for (i = 0; i < identification.references.length; ++i) {
            list.push(identification.references[i].range);
        }

        // Sort the references based on the position to prevent
        // shifting all the ranges.
        list.sort(function (a, b) { return b[0] - a[0]; });

        // Prevent double renaming, get the unique set.
        set = [];
        set.push(list[0]);
        for (i = 1; i < list.length; ++i) {
            if (list[i][0] !== list[i - 1][0]) {
                set.push(list[i]);
            }
        }

        id = identification.identifier.name;
        for (i = 0; i < set.length; ++i) {
            result = result.slice(0, set[i][0]) + name + result.slice(set[i][1]);
        }

        return result;
    };

    exports.Context = Context;
}));

}).call(this,require("ngpmcQ"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\esrefactor\\lib\\esrefactor.js","/..\\..\\node_modules\\esrefactor\\lib")
},{"buffer":6,"escope":3,"esprima":4,"estraverse":5,"ngpmcQ":9}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*
  Copyright (C) 2012-2013 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2013 Alex Seville <hi@alexanderseville.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global exports:true, define:true, require:true*/
(function (factory, global) {
    'use strict';

    function namespace(str, obj) {
        var i, iz, names, name;
        names = str.split('.');
        for (i = 0, iz = names.length; i < iz; ++i) {
            name = names[i];
            if (obj.hasOwnProperty(name)) {
                obj = obj[name];
            } else {
                obj = (obj[name] = {});
            }
        }
        return obj;
    }

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define('escope', ['exports', 'estraverse'], function (exports, estraverse) {
            factory(exports, global, estraverse);
        });
    } else if (typeof exports !== 'undefined') {
        factory(exports, global, require('estraverse'));
    } else {
        factory(namespace('escope', global), global, global.estraverse);
    }
}(function (exports, global, estraverse) {
    'use strict';

    var Syntax,
        Map,
        currentScope,
        globalScope,
        scopes,
        options;

    Syntax = estraverse.Syntax;

    if (typeof global.Map !== 'undefined') {
        // ES6 Map
        Map = global.Map;
    } else {
        Map = function Map() {
            this.__data = {};
        };

        Map.prototype.get = function MapGet(key) {
            key = '$' + key;
            if (this.__data.hasOwnProperty(key)) {
                return this.__data[key];
            }
            return undefined;
        };

        Map.prototype.has = function MapHas(key) {
            key = '$' + key;
            return this.__data.hasOwnProperty(key);
        };

        Map.prototype.set = function MapSet(key, val) {
            key = '$' + key;
            this.__data[key] = val;
        };

        Map.prototype['delete'] = function MapDelete(key) {
            key = '$' + key;
            return delete this.__data[key];
        };
    }

    function assert(cond, text) {
        if (!cond) {
            throw new Error(text);
        }
    }

    function defaultOptions() {
        return {
            optimistic: false,
            directive: false
        };
    };

    function updateDeeply(target, override) {
        var key, val;

        function isHashObject(target) {
            return typeof target === 'object' && target instanceof Object && !(target instanceof RegExp);
        }

        for (key in override) {
            if (override.hasOwnProperty(key)) {
                val = override[key];
                if (isHashObject(val)) {
                    if (isHashObject(target[key])) {
                        updateDeeply(target[key], val);
                    } else {
                        target[key] = updateDeeply({}, val);
                    }
                } else {
                    target[key] = val;
                }
            }
        }
        return target;
    }

    function Reference(ident, scope, flag, writeExpr, maybeImplicitGlobal) {
        this.identifier = ident;
        this.from = scope;
        this.tainted = false;
        this.resolved = null;
        this.flag = flag;
        if (this.isWrite()) {
            this.writeExpr = writeExpr;
        }
        this.__maybeImplicitGlobal = maybeImplicitGlobal;
    }

    Reference.READ = 0x1;
    Reference.WRITE = 0x2;
    Reference.RW = 0x3;

    Reference.prototype.isStatic = function isStatic() {
        return !this.tainted && this.resolved && this.resolved.scope.isStatic();
    };

    Reference.prototype.isWrite = function isWrite() {
        return this.flag & Reference.WRITE;
    };

    Reference.prototype.isRead = function isRead() {
        return this.flag & Reference.READ;
    };

    Reference.prototype.isReadOnly = function isReadOnly() {
        return this.flag === Reference.READ;
    };

    Reference.prototype.isWriteOnly = function isWriteOnly() {
        return this.flag === Reference.WRITE;
    };

    Reference.prototype.isReadWrite = function isReadWrite() {
        return this.flag === Reference.RW;
    };

    function Variable(name, scope) {
        this.name = name;
        this.identifiers = [];
        this.references = [];

        this.defs = [];

        this.tainted = false;
        this.stack = true;
        this.scope = scope;
    }

    Variable.CatchClause = 'CatchClause';
    Variable.Parameter = 'Parameter';
    Variable.FunctionName = 'FunctionName';
    Variable.Variable = 'Variable';
    Variable.ImplicitGlobalVariable = 'ImplicitGlobalVariable';

    function isStrictScope(scope, block) {
        var body, i, iz, stmt, expr;

        // When upper scope is exists and strict, inner scope is also strict.
        if (scope.upper && scope.upper.isStrict) {
            return true;
        }

        if (scope.type === 'function') {
            body = block.body;
        } else if (scope.type === 'global') {
            body = block;
        } else {
            return false;
        }

        if (options.directive) {
            for (i = 0, iz = body.body.length; i < iz; ++i) {
                stmt = body.body[i];
                if (stmt.type !== 'DirectiveStatement') {
                    break;
                }
                if (stmt.raw === '"use strict"' || stmt.raw === '\'use strict\'') {
                    return true;
                }
            }
        } else {
            for (i = 0, iz = body.body.length; i < iz; ++i) {
                stmt = body.body[i];
                if (stmt.type !== Syntax.ExpressionStatement) {
                    break;
                }
                expr = stmt.expression;
                if (expr.type !== Syntax.Literal || typeof expr.value !== 'string') {
                    break;
                }
                if (expr.raw != null) {
                    if (expr.raw === '"use strict"' || expr.raw === '\'use strict\'') {
                        return true;
                    }
                } else {
                    if (expr.value === 'use strict') {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function Scope(block, opt) {
        var variable, body;

        this.type =
            (block.type === Syntax.CatchClause) ? 'catch' :
            (block.type === Syntax.WithStatement) ? 'with' :
            (block.type === Syntax.Program) ? 'global' : 'function';
        this.set = new Map();
        this.taints = new Map();
        this.dynamic = this.type === 'global' || this.type === 'with';
        this.block = block;
        this.through = [];
        this.variables = [];
        this.references = [];
        this.left = [];
        this.variableScope =
            (this.type === 'global' || this.type === 'function') ? this : currentScope.variableScope;
        this.functionExpressionScope = false;
        this.directCallToEvalScope = false;
        this.thisFound = false;
        body = this.type === 'function' ? block.body : block;
        if (opt.naming) {
            this.__define(block.id, {
                type: Variable.FunctionName,
                name: block.id,
                node: block
            });
            this.functionExpressionScope = true;
        } else {
            if (this.type === 'function') {
                variable = new Variable('arguments', this);
                this.taints.set('arguments', true);
                this.set.set('arguments', variable);
                this.variables.push(variable);
            }

            if (block.type === Syntax.FunctionExpression && block.id) {
                new Scope(block, { naming: true });
            }
        }

        this.upper = currentScope;
        this.isStrict = isStrictScope(this, block);

        this.childScopes = [];
        if (currentScope) {
            currentScope.childScopes.push(this);
        }


        // RAII
        currentScope = this;
        if (this.type === 'global') {
            globalScope = this;
        }
        scopes.push(this);
    }

    Scope.prototype.__close = function __close() {
        var i, iz, ref, current, node;

        // Because if this is global environment, upper is null
        if (!this.dynamic || options.optimistic) {
            // static resolve
            for (i = 0, iz = this.left.length; i < iz; ++i) {
                ref = this.left[i];
                if (!this.__resolve(ref)) {
                    this.__delegateToUpperScope(ref);
                }
            }
        } else {
            // this is "global" / "with" / "function with eval" environment
            if (this.type === 'with') {
                for (i = 0, iz = this.left.length; i < iz; ++i) {
                    ref = this.left[i];
                    ref.tainted = true;
                    this.__delegateToUpperScope(ref);
                }
            } else {
                for (i = 0, iz = this.left.length; i < iz; ++i) {
                    // notify all names are through to global
                    ref = this.left[i];
                    current = this;
                    do {
                        current.through.push(ref);
                        current = current.upper;
                    } while (current);
                }
            }
        }


        if (this.type === 'global') {
            for (i = 0, iz = this.left.length; i < iz; ++i) {
                // create an implicit global variable from assignment expression
                ref = this.left[i];
                if (ref.__maybeImplicitGlobal) {
                    node = ref.__maybeImplicitGlobal;
                    this.__define(node.left, {
                        type: Variable.ImplicitGlobalVariable,
                        name: node.left,
                        node: node
                    });
                }
            }
        }

        this.left = null;
        currentScope = this.upper;
    };

    Scope.prototype.__resolve = function __resolve(ref) {
        var variable, name;
        name = ref.identifier.name;
        if (this.set.has(name)) {
            variable = this.set.get(name);
            variable.references.push(ref);
            variable.stack = variable.stack && ref.from.variableScope === this.variableScope;
            if (ref.tainted) {
                variable.tainted = true;
                this.taints.set(variable.name, true);
            }
            ref.resolved = variable;
            return true;
        }
        return false;
    };

    Scope.prototype.__delegateToUpperScope = function __delegateToUpperScope(ref) {
        if (this.upper) {
            this.upper.left.push(ref);
        }
        this.through.push(ref);
    };

    Scope.prototype.__define = function __define(node, info) {
        var name, variable;
        if (node && node.type === Syntax.Identifier) {
            name = node.name;
            if (!this.set.has(name)) {
                variable = new Variable(name, this);
                variable.identifiers.push(node);
                variable.defs.push(info);
                this.set.set(name, variable);
                this.variables.push(variable);
            } else {
                variable = this.set.get(name);
                variable.identifiers.push(node);
                variable.defs.push(info);
            }
        }
    };

    Scope.prototype.__referencing = function __referencing(node, assign, writeExpr, maybeImplicitGlobal) {
        var ref;
        // because Array element may be null
        if (node && node.type === Syntax.Identifier) {
            ref = new Reference(node, this, assign || Reference.READ, writeExpr, maybeImplicitGlobal);
            this.references.push(ref);
            this.left.push(ref);
        }
    };

    Scope.prototype.__detectEval = function __detectEval() {
        var current;
        current = this;
        this.directCallToEvalScope = true;
        do {
            current.dynamic = true;
            current = current.upper;
        } while (current);
    };

    Scope.prototype.__detectThis = function __detectThis() {
        this.thisFound = true;
    };

    Scope.prototype.__isClosed = function isClosed() {
        return this.left === null;
    };

    // API Scope#resolve(name)
    // returns resolved reference
    Scope.prototype.resolve = function resolve(ident) {
        var ref, i, iz;
        assert(this.__isClosed(), 'scope should be closed');
        assert(ident.type === Syntax.Identifier, 'target should be identifier');
        for (i = 0, iz = this.references.length; i < iz; ++i) {
            ref = this.references[i];
            if (ref.identifier === ident) {
                return ref;
            }
        }
        return null;
    };

    // API Scope#isStatic
    // returns this scope is static
    Scope.prototype.isStatic = function isStatic() {
        return !this.dynamic;
    };

    // API Scope#isArgumentsMaterialized
    // return this scope has materialized arguments
    Scope.prototype.isArgumentsMaterialized = function isArgumentsMaterialized() {
        // TODO(Constellation)
        // We can more aggressive on this condition like this.
        //
        // function t() {
        //     // arguments of t is always hidden.
        //     function arguments() {
        //     }
        // }
        var variable;

        // This is not function scope
        if (this.type !== 'function') {
            return true;
        }

        if (!this.isStatic()) {
            return true;
        }

        variable = this.set.get('arguments');
        assert(variable, 'always have arguments variable');
        return variable.tainted || variable.references.length  !== 0;
    };

    // API Scope#isThisMaterialized
    // return this scope has materialized `this` reference
    Scope.prototype.isThisMaterialized = function isThisMaterialized() {
        // This is not function scope
        if (this.type !== 'function') {
            return true;
        }
        if (!this.isStatic()) {
            return true;
        }
        return this.thisFound;
    };

    Scope.mangledName = '__$escope$__';

    Scope.prototype.attach = function attach() {
        if (!this.functionExpressionScope) {
            this.block[Scope.mangledName] = this;
        }
    };

    Scope.prototype.detach = function detach() {
        if (!this.functionExpressionScope) {
            delete this.block[Scope.mangledName];
        }
    };

    Scope.prototype.isUsedName = function (name) {
        if (this.set.has(name)) {
            return true;
        }
        for (var i = 0, iz = this.through.length; i < iz; ++i) {
            if (this.through[i].identifier.name === name) {
                return true;
            }
        }
        return false;
    };

    function ScopeManager(scopes) {
        this.scopes = scopes;
        this.attached = false;
    }

    // Returns appropliate scope for this node
    ScopeManager.prototype.__get = function __get(node) {
        var i, iz, scope;
        if (this.attached) {
            return node[Scope.mangledName] || null;
        }
        if (Scope.isScopeRequired(node)) {
            for (i = 0, iz = this.scopes.length; i < iz; ++i) {
                scope = this.scopes[i];
                if (!scope.functionExpressionScope) {
                    if (scope.block === node) {
                        return scope;
                    }
                }
            }
        }
        return null;
    };

    ScopeManager.prototype.acquire = function acquire(node) {
        return this.__get(node);
    };

    ScopeManager.prototype.release = function release(node) {
        var scope = this.__get(node);
        if (scope) {
            scope = scope.upper;
            while (scope) {
                if (!scope.functionExpressionScope) {
                    return scope;
                }
                scope = scope.upper;
            }
        }
        return null;
    };

    ScopeManager.prototype.attach = function attach() {
        var i, iz;
        for (i = 0, iz = this.scopes.length; i < iz; ++i) {
            this.scopes[i].attach();
        }
        this.attached = true;
    };

    ScopeManager.prototype.detach = function detach() {
        var i, iz;
        for (i = 0, iz = this.scopes.length; i < iz; ++i) {
            this.scopes[i].detach();
        }
        this.attached = false;
    };

    Scope.isScopeRequired = function isScopeRequired(node) {
        return Scope.isVariableScopeRequired(node) || node.type === Syntax.WithStatement || node.type === Syntax.CatchClause;
    };

    Scope.isVariableScopeRequired = function isVariableScopeRequired(node) {
        return node.type === Syntax.Program || node.type === Syntax.FunctionExpression || node.type === Syntax.FunctionDeclaration;
    };

    function analyze(tree, providedOptions) {
        var resultScopes;

        options = updateDeeply(defaultOptions(), providedOptions);
        resultScopes = scopes = [];
        currentScope = null;
        globalScope = null;

        // attach scope and collect / resolve names
        estraverse.traverse(tree, {
            enter: function enter(node) {
                var i, iz, decl;
                if (Scope.isScopeRequired(node)) {
                    new Scope(node, {});
                }

                switch (node.type) {
                case Syntax.AssignmentExpression:
                    if (node.operator === '=') {
                        currentScope.__referencing(node.left, Reference.WRITE, node.right, (!currentScope.isStrict && node.left.name != null) && node);
                    } else {
                        currentScope.__referencing(node.left, Reference.RW, node.right);
                    }
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.ArrayExpression:
                    for (i = 0, iz = node.elements.length; i < iz; ++i) {
                        currentScope.__referencing(node.elements[i]);
                    }
                    break;

                case Syntax.BlockStatement:
                    break;

                case Syntax.BinaryExpression:
                    currentScope.__referencing(node.left);
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.BreakStatement:
                    break;

                case Syntax.CallExpression:
                    currentScope.__referencing(node.callee);
                    for (i = 0, iz = node['arguments'].length; i < iz; ++i) {
                        currentScope.__referencing(node['arguments'][i]);
                    }

                    // check this is direct call to eval
                    if (!options.ignoreEval && node.callee.type === Syntax.Identifier && node.callee.name === 'eval') {
                        currentScope.variableScope.__detectEval();
                    }
                    break;

                case Syntax.CatchClause:
                    currentScope.__define(node.param, {
                        type: Variable.CatchClause,
                        name: node.param,
                        node: node
                    });
                    break;

                case Syntax.ConditionalExpression:
                    currentScope.__referencing(node.test);
                    currentScope.__referencing(node.consequent);
                    currentScope.__referencing(node.alternate);
                    break;

                case Syntax.ContinueStatement:
                    break;

                case Syntax.DirectiveStatement:
                    break;

                case Syntax.DoWhileStatement:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.DebuggerStatement:
                    break;

                case Syntax.EmptyStatement:
                    break;

                case Syntax.ExpressionStatement:
                    currentScope.__referencing(node.expression);
                    break;

                case Syntax.ForStatement:
                    currentScope.__referencing(node.init);
                    currentScope.__referencing(node.test);
                    currentScope.__referencing(node.update);
                    break;

                case Syntax.ForInStatement:
                    if (node.left.type === Syntax.VariableDeclaration) {
                        currentScope.__referencing(node.left.declarations[0].id, Reference.WRITE, null, false);
                    } else {
                        currentScope.__referencing(node.left, Reference.WRITE, null, (!currentScope.isStrict && node.left.name != null) && node);
                    }
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.FunctionDeclaration:
                    // FunctionDeclaration name is defined in upper scope
                    currentScope.upper.__define(node.id, {
                        type: Variable.FunctionName,
                        name: node.id,
                        node: node
                    });
                    for (i = 0, iz = node.params.length; i < iz; ++i) {
                        currentScope.__define(node.params[i], {
                            type: Variable.Parameter,
                            name: node.params[i],
                            node: node,
                            index: i
                        });
                    }
                    break;

                case Syntax.FunctionExpression:
                    // id is defined in upper scope
                    for (i = 0, iz = node.params.length; i < iz; ++i) {
                        currentScope.__define(node.params[i], {
                            type: Variable.Parameter,
                            name: node.params[i],
                            node: node,
                            index: i
                        });
                    }
                    break;

                case Syntax.Identifier:
                    break;

                case Syntax.IfStatement:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.Literal:
                    break;

                case Syntax.LabeledStatement:
                    break;

                case Syntax.LogicalExpression:
                    currentScope.__referencing(node.left);
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.MemberExpression:
                    currentScope.__referencing(node.object);
                    if (node.computed) {
                        currentScope.__referencing(node.property);
                    }
                    break;

                case Syntax.NewExpression:
                    currentScope.__referencing(node.callee);
                    for (i = 0, iz = node['arguments'].length; i < iz; ++i) {
                        currentScope.__referencing(node['arguments'][i]);
                    }
                    break;

                case Syntax.ObjectExpression:
                    break;

                case Syntax.Program:
                    break;

                case Syntax.Property:
                    currentScope.__referencing(node.value);
                    break;

                case Syntax.ReturnStatement:
                    currentScope.__referencing(node.argument);
                    break;

                case Syntax.SequenceExpression:
                    for (i = 0, iz = node.expressions.length; i < iz; ++i) {
                        currentScope.__referencing(node.expressions[i]);
                    }
                    break;

                case Syntax.SwitchStatement:
                    currentScope.__referencing(node.discriminant);
                    break;

                case Syntax.SwitchCase:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.ThisExpression:
                    currentScope.variableScope.__detectThis();
                    break;

                case Syntax.ThrowStatement:
                    currentScope.__referencing(node.argument);
                    break;

                case Syntax.TryStatement:
                    break;

                case Syntax.UnaryExpression:
                    currentScope.__referencing(node.argument);
                    break;

                case Syntax.UpdateExpression:
                    currentScope.__referencing(node.argument, Reference.RW, null);
                    break;

                case Syntax.VariableDeclaration:
                    for (i = 0, iz = node.declarations.length; i < iz; ++i) {
                        decl = node.declarations[i];
                        currentScope.variableScope.__define(decl.id, {
                            type: Variable.Variable,
                            name: decl.id,
                            node: decl,
                            index: i,
                            parent: node
                        });
                        if (decl.init) {
                            // initializer is found
                            currentScope.__referencing(decl.id, Reference.WRITE, decl.init, false);
                            currentScope.__referencing(decl.init);
                        }
                    }
                    break;

                case Syntax.VariableDeclarator:
                    break;

                case Syntax.WhileStatement:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.WithStatement:
                    // WithStatement object is referenced at upper scope
                    currentScope.upper.__referencing(node.object);
                    break;
                }
            },

            leave: function leave(node) {
                while (currentScope && node === currentScope.block) {
                    currentScope.__close();
                }
            }
        });

        assert(currentScope === null);
        globalScope = null;
        scopes = null;
        options = null;

        return new ScopeManager(resultScopes);
    }

    exports.version = '0.0.16';
    exports.Reference = Reference;
    exports.Variable = Variable;
    exports.Scope = Scope;
    exports.ScopeManager = ScopeManager;
    exports.analyze = analyze;
}, this));
/* vim: set sw=4 ts=4 et tw=80 : */

}).call(this,require("ngpmcQ"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\esrefactor\\node_modules\\escope\\escope.js","/..\\..\\node_modules\\esrefactor\\node_modules\\escope")
},{"buffer":6,"estraverse":5,"ngpmcQ":9}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true plusplus:true */
/*global esprima:true, define:true, exports:true, window: true,
throwError: true, createLiteral: true, generateStatement: true,
parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseLeftHandSideExpression: true,
parseStatement: true, parseSourceElement: true */

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.esprima = {}));
    }
}(this, function (exports) {
    'use strict';

    var Token,
        TokenName,
        Syntax,
        PropertyKind,
        Messages,
        Regex,
        source,
        strict,
        index,
        lineNumber,
        lineStart,
        length,
        buffer,
        state,
        extra;

    Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8
    };

    TokenName = {};
    TokenName[Token.BooleanLiteral] = 'Boolean';
    TokenName[Token.EOF] = '<end>';
    TokenName[Token.Identifier] = 'Identifier';
    TokenName[Token.Keyword] = 'Keyword';
    TokenName[Token.NullLiteral] = 'Null';
    TokenName[Token.NumericLiteral] = 'Numeric';
    TokenName[Token.Punctuator] = 'Punctuator';
    TokenName[Token.StringLiteral] = 'String';

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
    };

    // Error messages should be identical to V8.
    Messages = {
        UnexpectedToken:  'Unexpected token %0',
        UnexpectedNumber:  'Unexpected number',
        UnexpectedString:  'Unexpected string',
        UnexpectedIdentifier:  'Unexpected identifier',
        UnexpectedReserved:  'Unexpected reserved word',
        UnexpectedEOS:  'Unexpected end of input',
        NewlineAfterThrow:  'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp:  'Invalid regular expression: missing /',
        InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
        InvalidLHSInForIn:  'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally:  'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalReturn: 'Illegal return statement',
        StrictModeWith:  'Strict mode code may not include a with statement',
        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
        StrictDelete:  'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
        AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord:  'Use of future reserved word in strict mode'
    };

    // See also tools/generate-unicode-regex.py.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
        NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
    };

    // Ensure the condition is true, otherwise throw an error.
    // This is only to have a better contract semantic, i.e. another safety net
    // to catch a logic error. The condition shall be fulfilled in normal case.
    // Do NOT use this to enforce a certain condition on any user input.

    function assert(condition, message) {
        if (!condition) {
            throw new Error('ASSERT: ' + message);
        }
    }

    function sliceSource(from, to) {
        return source.slice(from, to);
    }

    if (typeof 'esprima'[0] === 'undefined') {
        sliceSource = function sliceArraySource(from, to) {
            return source.slice(from, to).join('');
        };
    }

    function isDecimalDigit(ch) {
        return '0123456789'.indexOf(ch) >= 0;
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }


    // 7.2 White Space

    function isWhiteSpace(ch) {
        return (ch === ' ') || (ch === '\u0009') || (ch === '\u000B') ||
            (ch === '\u000C') || (ch === '\u00A0') ||
            (ch.charCodeAt(0) >= 0x1680 &&
             '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(ch) >= 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierStart.test(ch));
    }

    function isIdentifierPart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch >= '0') && (ch <= '9')) ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierPart.test(ch));
    }

    // 7.6.1.2 Future Reserved Words

    function isFutureReservedWord(id) {
        switch (id) {

        // Future reserved words.
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        }

        return false;
    }

    function isStrictModeReservedWord(id) {
        switch (id) {

        // Strict Mode reserved words.
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        }

        return false;
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    // 7.6.1.1 Keywords

    function isKeyword(id) {
        var keyword = false;
        switch (id.length) {
        case 2:
            keyword = (id === 'if') || (id === 'in') || (id === 'do');
            break;
        case 3:
            keyword = (id === 'var') || (id === 'for') || (id === 'new') || (id === 'try');
            break;
        case 4:
            keyword = (id === 'this') || (id === 'else') || (id === 'case') || (id === 'void') || (id === 'with');
            break;
        case 5:
            keyword = (id === 'while') || (id === 'break') || (id === 'catch') || (id === 'throw');
            break;
        case 6:
            keyword = (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch');
            break;
        case 7:
            keyword = (id === 'default') || (id === 'finally');
            break;
        case 8:
            keyword = (id === 'function') || (id === 'continue') || (id === 'debugger');
            break;
        case 10:
            keyword = (id === 'instanceof');
            break;
        }

        if (keyword) {
            return true;
        }

        switch (id) {
        // Future reserved words.
        // 'const' is specialized as Keyword in V8.
        case 'const':
            return true;

        // For compatiblity to SpiderMonkey and ES.next
        case 'yield':
        case 'let':
            return true;
        }

        if (strict && isStrictModeReservedWord(id)) {
            return true;
        }

        return isFutureReservedWord(id);
    }

    // 7.4 Comments

    function skipComment() {
        var ch, blockComment, lineComment;

        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    lineComment = false;
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            ++index;
                            blockComment = false;
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    index += 2;
                    lineComment = true;
                } else if (ch === '*') {
                    index += 2;
                    blockComment = true;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function scanHexEscape(prefix) {
        var i, len, ch, code = 0;

        len = (prefix === 'u') ? 4 : 2;
        for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
                ch = source[index++];
                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
                return '';
            }
        }
        return String.fromCharCode(code);
    }

    function scanIdentifier() {
        var ch, start, id, restore;

        ch = source[index];
        if (!isIdentifierStart(ch)) {
            return;
        }

        start = index;
        if (ch === '\\') {
            ++index;
            if (source[index] !== 'u') {
                return;
            }
            ++index;
            restore = index;
            ch = scanHexEscape('u');
            if (ch) {
                if (ch === '\\' || !isIdentifierStart(ch)) {
                    return;
                }
                id = ch;
            } else {
                index = restore;
                id = 'u';
            }
        } else {
            id = source[index++];
        }

        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }
            if (ch === '\\') {
                ++index;
                if (source[index] !== 'u') {
                    return;
                }
                ++index;
                restore = index;
                ch = scanHexEscape('u');
                if (ch) {
                    if (ch === '\\' || !isIdentifierPart(ch)) {
                        return;
                    }
                    id += ch;
                } else {
                    index = restore;
                    id += 'u';
                }
            } else {
                id += source[index++];
            }
        }

        // There is no keyword or literal with only one character.
        // Thus, it must be an identifier.
        if (id.length === 1) {
            return {
                type: Token.Identifier,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (isKeyword(id)) {
            return {
                type: Token.Keyword,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.1 Null Literals

        if (id === 'null') {
            return {
                type: Token.NullLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.2 Boolean Literals

        if (id === 'true' || id === 'false') {
            return {
                type: Token.BooleanLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        return {
            type: Token.Identifier,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.7 Punctuators

    function scanPunctuator() {
        var start = index,
            ch1 = source[index],
            ch2,
            ch3,
            ch4;

        // Check for most common single-character punctuators.

        if (ch1 === ';' || ch1 === '{' || ch1 === '}') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === ',' || ch1 === '(' || ch1 === ')') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Dot (.) can also start a floating-point number, hence the need
        // to check the next character.

        ch2 = source[index + 1];
        if (ch1 === '.' && !isDecimalDigit(ch2)) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Peek more characters.

        ch3 = source[index + 2];
        ch4 = source[index + 3];

        // 4-character punctuator: >>>=

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            if (ch4 === '=') {
                index += 4;
                return {
                    type: Token.Punctuator,
                    value: '>>>=',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // 3-character punctuators: === !== >>> <<= >>=

        if (ch1 === '=' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '===',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '!' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '!==',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>>',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '<<=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 2-character punctuators: <= >= == != ++ -- << >> && ||
        // += -= *= %= &= |= ^= /=

        if (ch2 === '=') {
            if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        if (ch1 === ch2 && ('+-<>&|'.indexOf(ch1) >= 0)) {
            if ('+-<>&|'.indexOf(ch2) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // The remaining 1-character punctuators.

        if ('[]<>+-*%&|^!~?:=/'.indexOf(ch1) >= 0) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    }

    // 7.8.3 Numeric Literals

    function scanNumericLiteral() {
        var number, start, ch;

        ch = source[index];
        assert(isDecimalDigit(ch) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        start = index;
        number = '';
        if (ch !== '.') {
            number = source[index++];
            ch = source[index];

            // Hex number starts with '0x'.
            // Octal number starts with '0'.
            if (number === '0') {
                if (ch === 'x' || ch === 'X') {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isHexDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (number.length <= 2) {
                        // only 0x
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 16),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                } else if (isOctalDigit(ch)) {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isOctalDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 8),
                        octal: true,
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                }

                // decimal number starts with '0' such as '09' is illegal.
                if (isDecimalDigit(ch)) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            }

            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === '.') {
            number += source[index++];
            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === 'e' || ch === 'E') {
            number += source[index++];

            ch = source[index];
            if (ch === '+' || ch === '-') {
                number += source[index++];
            }

            ch = source[index];
            if (isDecimalDigit(ch)) {
                number += source[index++];
                while (index < length) {
                    ch = source[index];
                    if (!isDecimalDigit(ch)) {
                        break;
                    }
                    number += source[index++];
                }
            } else {
                ch = 'character ' + ch;
                if (index >= length) {
                    ch = '<end>';
                }
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        if (index < length) {
            ch = source[index];
            if (isIdentifierStart(ch)) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.8.4 String Literals

    function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false;

        quote = source[index];
        assert((quote === '\'' || quote === '"'),
            'String literal must starts with a quote');

        start = index;
        ++index;

        while (index < length) {
            ch = source[index++];

            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = source[index++];
                if (!isLineTerminator(ch)) {
                    switch (ch) {
                    case 'n':
                        str += '\n';
                        break;
                    case 'r':
                        str += '\r';
                        break;
                    case 't':
                        str += '\t';
                        break;
                    case 'u':
                    case 'x':
                        restore = index;
                        unescaped = scanHexEscape(ch);
                        if (unescaped) {
                            str += unescaped;
                        } else {
                            index = restore;
                            str += ch;
                        }
                        break;
                    case 'b':
                        str += '\b';
                        break;
                    case 'f':
                        str += '\f';
                        break;
                    case 'v':
                        str += '\x0B';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch);

                            // \0 is not octal escape sequence
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(source[index++]);

                                // 3 digits are only allowed when string starts
                                // with 0, 1, 2, 3
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(source[index++]);
                                }
                            }
                            str += String.fromCharCode(code);
                        } else {
                            str += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                }
            } else if (isLineTerminator(ch)) {
                break;
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanRegExp() {
        var str, ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;

        buffer = null;
        skipComment();

        start = index;
        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = source[index++];

        while (index < length) {
            ch = source[index++];
            str += ch;
            if (ch === '\\') {
                ch = source[index++];
                // ECMA-262 7.8.5
                if (isLineTerminator(ch)) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
                str += ch;
            } else if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                } else if (isLineTerminator(ch)) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
            }
        }

        if (!terminated) {
            throwError({}, Messages.UnterminatedRegExp);
        }

        // Exclude leading and trailing slash.
        pattern = str.substr(1, str.length - 2);

        flags = '';
        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }

            ++index;
            if (ch === '\\' && index < length) {
                ch = source[index];
                if (ch === 'u') {
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        flags += ch;
                        str += '\\u';
                        for (; restore < index; ++restore) {
                            str += source[restore];
                        }
                    } else {
                        index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                } else {
                    str += '\\';
                }
            } else {
                flags += ch;
                str += ch;
            }
        }

        try {
            value = new RegExp(pattern, flags);
        } catch (e) {
            throwError({}, Messages.InvalidRegExp);
        }

        return {
            literal: str,
            value: value,
            range: [start, index]
        };
    }

    function isIdentifierName(token) {
        return token.type === Token.Identifier ||
            token.type === Token.Keyword ||
            token.type === Token.BooleanLiteral ||
            token.type === Token.NullLiteral;
    }

    function advance() {
        var ch, token;

        skipComment();

        if (index >= length) {
            return {
                type: Token.EOF,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [index, index]
            };
        }

        token = scanPunctuator();
        if (typeof token !== 'undefined') {
            return token;
        }

        ch = source[index];

        if (ch === '\'' || ch === '"') {
            return scanStringLiteral();
        }

        if (ch === '.' || isDecimalDigit(ch)) {
            return scanNumericLiteral();
        }

        token = scanIdentifier();
        if (typeof token !== 'undefined') {
            return token;
        }

        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    function lex() {
        var token;

        if (buffer) {
            index = buffer.range[1];
            lineNumber = buffer.lineNumber;
            lineStart = buffer.lineStart;
            token = buffer;
            buffer = null;
            return token;
        }

        buffer = null;
        return advance();
    }

    function lookahead() {
        var pos, line, start;

        if (buffer !== null) {
            return buffer;
        }

        pos = index;
        line = lineNumber;
        start = lineStart;
        buffer = advance();
        index = pos;
        lineNumber = line;
        lineStart = start;

        return buffer;
    }

    // Return true if there is a line terminator before the next token.

    function peekLineTerminator() {
        var pos, line, start, found;

        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;

        return found;
    }

    // Throw an exception

    function throwError(token, messageFormat) {
        var error,
            args = Array.prototype.slice.call(arguments, 2),
            msg = messageFormat.replace(
                /%(\d)/g,
                function (whole, index) {
                    return args[index] || '';
                }
            );

        if (typeof token.lineNumber === 'number') {
            error = new Error('Line ' + token.lineNumber + ': ' + msg);
            error.index = token.range[0];
            error.lineNumber = token.lineNumber;
            error.column = token.range[0] - lineStart + 1;
        } else {
            error = new Error('Line ' + lineNumber + ': ' + msg);
            error.index = index;
            error.lineNumber = lineNumber;
            error.column = index - lineStart + 1;
        }

        throw error;
    }

    function throwErrorTolerant() {
        try {
            throwError.apply(null, arguments);
        } catch (e) {
            if (extra.errors) {
                extra.errors.push(e);
            } else {
                throw e;
            }
        }
    }


    // Throw an exception because of the token.

    function throwUnexpected(token) {
        if (token.type === Token.EOF) {
            throwError(token, Messages.UnexpectedEOS);
        }

        if (token.type === Token.NumericLiteral) {
            throwError(token, Messages.UnexpectedNumber);
        }

        if (token.type === Token.StringLiteral) {
            throwError(token, Messages.UnexpectedString);
        }

        if (token.type === Token.Identifier) {
            throwError(token, Messages.UnexpectedIdentifier);
        }

        if (token.type === Token.Keyword) {
            if (isFutureReservedWord(token.value)) {
                throwError(token, Messages.UnexpectedReserved);
            } else if (strict && isStrictModeReservedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictReservedWord);
                return;
            }
            throwError(token, Messages.UnexpectedToken, token.value);
        }

        // BooleanLiteral, NullLiteral, or Punctuator.
        throwError(token, Messages.UnexpectedToken, token.value);
    }

    // Expect the next token to match the specified punctuator.
    // If not, an exception will be thrown.

    function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpected(token);
        }
    }

    // Expect the next token to match the specified keyword.
    // If not, an exception will be thrown.

    function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpected(token);
        }
    }

    // Return true if the next token matches the specified punctuator.

    function match(value) {
        var token = lookahead();
        return token.type === Token.Punctuator && token.value === value;
    }

    // Return true if the next token matches the specified keyword

    function matchKeyword(keyword) {
        var token = lookahead();
        return token.type === Token.Keyword && token.value === keyword;
    }

    // Return true if the next token is an assignment operator

    function matchAssign() {
        var token = lookahead(),
            op = token.value;

        if (token.type !== Token.Punctuator) {
            return false;
        }
        return op === '=' ||
            op === '*=' ||
            op === '/=' ||
            op === '%=' ||
            op === '+=' ||
            op === '-=' ||
            op === '<<=' ||
            op === '>>=' ||
            op === '>>>=' ||
            op === '&=' ||
            op === '^=' ||
            op === '|=';
    }

    function consumeSemicolon() {
        var token, line;

        // Catch the very common case first.
        if (source[index] === ';') {
            lex();
            return;
        }

        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
            return;
        }

        if (match(';')) {
            lex();
            return;
        }

        token = lookahead();
        if (token.type !== Token.EOF && !match('}')) {
            throwUnexpected(token);
        }
    }

    // Return true if provided expression is LeftHandSideExpression

    function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
    }

    // 11.1.4 Array Initialiser

    function parseArrayInitialiser() {
        var elements = [];

        expect('[');

        while (!match(']')) {
            if (match(',')) {
                lex();
                elements.push(null);
            } else {
                elements.push(parseAssignmentExpression());

                if (!match(']')) {
                    expect(',');
                }
            }
        }

        expect(']');

        return {
            type: Syntax.ArrayExpression,
            elements: elements
        };
    }

    // 11.1.5 Object Initialiser

    function parsePropertyFunction(param, first) {
        var previousStrict, body;

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (first && strict && isRestrictedWord(param[0].name)) {
            throwErrorTolerant(first, Messages.StrictParamName);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: null,
            params: param,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseObjectPropertyKey() {
        var token = lex();

        // Note: This function is called only from parseObjectProperty(), where
        // EOF and Punctuator tokens are already filtered out.

        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseObjectProperty() {
        var token, key, id, param;

        token = lookahead();

        if (token.type === Token.Identifier) {

            id = parseObjectPropertyKey();

            // Property Assignment: Getter and Setter.

            if (token.value === 'get' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                expect(')');
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parsePropertyFunction([]),
                    kind: 'get'
                };
            } else if (token.value === 'set' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                token = lookahead();
                if (token.type !== Token.Identifier) {
                    expect(')');
                    throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction([]),
                        kind: 'set'
                    };
                } else {
                    param = [ parseVariableIdentifier() ];
                    expect(')');
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction(param, token),
                        kind: 'set'
                    };
                }
            } else {
                expect(':');
                return {
                    type: Syntax.Property,
                    key: id,
                    value: parseAssignmentExpression(),
                    kind: 'init'
                };
            }
        } else if (token.type === Token.EOF || token.type === Token.Punctuator) {
            throwUnexpected(token);
        } else {
            key = parseObjectPropertyKey();
            expect(':');
            return {
                type: Syntax.Property,
                key: key,
                value: parseAssignmentExpression(),
                kind: 'init'
            };
        }
    }

    function parseObjectInitialiser() {
        var properties = [], property, name, kind, map = {}, toString = String;

        expect('{');

        while (!match('}')) {
            property = parseObjectProperty();

            if (property.key.type === Syntax.Identifier) {
                name = property.key.name;
            } else {
                name = toString(property.key.value);
            }
            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;
            if (Object.prototype.hasOwnProperty.call(map, name)) {
                if (map[name] === PropertyKind.Data) {
                    if (strict && kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    } else if (map[name] & kind) {
                        throwErrorTolerant({}, Messages.AccessorGetSet);
                    }
                }
                map[name] |= kind;
            } else {
                map[name] = kind;
            }

            properties.push(property);

            if (!match('}')) {
                expect(',');
            }
        }

        expect('}');

        return {
            type: Syntax.ObjectExpression,
            properties: properties
        };
    }

    // 11.1.6 The Grouping Operator

    function parseGroupExpression() {
        var expr;

        expect('(');

        expr = parseExpression();

        expect(')');

        return expr;
    }


    // 11.1 Primary Expressions

    function parsePrimaryExpression() {
        var token = lookahead(),
            type = token.type;

        if (type === Token.Identifier) {
            return {
                type: Syntax.Identifier,
                name: lex().value
            };
        }

        if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(lex());
        }

        if (type === Token.Keyword) {
            if (matchKeyword('this')) {
                lex();
                return {
                    type: Syntax.ThisExpression
                };
            }

            if (matchKeyword('function')) {
                return parseFunctionExpression();
            }
        }

        if (type === Token.BooleanLiteral) {
            lex();
            token.value = (token.value === 'true');
            return createLiteral(token);
        }

        if (type === Token.NullLiteral) {
            lex();
            token.value = null;
            return createLiteral(token);
        }

        if (match('[')) {
            return parseArrayInitialiser();
        }

        if (match('{')) {
            return parseObjectInitialiser();
        }

        if (match('(')) {
            return parseGroupExpression();
        }

        if (match('/') || match('/=')) {
            return createLiteral(scanRegExp());
        }

        return throwUnexpected(lex());
    }

    // 11.2 Left-Hand-Side Expressions

    function parseArguments() {
        var args = [];

        expect('(');

        if (!match(')')) {
            while (index < length) {
                args.push(parseAssignmentExpression());
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return args;
    }

    function parseNonComputedProperty() {
        var token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseNonComputedMember() {
        expect('.');

        return parseNonComputedProperty();
    }

    function parseComputedMember() {
        var expr;

        expect('[');

        expr = parseExpression();

        expect(']');

        return expr;
    }

    function parseNewExpression() {
        var expr;

        expectKeyword('new');

        expr = {
            type: Syntax.NewExpression,
            callee: parseLeftHandSideExpression(),
            'arguments': []
        };

        if (match('(')) {
            expr['arguments'] = parseArguments();
        }

        return expr;
    }

    function parseLeftHandSideExpressionAllowCall() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }


    function parseLeftHandSideExpression() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }

    // 11.3 Postfix Expressions

    function parsePostfixExpression() {
        var expr = parseLeftHandSideExpressionAllowCall(), token;

        token = lookahead();
        if (token.type !== Token.Punctuator) {
            return expr;
        }

        if ((match('++') || match('--')) && !peekLineTerminator()) {
            // 11.3.1, 11.3.2
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPostfix);
            }
            if (!isLeftHandSide(expr)) {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: lex().value,
                argument: expr,
                prefix: false
            };
        }

        return expr;
    }

    // 11.4 Unary Operators

    function parseUnaryExpression() {
        var token, expr;

        token = lookahead();
        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return parsePostfixExpression();
        }

        if (match('++') || match('--')) {
            token = lex();
            expr = parseUnaryExpression();
            // 11.4.4, 11.4.5
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPrefix);
            }

            if (!isLeftHandSide(expr)) {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: token.value,
                argument: expr,
                prefix: true
            };
            return expr;
        }

        if (match('+') || match('-') || match('~') || match('!')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            return expr;
        }

        if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                throwErrorTolerant({}, Messages.StrictDelete);
            }
            return expr;
        }

        return parsePostfixExpression();
    }

    // 11.5 Multiplicative Operators

    function parseMultiplicativeExpression() {
        var expr = parseUnaryExpression();

        while (match('*') || match('/') || match('%')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseUnaryExpression()
            };
        }

        return expr;
    }

    // 11.6 Additive Operators

    function parseAdditiveExpression() {
        var expr = parseMultiplicativeExpression();

        while (match('+') || match('-')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseMultiplicativeExpression()
            };
        }

        return expr;
    }

    // 11.7 Bitwise Shift Operators

    function parseShiftExpression() {
        var expr = parseAdditiveExpression();

        while (match('<<') || match('>>') || match('>>>')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseAdditiveExpression()
            };
        }

        return expr;
    }
    // 11.8 Relational Operators

    function parseRelationalExpression() {
        var expr, previousAllowIn;

        previousAllowIn = state.allowIn;
        state.allowIn = true;

        expr = parseShiftExpression();

        while (match('<') || match('>') || match('<=') || match('>=') || (previousAllowIn && matchKeyword('in')) || matchKeyword('instanceof')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseShiftExpression()
            };
        }

        state.allowIn = previousAllowIn;
        return expr;
    }

    // 11.9 Equality Operators

    function parseEqualityExpression() {
        var expr = parseRelationalExpression();

        while (match('==') || match('!=') || match('===') || match('!==')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseRelationalExpression()
            };
        }

        return expr;
    }

    // 11.10 Binary Bitwise Operators

    function parseBitwiseANDExpression() {
        var expr = parseEqualityExpression();

        while (match('&')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '&',
                left: expr,
                right: parseEqualityExpression()
            };
        }

        return expr;
    }

    function parseBitwiseXORExpression() {
        var expr = parseBitwiseANDExpression();

        while (match('^')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '^',
                left: expr,
                right: parseBitwiseANDExpression()
            };
        }

        return expr;
    }

    function parseBitwiseORExpression() {
        var expr = parseBitwiseXORExpression();

        while (match('|')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '|',
                left: expr,
                right: parseBitwiseXORExpression()
            };
        }

        return expr;
    }

    // 11.11 Binary Logical Operators

    function parseLogicalANDExpression() {
        var expr = parseBitwiseORExpression();

        while (match('&&')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '&&',
                left: expr,
                right: parseBitwiseORExpression()
            };
        }

        return expr;
    }

    function parseLogicalORExpression() {
        var expr = parseLogicalANDExpression();

        while (match('||')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '||',
                left: expr,
                right: parseLogicalANDExpression()
            };
        }

        return expr;
    }

    // 11.12 Conditional Operator

    function parseConditionalExpression() {
        var expr, previousAllowIn, consequent;

        expr = parseLogicalORExpression();

        if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = parseAssignmentExpression();
            state.allowIn = previousAllowIn;
            expect(':');

            expr = {
                type: Syntax.ConditionalExpression,
                test: expr,
                consequent: consequent,
                alternate: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.13 Assignment Operators

    function parseAssignmentExpression() {
        var token, expr;

        token = lookahead();
        expr = parseConditionalExpression();

        if (matchAssign()) {
            // LeftHandSideExpression
            if (!isLeftHandSide(expr)) {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }

            // 11.13.1
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant(token, Messages.StrictLHSAssignment);
            }

            expr = {
                type: Syntax.AssignmentExpression,
                operator: lex().value,
                left: expr,
                right: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.14 Comma Operator

    function parseExpression() {
        var expr = parseAssignmentExpression();

        if (match(',')) {
            expr = {
                type: Syntax.SequenceExpression,
                expressions: [ expr ]
            };

            while (index < length) {
                if (!match(',')) {
                    break;
                }
                lex();
                expr.expressions.push(parseAssignmentExpression());
            }

        }
        return expr;
    }

    // 12.1 Block

    function parseStatementList() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseBlock() {
        var block;

        expect('{');

        block = parseStatementList();

        expect('}');

        return {
            type: Syntax.BlockStatement,
            body: block
        };
    }

    // 12.2 Variable Statement

    function parseVariableIdentifier() {
        var token = lex();

        if (token.type !== Token.Identifier) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseVariableDeclaration(kind) {
        var id = parseVariableIdentifier(),
            init = null;

        // 12.2.1
        if (strict && isRestrictedWord(id.name)) {
            throwErrorTolerant({}, Messages.StrictVarName);
        }

        if (kind === 'const') {
            expect('=');
            init = parseAssignmentExpression();
        } else if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return {
            type: Syntax.VariableDeclarator,
            id: id,
            init: init
        };
    }

    function parseVariableDeclarationList(kind) {
        var list = [];

        do {
            list.push(parseVariableDeclaration(kind));
            if (!match(',')) {
                break;
            }
            lex();
        } while (index < length);

        return list;
    }

    function parseVariableStatement() {
        var declarations;

        expectKeyword('var');

        declarations = parseVariableDeclarationList();

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: 'var'
        };
    }

    // kind may be `const` or `let`
    // Both are experimental and not in the specification yet.
    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
    function parseConstLetDeclaration(kind) {
        var declarations;

        expectKeyword(kind);

        declarations = parseVariableDeclarationList(kind);

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: kind
        };
    }

    // 12.3 Empty Statement

    function parseEmptyStatement() {
        expect(';');

        return {
            type: Syntax.EmptyStatement
        };
    }

    // 12.4 Expression Statement

    function parseExpressionStatement() {
        var expr = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 12.5 If statement

    function parseIfStatement() {
        var test, consequent, alternate;

        expectKeyword('if');

        expect('(');

        test = parseExpression();

        expect(')');

        consequent = parseStatement();

        if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
        } else {
            alternate = null;
        }

        return {
            type: Syntax.IfStatement,
            test: test,
            consequent: consequent,
            alternate: alternate
        };
    }

    // 12.6 Iteration Statements

    function parseDoWhileStatement() {
        var body, test, oldInIteration;

        expectKeyword('do');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        if (match(';')) {
            lex();
        }

        return {
            type: Syntax.DoWhileStatement,
            body: body,
            test: test
        };
    }

    function parseWhileStatement() {
        var test, body, oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return {
            type: Syntax.WhileStatement,
            test: test,
            body: body
        };
    }

    function parseForVariableDeclaration() {
        var token = lex();

        return {
            type: Syntax.VariableDeclaration,
            declarations: parseVariableDeclarationList(),
            kind: token.value
        };
    }

    function parseForStatement() {
        var init, test, update, left, right, body, oldInIteration;

        init = test = update = null;

        expectKeyword('for');

        expect('(');

        if (match(';')) {
            lex();
        } else {
            if (matchKeyword('var') || matchKeyword('let')) {
                state.allowIn = false;
                init = parseForVariableDeclaration();
                state.allowIn = true;

                if (init.declarations.length === 1 && matchKeyword('in')) {
                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            } else {
                state.allowIn = false;
                init = parseExpression();
                state.allowIn = true;

                if (matchKeyword('in')) {
                    // LeftHandSideExpression
                    if (!isLeftHandSide(init)) {
                        throwErrorTolerant({}, Messages.InvalidLHSInForIn);
                    }

                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            }

            if (typeof left === 'undefined') {
                expect(';');
            }
        }

        if (typeof left === 'undefined') {

            if (!match(';')) {
                test = parseExpression();
            }
            expect(';');

            if (!match(')')) {
                update = parseExpression();
            }
        }

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        if (typeof left === 'undefined') {
            return {
                type: Syntax.ForStatement,
                init: init,
                test: test,
                update: update,
                body: body
            };
        }

        return {
            type: Syntax.ForInStatement,
            left: left,
            right: right,
            body: body,
            each: false
        };
    }

    // 12.7 The continue statement

    function parseContinueStatement() {
        var token, label = null;

        expectKeyword('continue');

        // Optimize the most common form: 'continue;'.
        if (source[index] === ';') {
            lex();

            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return {
            type: Syntax.ContinueStatement,
            label: label
        };
    }

    // 12.8 The break statement

    function parseBreakStatement() {
        var token, label = null;

        expectKeyword('break');

        // Optimize the most common form: 'break;'.
        if (source[index] === ';') {
            lex();

            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return {
            type: Syntax.BreakStatement,
            label: label
        };
    }

    // 12.9 The return statement

    function parseReturnStatement() {
        var token, argument = null;

        expectKeyword('return');

        if (!state.inFunctionBody) {
            throwErrorTolerant({}, Messages.IllegalReturn);
        }

        // 'return' followed by a space and an identifier is very common.
        if (source[index] === ' ') {
            if (isIdentifierStart(source[index + 1])) {
                argument = parseExpression();
                consumeSemicolon();
                return {
                    type: Syntax.ReturnStatement,
                    argument: argument
                };
            }
        }

        if (peekLineTerminator()) {
            return {
                type: Syntax.ReturnStatement,
                argument: null
            };
        }

        if (!match(';')) {
            token = lookahead();
            if (!match('}') && token.type !== Token.EOF) {
                argument = parseExpression();
            }
        }

        consumeSemicolon();

        return {
            type: Syntax.ReturnStatement,
            argument: argument
        };
    }

    // 12.10 The with statement

    function parseWithStatement() {
        var object, body;

        if (strict) {
            throwErrorTolerant({}, Messages.StrictModeWith);
        }

        expectKeyword('with');

        expect('(');

        object = parseExpression();

        expect(')');

        body = parseStatement();

        return {
            type: Syntax.WithStatement,
            object: object,
            body: body
        };
    }

    // 12.10 The swith statement

    function parseSwitchCase() {
        var test,
            consequent = [],
            statement;

        if (matchKeyword('default')) {
            lex();
            test = null;
        } else {
            expectKeyword('case');
            test = parseExpression();
        }
        expect(':');

        while (index < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                break;
            }
            statement = parseStatement();
            if (typeof statement === 'undefined') {
                break;
            }
            consequent.push(statement);
        }

        return {
            type: Syntax.SwitchCase,
            test: test,
            consequent: consequent
        };
    }

    function parseSwitchStatement() {
        var discriminant, cases, clause, oldInSwitch, defaultFound;

        expectKeyword('switch');

        expect('(');

        discriminant = parseExpression();

        expect(')');

        expect('{');

        cases = [];

        if (match('}')) {
            lex();
            return {
                type: Syntax.SwitchStatement,
                discriminant: discriminant,
                cases: cases
            };
        }

        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;

        while (index < length) {
            if (match('}')) {
                break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    throwError({}, Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }

        state.inSwitch = oldInSwitch;

        expect('}');

        return {
            type: Syntax.SwitchStatement,
            discriminant: discriminant,
            cases: cases
        };
    }

    // 12.13 The throw statement

    function parseThrowStatement() {
        var argument;

        expectKeyword('throw');

        if (peekLineTerminator()) {
            throwError({}, Messages.NewlineAfterThrow);
        }

        argument = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ThrowStatement,
            argument: argument
        };
    }

    // 12.14 The try statement

    function parseCatchClause() {
        var param;

        expectKeyword('catch');

        expect('(');
        if (match(')')) {
            throwUnexpected(lookahead());
        }

        param = parseVariableIdentifier();
        // 12.14.1
        if (strict && isRestrictedWord(param.name)) {
            throwErrorTolerant({}, Messages.StrictCatchVariable);
        }

        expect(')');

        return {
            type: Syntax.CatchClause,
            param: param,
            body: parseBlock()
        };
    }

    function parseTryStatement() {
        var block, handlers = [], finalizer = null;

        expectKeyword('try');

        block = parseBlock();

        if (matchKeyword('catch')) {
            handlers.push(parseCatchClause());
        }

        if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
        }

        if (handlers.length === 0 && !finalizer) {
            throwError({}, Messages.NoCatchOrFinally);
        }

        return {
            type: Syntax.TryStatement,
            block: block,
            guardedHandlers: [],
            handlers: handlers,
            finalizer: finalizer
        };
    }

    // 12.15 The debugger statement

    function parseDebuggerStatement() {
        expectKeyword('debugger');

        consumeSemicolon();

        return {
            type: Syntax.DebuggerStatement
        };
    }

    // 12 Statements

    function parseStatement() {
        var token = lookahead(),
            expr,
            labeledBody;

        if (token.type === Token.EOF) {
            throwUnexpected(token);
        }

        if (token.type === Token.Punctuator) {
            switch (token.value) {
            case ';':
                return parseEmptyStatement();
            case '{':
                return parseBlock();
            case '(':
                return parseExpressionStatement();
            default:
                break;
            }
        }

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'break':
                return parseBreakStatement();
            case 'continue':
                return parseContinueStatement();
            case 'debugger':
                return parseDebuggerStatement();
            case 'do':
                return parseDoWhileStatement();
            case 'for':
                return parseForStatement();
            case 'function':
                return parseFunctionDeclaration();
            case 'if':
                return parseIfStatement();
            case 'return':
                return parseReturnStatement();
            case 'switch':
                return parseSwitchStatement();
            case 'throw':
                return parseThrowStatement();
            case 'try':
                return parseTryStatement();
            case 'var':
                return parseVariableStatement();
            case 'while':
                return parseWhileStatement();
            case 'with':
                return parseWithStatement();
            default:
                break;
            }
        }

        expr = parseExpression();

        // 12.12 Labelled Statements
        if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();

            if (Object.prototype.hasOwnProperty.call(state.labelSet, expr.name)) {
                throwError({}, Messages.Redeclaration, 'Label', expr.name);
            }

            state.labelSet[expr.name] = true;
            labeledBody = parseStatement();
            delete state.labelSet[expr.name];

            return {
                type: Syntax.LabeledStatement,
                label: expr,
                body: labeledBody
            };
        }

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 13 Function Definition

    function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted,
            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody;

        expect('{');

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;

        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;

        while (index < length) {
            if (match('}')) {
                break;
            }
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }

        expect('}');

        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;

        return {
            type: Syntax.BlockStatement,
            body: sourceElements
        };
    }

    function parseFunctionDeclaration() {
        var id, param, params = [], body, token, stricted, firstRestricted, message, previousStrict, paramSet;

        expectKeyword('function');
        token = lookahead();
        id = parseVariableIdentifier();
        if (strict) {
            if (isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionDeclaration,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseFunctionExpression() {
        var token, id = null, stricted, firstRestricted, message, param, params = [], body, previousStrict, paramSet;

        expectKeyword('function');

        if (!match('(')) {
            token = lookahead();
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    // 14 Program

    function parseSourceElement() {
        var token = lookahead();

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'const':
            case 'let':
                return parseConstLetDeclaration(token.value);
            case 'function':
                return parseFunctionDeclaration();
            default:
                return parseStatement();
            }
        }

        if (token.type !== Token.EOF) {
            return parseStatement();
        }
    }

    function parseSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        while (index < length) {
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }
        return sourceElements;
    }

    function parseProgram() {
        var program;
        strict = false;
        program = {
            type: Syntax.Program,
            body: parseSourceElements()
        };
        return program;
    }

    // The following functions are needed only when the option to preserve
    // the comments is active.

    function addComment(type, value, start, end, loc) {
        assert(typeof start === 'number', 'Comment must have valid position');

        // Because the way the actual token is scanned, often the comments
        // (if any) are skipped twice during the lexical analysis.
        // Thus, we need to skip adding a comment if the comment array already
        // handled it.
        if (extra.comments.length > 0) {
            if (extra.comments[extra.comments.length - 1].range[1] > start) {
                return;
            }
        }

        extra.comments.push({
            type: type,
            value: value,
            range: [start, end],
            loc: loc
        });
    }

    function scanComment() {
        var comment, ch, loc, start, blockComment, lineComment;

        comment = '';
        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart - 1
                    };
                    lineComment = false;
                    addComment('Line', comment, start, index - 1, loc);
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                    comment = '';
                } else if (index >= length) {
                    lineComment = false;
                    comment += ch;
                    loc.end = {
                        line: lineNumber,
                        column: length - lineStart
                    };
                    addComment('Line', comment, start, length, loc);
                } else {
                    comment += ch;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                        comment += '\r\n';
                    } else {
                        comment += ch;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    comment += ch;
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            comment = comment.substr(0, comment.length - 1);
                            blockComment = false;
                            ++index;
                            loc.end = {
                                line: lineNumber,
                                column: index - lineStart
                            };
                            addComment('Block', comment, start, index, loc);
                            comment = '';
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart
                        }
                    };
                    start = index;
                    index += 2;
                    lineComment = true;
                    if (index >= length) {
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        lineComment = false;
                        addComment('Line', comment, start, index, loc);
                    }
                } else if (ch === '*') {
                    start = index;
                    index += 2;
                    blockComment = true;
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart - 2
                        }
                    };
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function filterCommentLocation() {
        var i, entry, comment, comments = [];

        for (i = 0; i < extra.comments.length; ++i) {
            entry = extra.comments[i];
            comment = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                comment.range = entry.range;
            }
            if (extra.loc) {
                comment.loc = entry.loc;
            }
            comments.push(comment);
        }

        extra.comments = comments;
    }

    function collectToken() {
        var start, loc, token, range, value;

        skipComment();
        start = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        token = extra.advance();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        if (token.type !== Token.EOF) {
            range = [token.range[0], token.range[1]];
            value = sliceSource(token.range[0], token.range[1]);
            extra.tokens.push({
                type: TokenName[token.type],
                value: value,
                range: range,
                loc: loc
            });
        }

        return token;
    }

    function collectRegex() {
        var pos, loc, regex, token;

        skipComment();

        pos = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        regex = extra.scanRegExp();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        // Pop the previous token, which is likely '/' or '/='
        if (extra.tokens.length > 0) {
            token = extra.tokens[extra.tokens.length - 1];
            if (token.range[0] === pos && token.type === 'Punctuator') {
                if (token.value === '/' || token.value === '/=') {
                    extra.tokens.pop();
                }
            }
        }

        extra.tokens.push({
            type: 'RegularExpression',
            value: regex.literal,
            range: [pos, index],
            loc: loc
        });

        return regex;
    }

    function filterTokenLocation() {
        var i, entry, token, tokens = [];

        for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                token.range = entry.range;
            }
            if (extra.loc) {
                token.loc = entry.loc;
            }
            tokens.push(token);
        }

        extra.tokens = tokens;
    }

    function createLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value
        };
    }

    function createRawLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value,
            raw: sliceSource(token.range[0], token.range[1])
        };
    }

    function createLocationMarker() {
        var marker = {};

        marker.range = [index, index];
        marker.loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            },
            end: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        marker.end = function () {
            this.range[1] = index;
            this.loc.end.line = lineNumber;
            this.loc.end.column = index - lineStart;
        };

        marker.applyGroup = function (node) {
            if (extra.range) {
                node.groupRange = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.groupLoc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        marker.apply = function (node) {
            if (extra.range) {
                node.range = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.loc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        return marker;
    }

    function trackGroupExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();
        expect('(');

        expr = parseExpression();

        expect(')');

        marker.end();
        marker.applyGroup(expr);

        return expr;
    }

    function trackLeftHandSideExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function trackLeftHandSideExpressionAllowCall() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
                marker.end();
                marker.apply(expr);
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function filterGroup(node) {
        var n, i, entry;

        n = (Object.prototype.toString.apply(node) === '[object Array]') ? [] : {};
        for (i in node) {
            if (node.hasOwnProperty(i) && i !== 'groupRange' && i !== 'groupLoc') {
                entry = node[i];
                if (entry === null || typeof entry !== 'object' || entry instanceof RegExp) {
                    n[i] = entry;
                } else {
                    n[i] = filterGroup(entry);
                }
            }
        }
        return n;
    }

    function wrapTrackingFunction(range, loc) {

        return function (parseFunction) {

            function isBinary(node) {
                return node.type === Syntax.LogicalExpression ||
                    node.type === Syntax.BinaryExpression;
            }

            function visit(node) {
                var start, end;

                if (isBinary(node.left)) {
                    visit(node.left);
                }
                if (isBinary(node.right)) {
                    visit(node.right);
                }

                if (range) {
                    if (node.left.groupRange || node.right.groupRange) {
                        start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                        end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                        node.range = [start, end];
                    } else if (typeof node.range === 'undefined') {
                        start = node.left.range[0];
                        end = node.right.range[1];
                        node.range = [start, end];
                    }
                }
                if (loc) {
                    if (node.left.groupLoc || node.right.groupLoc) {
                        start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                        end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                        node.loc = {
                            start: start,
                            end: end
                        };
                    } else if (typeof node.loc === 'undefined') {
                        node.loc = {
                            start: node.left.loc.start,
                            end: node.right.loc.end
                        };
                    }
                }
            }

            return function () {
                var marker, node;

                skipComment();

                marker = createLocationMarker();
                node = parseFunction.apply(null, arguments);
                marker.end();

                if (range && typeof node.range === 'undefined') {
                    marker.apply(node);
                }

                if (loc && typeof node.loc === 'undefined') {
                    marker.apply(node);
                }

                if (isBinary(node)) {
                    visit(node);
                }

                return node;
            };
        };
    }

    function patch() {

        var wrapTracking;

        if (extra.comments) {
            extra.skipComment = skipComment;
            skipComment = scanComment;
        }

        if (extra.raw) {
            extra.createLiteral = createLiteral;
            createLiteral = createRawLiteral;
        }

        if (extra.range || extra.loc) {

            extra.parseGroupExpression = parseGroupExpression;
            extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
            extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
            parseGroupExpression = trackGroupExpression;
            parseLeftHandSideExpression = trackLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;

            wrapTracking = wrapTrackingFunction(extra.range, extra.loc);

            extra.parseAdditiveExpression = parseAdditiveExpression;
            extra.parseAssignmentExpression = parseAssignmentExpression;
            extra.parseBitwiseANDExpression = parseBitwiseANDExpression;
            extra.parseBitwiseORExpression = parseBitwiseORExpression;
            extra.parseBitwiseXORExpression = parseBitwiseXORExpression;
            extra.parseBlock = parseBlock;
            extra.parseFunctionSourceElements = parseFunctionSourceElements;
            extra.parseCatchClause = parseCatchClause;
            extra.parseComputedMember = parseComputedMember;
            extra.parseConditionalExpression = parseConditionalExpression;
            extra.parseConstLetDeclaration = parseConstLetDeclaration;
            extra.parseEqualityExpression = parseEqualityExpression;
            extra.parseExpression = parseExpression;
            extra.parseForVariableDeclaration = parseForVariableDeclaration;
            extra.parseFunctionDeclaration = parseFunctionDeclaration;
            extra.parseFunctionExpression = parseFunctionExpression;
            extra.parseLogicalANDExpression = parseLogicalANDExpression;
            extra.parseLogicalORExpression = parseLogicalORExpression;
            extra.parseMultiplicativeExpression = parseMultiplicativeExpression;
            extra.parseNewExpression = parseNewExpression;
            extra.parseNonComputedProperty = parseNonComputedProperty;
            extra.parseObjectProperty = parseObjectProperty;
            extra.parseObjectPropertyKey = parseObjectPropertyKey;
            extra.parsePostfixExpression = parsePostfixExpression;
            extra.parsePrimaryExpression = parsePrimaryExpression;
            extra.parseProgram = parseProgram;
            extra.parsePropertyFunction = parsePropertyFunction;
            extra.parseRelationalExpression = parseRelationalExpression;
            extra.parseStatement = parseStatement;
            extra.parseShiftExpression = parseShiftExpression;
            extra.parseSwitchCase = parseSwitchCase;
            extra.parseUnaryExpression = parseUnaryExpression;
            extra.parseVariableDeclaration = parseVariableDeclaration;
            extra.parseVariableIdentifier = parseVariableIdentifier;

            parseAdditiveExpression = wrapTracking(extra.parseAdditiveExpression);
            parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
            parseBitwiseANDExpression = wrapTracking(extra.parseBitwiseANDExpression);
            parseBitwiseORExpression = wrapTracking(extra.parseBitwiseORExpression);
            parseBitwiseXORExpression = wrapTracking(extra.parseBitwiseXORExpression);
            parseBlock = wrapTracking(extra.parseBlock);
            parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
            parseCatchClause = wrapTracking(extra.parseCatchClause);
            parseComputedMember = wrapTracking(extra.parseComputedMember);
            parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
            parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
            parseEqualityExpression = wrapTracking(extra.parseEqualityExpression);
            parseExpression = wrapTracking(extra.parseExpression);
            parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
            parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
            parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
            parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
            parseLogicalANDExpression = wrapTracking(extra.parseLogicalANDExpression);
            parseLogicalORExpression = wrapTracking(extra.parseLogicalORExpression);
            parseMultiplicativeExpression = wrapTracking(extra.parseMultiplicativeExpression);
            parseNewExpression = wrapTracking(extra.parseNewExpression);
            parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
            parseObjectProperty = wrapTracking(extra.parseObjectProperty);
            parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
            parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
            parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
            parseProgram = wrapTracking(extra.parseProgram);
            parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
            parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
            parseStatement = wrapTracking(extra.parseStatement);
            parseShiftExpression = wrapTracking(extra.parseShiftExpression);
            parseSwitchCase = wrapTracking(extra.parseSwitchCase);
            parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
            parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
            parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
        }

        if (typeof extra.tokens !== 'undefined') {
            extra.advance = advance;
            extra.scanRegExp = scanRegExp;

            advance = collectToken;
            scanRegExp = collectRegex;
        }
    }

    function unpatch() {
        if (typeof extra.skipComment === 'function') {
            skipComment = extra.skipComment;
        }

        if (extra.raw) {
            createLiteral = extra.createLiteral;
        }

        if (extra.range || extra.loc) {
            parseAdditiveExpression = extra.parseAdditiveExpression;
            parseAssignmentExpression = extra.parseAssignmentExpression;
            parseBitwiseANDExpression = extra.parseBitwiseANDExpression;
            parseBitwiseORExpression = extra.parseBitwiseORExpression;
            parseBitwiseXORExpression = extra.parseBitwiseXORExpression;
            parseBlock = extra.parseBlock;
            parseFunctionSourceElements = extra.parseFunctionSourceElements;
            parseCatchClause = extra.parseCatchClause;
            parseComputedMember = extra.parseComputedMember;
            parseConditionalExpression = extra.parseConditionalExpression;
            parseConstLetDeclaration = extra.parseConstLetDeclaration;
            parseEqualityExpression = extra.parseEqualityExpression;
            parseExpression = extra.parseExpression;
            parseForVariableDeclaration = extra.parseForVariableDeclaration;
            parseFunctionDeclaration = extra.parseFunctionDeclaration;
            parseFunctionExpression = extra.parseFunctionExpression;
            parseGroupExpression = extra.parseGroupExpression;
            parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
            parseLogicalANDExpression = extra.parseLogicalANDExpression;
            parseLogicalORExpression = extra.parseLogicalORExpression;
            parseMultiplicativeExpression = extra.parseMultiplicativeExpression;
            parseNewExpression = extra.parseNewExpression;
            parseNonComputedProperty = extra.parseNonComputedProperty;
            parseObjectProperty = extra.parseObjectProperty;
            parseObjectPropertyKey = extra.parseObjectPropertyKey;
            parsePrimaryExpression = extra.parsePrimaryExpression;
            parsePostfixExpression = extra.parsePostfixExpression;
            parseProgram = extra.parseProgram;
            parsePropertyFunction = extra.parsePropertyFunction;
            parseRelationalExpression = extra.parseRelationalExpression;
            parseStatement = extra.parseStatement;
            parseShiftExpression = extra.parseShiftExpression;
            parseSwitchCase = extra.parseSwitchCase;
            parseUnaryExpression = extra.parseUnaryExpression;
            parseVariableDeclaration = extra.parseVariableDeclaration;
            parseVariableIdentifier = extra.parseVariableIdentifier;
        }

        if (typeof extra.scanRegExp === 'function') {
            advance = extra.advance;
            scanRegExp = extra.scanRegExp;
        }
    }

    function stringToArray(str) {
        var length = str.length,
            result = [],
            i;
        for (i = 0; i < length; ++i) {
            result[i] = str.charAt(i);
        }
        return result;
    }

    function parse(code, options) {
        var program, toString;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        buffer = null;
        state = {
            allowIn: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false
        };

        extra = {};
        if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.raw = (typeof options.raw === 'boolean') && options.raw;
            if (typeof options.tokens === 'boolean' && options.tokens) {
                extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
                extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                extra.errors = [];
            }
        }

        if (length > 0) {
            if (typeof source[0] === 'undefined') {
                // Try first to convert to a string. This is good as fast path
                // for old IE which understands string indexing for string
                // literals only and not for string object.
                if (code instanceof String) {
                    source = code.valueOf();
                }

                // Force accessing the characters via an array.
                if (typeof source[0] === 'undefined') {
                    source = stringToArray(code);
                }
            }
        }

        patch();
        try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
                filterCommentLocation();
                program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
                filterTokenLocation();
                program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
                program.errors = extra.errors;
            }
            if (extra.range || extra.loc) {
                program.body = filterGroup(program.body);
            }
        } catch (e) {
            throw e;
        } finally {
            unpatch();
            extra = {};
        }

        return program;
    }

    // Sync with package.json.
    exports.version = '1.0.4';

    exports.parse = parse;

    // Deep copy.
    exports.Syntax = (function () {
        var name, types = {};

        if (typeof Object.create === 'function') {
            types = Object.create(null);
        }

        for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                types[name] = Syntax[name];
            }
        }

        if (typeof Object.freeze === 'function') {
            Object.freeze(types);
        }

        return types;
    }());

}));
/* vim: set sw=4 ts=4 et tw=80 : */

}).call(this,require("ngpmcQ"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\esrefactor\\node_modules\\esprima\\esprima.js","/..\\..\\node_modules\\esrefactor\\node_modules\\esprima")
},{"buffer":6,"ngpmcQ":9}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global exports:true, define:true, window:true */
(function (factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((window.estraverse = {}));
    }
}(function (exports) {
    'use strict';

    var Syntax,
        isArray,
        VisitorOption,
        VisitorKeys,
        wrappers;

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    isArray = Array.isArray;
    if (!isArray) {
        isArray = function isArray(array) {
            return Object.prototype.toString.call(array) === '[object Array]';
        };
    }

    VisitorKeys = {
        AssignmentExpression: ['left', 'right'],
        ArrayExpression: ['elements'],
        BlockStatement: ['body'],
        BinaryExpression: ['left', 'right'],
        BreakStatement: ['label'],
        CallExpression: ['callee', 'arguments'],
        CatchClause: ['param', 'body'],
        ConditionalExpression: ['test', 'consequent', 'alternate'],
        ContinueStatement: ['label'],
        DebuggerStatement: [],
        DirectiveStatement: [],
        DoWhileStatement: ['body', 'test'],
        EmptyStatement: [],
        ExpressionStatement: ['expression'],
        ForStatement: ['init', 'test', 'update', 'body'],
        ForInStatement: ['left', 'right', 'body'],
        FunctionDeclaration: ['id', 'params', 'body'],
        FunctionExpression: ['id', 'params', 'body'],
        Identifier: [],
        IfStatement: ['test', 'consequent', 'alternate'],
        Literal: [],
        LabeledStatement: ['label', 'body'],
        LogicalExpression: ['left', 'right'],
        MemberExpression: ['object', 'property'],
        NewExpression: ['callee', 'arguments'],
        ObjectExpression: ['properties'],
        Program: ['body'],
        Property: ['key', 'value'],
        ReturnStatement: ['argument'],
        SequenceExpression: ['expressions'],
        SwitchStatement: ['discriminant', 'cases'],
        SwitchCase: ['test', 'consequent'],
        ThisExpression: [],
        ThrowStatement: ['argument'],
        TryStatement: ['block', 'handlers', 'finalizer'],
        UnaryExpression: ['argument'],
        UpdateExpression: ['argument'],
        VariableDeclaration: ['declarations'],
        VariableDeclarator: ['id', 'init'],
        WhileStatement: ['test', 'body'],
        WithStatement: ['object', 'body']
    };

    VisitorOption = {
        Break: 1,
        Skip: 2
    };

    wrappers = {
        PropertyWrapper: 'Property'
    };

    function traverse(top, visitor) {
        var worklist, leavelist, node, nodeType, ret, current, current2, candidates, candidate, marker = {};

        worklist = [ top ];
        leavelist = [ null ];

        while (worklist.length) {
            node = worklist.pop();
            nodeType = node.type;

            if (node === marker) {
                node = leavelist.pop();
                if (visitor.leave) {
                    ret = visitor.leave(node, leavelist[leavelist.length - 1]);
                } else {
                    ret = undefined;
                }
                if (ret === VisitorOption.Break) {
                    return;
                }
            } else if (node) {
                if (wrappers.hasOwnProperty(nodeType)) {
                    node = node.node;
                    nodeType = wrappers[nodeType];
                }

                if (visitor.enter) {
                    ret = visitor.enter(node, leavelist[leavelist.length - 1]);
                } else {
                    ret = undefined;
                }

                if (ret === VisitorOption.Break) {
                    return;
                }

                worklist.push(marker);
                leavelist.push(node);

                if (ret !== VisitorOption.Skip) {
                    candidates = VisitorKeys[nodeType];
                    current = candidates.length;
                    while ((current -= 1) >= 0) {
                        candidate = node[candidates[current]];
                        if (candidate) {
                            if (isArray(candidate)) {
                                current2 = candidate.length;
                                while ((current2 -= 1) >= 0) {
                                    if (candidate[current2]) {
                                        if(nodeType === Syntax.ObjectExpression && 'properties' === candidates[current] && null == candidates[current].type) {
                                            worklist.push({type: 'PropertyWrapper', node: candidate[current2]});
                                        } else {
                                            worklist.push(candidate[current2]);
                                        }
                                    }
                                }
                            } else {
                                worklist.push(candidate);
                            }
                        }
                    }
                }
            }
        }
    }

    function replace(top, visitor) {
        var worklist, leavelist, node, nodeType, target, tuple, ret, current, current2, candidates, candidate, marker = {}, result;

        result = {
            top: top
        };

        tuple = [ top, result, 'top' ];
        worklist = [ tuple ];
        leavelist = [ tuple ];

        function notify(v) {
            ret = v;
        }

        while (worklist.length) {
            tuple = worklist.pop();

            if (tuple === marker) {
                tuple = leavelist.pop();
                ret = undefined;
                if (visitor.leave) {
                    node = tuple[0];
                    target = visitor.leave(tuple[0], leavelist[leavelist.length - 1][0], notify);
                    if (target !== undefined) {
                        node = target;
                    }
                    tuple[1][tuple[2]] = node;
                }
                if (ret === VisitorOption.Break) {
                    return result.top;
                }
            } else if (tuple[0]) {
                ret = undefined;
                node = tuple[0];

                nodeType = node.type;
                if (wrappers.hasOwnProperty(nodeType)) {
                    tuple[0] = node = node.node;
                    nodeType = wrappers[nodeType];
                }

                if (visitor.enter) {
                    target = visitor.enter(tuple[0], leavelist[leavelist.length - 1][0], notify);
                    if (target !== undefined) {
                        node = target;
                    }
                    tuple[1][tuple[2]] = node;
                    tuple[0] = node;
                }

                if (ret === VisitorOption.Break) {
                    return result.top;
                }

                if (tuple[0]) {
                    worklist.push(marker);
                    leavelist.push(tuple);

                    if (ret !== VisitorOption.Skip) {
                        candidates = VisitorKeys[nodeType];
                        current = candidates.length;
                        while ((current -= 1) >= 0) {
                            candidate = node[candidates[current]];
                            if (candidate) {
                                if (isArray(candidate)) {
                                    current2 = candidate.length;
                                    while ((current2 -= 1) >= 0) {
                                        if (candidate[current2]) {
                                            if(nodeType === Syntax.ObjectExpression && 'properties' === candidates[current] && null == candidates[current].type) {
                                                worklist.push([{type: 'PropertyWrapper', node: candidate[current2]}, candidate, current2]);
                                            } else {
                                                worklist.push([candidate[current2], candidate, current2]);
                                            }
                                        }
                                    }
                                } else {
                                    worklist.push([candidate, node, candidates[current]]);
                                }
                            }
                        }
                    }
                }
            }
        }

        return result.top;
    }

    exports.version = '0.0.4';
    exports.Syntax = Syntax;
    exports.traverse = traverse;
    exports.replace = replace;
    exports.VisitorKeys = VisitorKeys;
    exports.VisitorOption = VisitorOption;
}));
/* vim: set sw=4 ts=4 et tw=80 : */

}).call(this,require("ngpmcQ"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\esrefactor\\node_modules\\estraverse\\estraverse.js","/..\\..\\node_modules\\esrefactor\\node_modules\\estraverse")
},{"buffer":6,"ngpmcQ":9}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("ngpmcQ"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\index.js","/..\\..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer")
},{"base64-js":7,"buffer":6,"ieee754":8,"ngpmcQ":9}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("ngpmcQ"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\node_modules\\base64-js\\lib\\b64.js","/..\\..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\node_modules\\base64-js\\lib")
},{"buffer":6,"ngpmcQ":9}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require("ngpmcQ"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\node_modules\\ieee754\\index.js","/..\\..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\node_modules\\ieee754")
},{"buffer":6,"ngpmcQ":9}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("ngpmcQ"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\process\\browser.js","/..\\..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\process")
},{"buffer":6,"ngpmcQ":9}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImQ6XFxkZXZcXHByb2plY3RzXFx2YWxpZGF0ZS1kc2xcXG5vZGVfbW9kdWxlc1xcZ3VscC1icm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsImQ6L2Rldi9wcm9qZWN0cy92YWxpZGF0ZS1kc2wvYnJvd3NlcmlmeS9lc3JlZmFjdG9yL2Zha2VfZjczMDE2MDAuanMiLCJkOi9kZXYvcHJvamVjdHMvdmFsaWRhdGUtZHNsL25vZGVfbW9kdWxlcy9lc3JlZmFjdG9yL2xpYi9lc3JlZmFjdG9yLmpzIiwiZDovZGV2L3Byb2plY3RzL3ZhbGlkYXRlLWRzbC9ub2RlX21vZHVsZXMvZXNyZWZhY3Rvci9ub2RlX21vZHVsZXMvZXNjb3BlL2VzY29wZS5qcyIsImQ6L2Rldi9wcm9qZWN0cy92YWxpZGF0ZS1kc2wvbm9kZV9tb2R1bGVzL2VzcmVmYWN0b3Ivbm9kZV9tb2R1bGVzL2VzcHJpbWEvZXNwcmltYS5qcyIsImQ6L2Rldi9wcm9qZWN0cy92YWxpZGF0ZS1kc2wvbm9kZV9tb2R1bGVzL2VzcmVmYWN0b3Ivbm9kZV9tb2R1bGVzL2VzdHJhdmVyc2UvZXN0cmF2ZXJzZS5qcyIsImQ6L2Rldi9wcm9qZWN0cy92YWxpZGF0ZS1kc2wvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiZDovZGV2L3Byb2plY3RzL3ZhbGlkYXRlLWRzbC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiZDovZGV2L3Byb2plY3RzL3ZhbGlkYXRlLWRzbC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJkOi9kZXYvcHJvamVjdHMvdmFsaWRhdGUtZHNsL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDLzBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3QwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8vIHdpbmRvdy5lc3JlZmFjdG9yID0gcmVxdWlyZShcImVzcmVmYWN0b3JcIik7XHJcbi8vIGNvbnNvbGUubG9nKFwiZXNyZWZhY3RvclwiLCB3aW5kb3cuZXNyZWZhY3Rvcik7XHJcblxyXG5hbmd1bGFyLm1vZHVsZSgndmFsaWRhdGVEc2wnKS5zZXJ2aWNlKCdlc3JlZmFjdG9yJywgZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHJlcXVpcmUoXCJlc3JlZmFjdG9yXCIpO1xyXG59KTtcclxuXHJcbi8vIHZhciBjb2RlID0gXCJjb25zb2xlLmxvZyh4KTsgeCgpXCI7XHJcblxyXG4vLyB2YXIgY3R4ID0gbmV3IGVzcmVmYWN0b3IuQ29udGV4dChjb2RlKTtcclxuXHJcbi8vIHZhciBpZCA9IGN0eC5pZGVudGlmeSgxMik7XHJcblxyXG4vLyBjb25zb2xlLmxvZyhjdHgucmVuYW1lKGlkLCBcIlJ1bGVzLnhcIikpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJuZ3BtY1FcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9mYWtlX2Y3MzAxNjAwLmpzXCIsXCIvXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLypcbiAgQ29weXJpZ2h0IChDKSAyMDEzIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgQXJpeWEgSGlkYXlhdCA8YXJpeWEuaGlkYXlhdEBnbWFpbC5jb20+XG5cbiAgUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0XG4gIG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICAgICogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGVcbiAgICAgIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG5cbiAgVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTIElTXCJcbiAgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRVxuICBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuICBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgPENPUFlSSUdIVCBIT0xERVI+IEJFIExJQUJMRSBGT1IgQU5ZXG4gIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTXG4gIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUztcbiAgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EXG4gIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUXG4gIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuICBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuKi9cblxuLypnbG9iYWwgZXNwcmltYTp0cnVlLCBlc3RyYXZlcnNlOnRydWUsIGVzY29wZTogdHJ1ZSxcbiBkZWZpbmU6dHJ1ZSwgcmVxdWlyZTp0cnVlLCBleHBvcnRzOnRydWUgKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uIChVTUQpIHRvIHN1cHBvcnQgQU1ELCBDb21tb25KUy9Ob2RlLmpzLFxuICAgIC8vIFJoaW5vLCBhbmQgcGxhaW4gYnJvd3NlciBsb2FkaW5nLlxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKCdlc3JlZmFjdG9yJywgWydleHBvcnRzJywgJ2VzcHJpbWEnLCAnZXN0cmF2ZXJzZScsICdlc2NvcGUnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzLCByZXF1aXJlKCdlc3ByaW1hJyksIHJlcXVpcmUoJ2VzdHJhdmVyc2UnKSwgcmVxdWlyZSgnZXNjb3BlJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnkoKHJvb3QuZXNyZWZhY3RvciA9IHt9KSwgZXNwcmltYSwgZXN0cmF2ZXJzZSwgZXNjb3BlKTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uIChleHBvcnRzLCBlc3ByaW1hLCBlc3RyYXZlcnNlLCBlc2NvcGUpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBDb250ZXh0KGNvZGUpIHtcbiAgICAgICAgdGhpcy5fY29kZSA9IG51bGw7XG4gICAgICAgIHRoaXMuX3N5bnRheCA9IG51bGw7XG4gICAgICAgIHRoaXMuX3Njb3BlTWFuYWdlciA9IG51bGw7XG4gICAgICAgIGlmIChjb2RlKSB7XG4gICAgICAgICAgICB0aGlzLnNldENvZGUoY29kZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBDb250ZXh0LnByb3RvdHlwZS5zZXRDb2RlID0gZnVuY3Rpb24gKGNvZGUpIHtcbiAgICAgICAgdGhpcy5fY29kZSA9IG51bGw7XG4gICAgICAgIHRoaXMuX3N5bnRheCA9IG51bGw7XG4gICAgICAgIHRoaXMuX3Njb3BlTWFuYWdlciA9IG51bGw7XG4gICAgICAgIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRoaXMuX2NvZGUgPSBjb2RlO1xuICAgICAgICAgICAgdGhpcy5fc3ludGF4ID0gZXNwcmltYS5wYXJzZShjb2RlLCB7IHJhbmdlOiB0cnVlIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb2RlID09PSAnb2JqZWN0JyAmJiBjb2RlLnR5cGUgPT09ICdQcm9ncmFtJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb2RlLnJhbmdlICE9PSAnb2JqZWN0JyB8fCBjb2RlLnJhbmdlLmxlbmd0aCAhPT0gMikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZXNyZWZhY3Rvci5Db250ZXh0IG9ubHkgYWNjZXB0cyBhIHN5bnRheCB0cmVlIHdpdGggcmFuZ2UgaW5mb3JtYXRpb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX3N5bnRheCA9IGNvZGU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc2NvcGVNYW5hZ2VyID0gZXNjb3BlLmFuYWx5emUodGhpcy5fc3ludGF4KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gbG9jYXRlRGVjbGFyYXRpb24ocmVmKSB7XG4gICAgICAgIHZhciBub2RlLCBzY29wZSwgaSwgdjtcblxuICAgICAgICBpZiAocmVmLnJlc29sdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVmLnJlc29sdmVkLmRlZnNbcmVmLnJlc29sdmVkLmRlZnMubGVuZ3RoIC0gMV0ubmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNjb3BlID0gcmVmLmZyb207XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBzY29wZS52YXJpYWJsZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICB2ID0gc2NvcGUudmFyaWFibGVzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh2Lm5hbWUgPT09IHJlZi5pZGVudGlmaWVyLm5hbWUgJiYgdi5kZWZzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdi5kZWZzW3YuZGVmcy5sZW5ndGggLSAxXS5uYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjb3BlID0gc2NvcGUudXBwZXI7XG4gICAgICAgIH0gd2hpbGUgKHNjb3BlKTtcblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBHaXZlbiB0aGUgc2NvcGUsIGxvb2sgdXAgdGhlIHJlZmVyZW5jZSB3aGljaCBjb3JyZXNwb25kcyB0byB0aGUgaWRlbnRpZmllclxuICAgIC8vIGluIHRoZSBzcGVjaWZpZWQgY3Vyc29yIHBvc2l0aW9uLiBJZiBwb3NzaWJsZSwgZmluZCBhbHNvIHRoZSBjb3JyZXNwb25kaW5nXG4gICAgLy8gZGVjbGFyYXRpb24gZm9yIHRoYXQgcmVmZXJlbmNlLlxuXG4gICAgQ29udGV4dC5wcm90b3R5cGUuX2xvb2t1cCA9IGZ1bmN0aW9uIChzY29wZSwgaWRlbnRpZmllcikge1xuICAgICAgICB2YXIgaSwgaiwgcmVmO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBzY29wZS5yZWZlcmVuY2VzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICByZWYgPSBzY29wZS5yZWZlcmVuY2VzW2ldO1xuICAgICAgICAgICAgaWYgKHJlZi5pZGVudGlmaWVyID09PSBpZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgZGVjbGFyYXRpb246IGxvY2F0ZURlY2xhcmF0aW9uKHJlZilcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHNjb3BlLnZhcmlhYmxlU2NvcGUudmFyaWFibGVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICByZWYgPSBzY29wZS52YXJpYWJsZVNjb3BlLnZhcmlhYmxlc1tpXTtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCByZWYuaWRlbnRpZmllcnMubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICAgICAgICBpZiAocmVmLmlkZW50aWZpZXJzW2pdID09PSBpZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVjbGFyYXRpb246IGlkZW50aWZpZXJcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICAvLyBHaXZlbiB0aGUgY3Vyc29yIHBvc2l0aW9uLCBsb2NhdGUgdGhlIGlkZW50aWZpZXIgaW4gdGhhdCBwb3NpdGlvbi5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyBpZGVudGlmaWVyIGluIHRoYXQgcG9zaXRpb24sIHVuZGVmaW5lZCB3aWxsIGJlIHJldHVybmVkLlxuICAgIC8vXG4gICAgLy8gVGhlIHJldHVybmVkIG9iamVjdCB3aWxsIGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0eTpcbiAgICAvLyAgICBpZGVudGlmaWVyOiB0aGUgc3ludGF4IG5vZGUgYXNzb2NpYXRlZCB3aXRoIHRoZSBpZGVudGlmaWVyXG4gICAgLy8gICBkZWNsYXJhdGlvbjogdGhlIHN5bnRheCBub2RlIHdoZXJlIHRoZSBpZGVudGlmaWVyIGlzIGRlY2xhcmVkXG4gICAgLy8gICAgcmVmZXJlbmNlczogYW4gYXJyYXkgb2YgdGhlIHJlZmVyZW5jZXMgb2YgdGhlIGlkZW50aWZpZXJcbiAgICAvL1xuICAgIC8vIE5vdGUgdGhhdCB0aGUgcmVmZXJlbmNlcyBhcnJheSBhbHNvIGluY2x1ZGVzIHRoZSBpZGVudGlmaWVyIGJ1dCBpdFxuICAgIC8vIGRvZXMgZXhjbHVkZSB0aGUgZGVjbGFyYXRpb24uXG4gICAgLy9cbiAgICAvLyBFeGFtcGxlOlxuICAgIC8vICAgICB2YXIgY3R4ID0gbmV3IGVzcmVmYWN0b3IuQ29udGV4dCgndmFyIHg7IHg7IHggPSA0MicpO1xuICAgIC8vICAgICB2YXIgaWQgPSBjdHguaWRlbnRpZnkoMTApO1xuICAgIC8vXG4gICAgLy8gIGlkIHdpbGwgaGF2ZSB0aGUgdmFsdWUgb2Y6XG4gICAgLy8gICAgICB7XG4gICAgLy8gICAgICAgIGlkZW50aWZpZXI6IHtcbiAgICAvLyAgICAgICAgICB0eXBlOiAnSWRlbnRpZmllcicsXG4gICAgLy8gICAgICAgICAgbmFtZTogJ3gnLFxuICAgIC8vICAgICAgICAgIHJhbmdlOiBbMTAsIDExXVxuICAgIC8vICAgICAgICB9LFxuICAgIC8vICAgICAgICBkZWNsYXJhdGlvbjoge1xuICAgIC8vICAgICAgICAgIHR5cGU6ICdJZGVudGlmaWVyJyxcbiAgICAvLyAgICAgICAgICBuYW1lOiAneCcsXG4gICAgLy8gICAgICAgICAgcmFuZ2U6IFs0LCA1XVxuICAgIC8vICAgICAgICB9LFxuICAgIC8vICAgICAgICByZWZlcmVuY2VzOiBbe1xuICAgIC8vICAgICAgICAgIHR5cGU6ICdJZGVudGlmaWVyJyxcbiAgICAvLyAgICAgICAgICBuYW1lOiAneCcsXG4gICAgLy8gICAgICAgICAgcmFuZ2U6IFs3LCA4XVxuICAgIC8vICAgICAgICB9LCB7XG4gICAgLy8gICAgICAgICAgdHlwZTogJ0lkZW50aWZpZXInLFxuICAgIC8vICAgICAgICAgIG5hbWU6ICd4JyxcbiAgICAvLyAgICAgICAgICByYW5nZTogWzEwLCAxMV1cbiAgICAvLyAgICAgICAgfV1cbiAgICAvLyAgICAgIH1cblxuICAgIENvbnRleHQucHJvdG90eXBlLmlkZW50aWZ5ID0gZnVuY3Rpb24gKHBvcykge1xuICAgICAgICB2YXIgaWRlbnRpZmllciwgc2NvcGVNYW5hZ2VyLCBsb29rdXAsIHJlc3VsdCwgc2NvcGU7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9zeW50YXgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGlkZW50aWZ5IGFueXRoaW5nIHdpdGhvdXQgYSBzeW50YXggdHJlZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fc2NvcGVNYW5hZ2VyKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBpZGVudGlmeSBhbnl0aGluZyB3aXRob3V0IGEgdmFsaWQgc2NvcGUgbWFuYWdlcicpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGVNYW5hZ2VyID0gdGhpcy5fc2NvcGVNYW5hZ2VyO1xuICAgICAgICBsb29rdXAgPSB0aGlzLl9sb29rdXA7XG5cbiAgICAgICAgc2NvcGVNYW5hZ2VyLmF0dGFjaCgpO1xuICAgICAgICBlc3RyYXZlcnNlLnRyYXZlcnNlKHRoaXMuX3N5bnRheCwge1xuICAgICAgICAgICAgZW50ZXI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUgPSBzY29wZU1hbmFnZXIuYWNxdWlyZShub2RlKSB8fCBzY29wZTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09PSBlc3ByaW1hLlN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnJhbmdlWzBdIDw9IHBvcyAmJiBub2RlLnJhbmdlWzFdID49IHBvcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllciA9IG5vZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXN0cmF2ZXJzZS5WaXNpdG9yT3B0aW9uLkJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlYXZlOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIHNjb3BlID0gc2NvcGVNYW5hZ2VyLnJlbGVhc2Uobm9kZSkgfHwgc2NvcGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBzY29wZU1hbmFnZXIuZGV0YWNoKCk7XG5cbiAgICAgICAgaWYgKCFpZGVudGlmaWVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQgPSBsb29rdXAoc2NvcGUsIGlkZW50aWZpZXIpO1xuXG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFNlYXJjaCBmb3IgYWxsIG90aGVyIGlkZW50aWNhbCByZWZlcmVuY2VzIChzYW1lIHNjb3BlKS5cbiAgICAgICAgICAgIHJlc3VsdC5yZWZlcmVuY2VzID0gW107XG4gICAgICAgICAgICBzY29wZU1hbmFnZXIuYXR0YWNoKCk7XG4gICAgICAgICAgICBlc3RyYXZlcnNlLnRyYXZlcnNlKHRoaXMuX3N5bnRheCwge1xuICAgICAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUsIGksIHJlZiwgZDtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUgPSBzY29wZU1hbmFnZXIuYWNxdWlyZShub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IChzY29wZSA/IHNjb3BlLnJlZmVyZW5jZXMubGVuZ3RoIDogMCk7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVmID0gc2NvcGUucmVmZXJlbmNlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWYuaWRlbnRpZmllci5uYW1lID09PSBpZGVudGlmaWVyLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkID0gbG9va3VwKHNjb3BlLCByZWYuaWRlbnRpZmllcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGQgJiYgZC5kZWNsYXJhdGlvbiA9PT0gcmVzdWx0LmRlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5yZWZlcmVuY2VzLnB1c2gocmVmLmlkZW50aWZpZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2NvcGVNYW5hZ2VyLmRldGFjaCgpO1xuICAgICAgICB9XG5cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICAvLyBSZW5hbWUgdGhlIGlkZW50aWZpZXIgYW5kIGl0cyByZWZlcmVuY2UgdG8gYSBuZXcgc3BlY2lmaWMgbmFtZS5cbiAgICAvLyBUaGUgcmV0dXJuIHZhbHVlIGlzIHRoZSBuZXcgY29kZSBhZnRlciB0aGUgaWRlbnRpZmllciBpcyByZW5hbWVkLlxuICAgIC8vXG4gICAgLy8gVGhpcyBmdW5jdGlvbnMgbmVlZHMgaWRlbnRpZmljYXRpb24sIHdoaWNoIGlzIG9idGFpbiB1c2luZyBpZGVudGlmeSgpIGZ1bmN0aW9uLlxuICAgIC8vXG4gICAgLy8gRXhhbXBsZTpcbiAgICAvLyAgIHZhciBjdHggPSBuZXcgZXNyZWZhY3Rvci5Db250ZXh0KCd2YXIgeDsgeCA9IDQyJyk7XG4gICAgLy8gICB2YXIgaWQgPSBjdHguaWRlbnRpZnkoNCk7XG4gICAgLy8gICB2YXIgY29kZSA9IGN0eC5yZW5hbWUoaWQsICd5Jyk7XG4gICAgLy9cbiAgICAvLyBjb2RlIHdpbGwgYmUgYHZhciB5OyB5ID0gNDInLlxuXG4gICAgQ29udGV4dC5wcm90b3R5cGUucmVuYW1lID0gZnVuY3Rpb24gKGlkZW50aWZpY2F0aW9uLCBuYW1lKSB7XG4gICAgICAgIHZhciByZXN1bHQsIGxpc3QsIHNldCwgaSwgaWQsIGVudHJ5O1xuXG4gICAgICAgIGlmICghdGhpcy5fY29kZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gcmVuYW1lIHdpdGhvdXQgdGhlIG9yaWdpbmFsIHNvdXJjZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0ID0gdGhpcy5fY29kZTtcbiAgICAgICAgaWYgKHR5cGVvZiBpZGVudGlmaWNhdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBsaXN0ID0gW2lkZW50aWZpY2F0aW9uLmlkZW50aWZpZXIucmFuZ2VdO1xuICAgICAgICBpZiAoaWRlbnRpZmljYXRpb24uZGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgIGxpc3QucHVzaChpZGVudGlmaWNhdGlvbi5kZWNsYXJhdGlvbi5yYW5nZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGlkZW50aWZpY2F0aW9uLnJlZmVyZW5jZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGxpc3QucHVzaChpZGVudGlmaWNhdGlvbi5yZWZlcmVuY2VzW2ldLnJhbmdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNvcnQgdGhlIHJlZmVyZW5jZXMgYmFzZWQgb24gdGhlIHBvc2l0aW9uIHRvIHByZXZlbnRcbiAgICAgICAgLy8gc2hpZnRpbmcgYWxsIHRoZSByYW5nZXMuXG4gICAgICAgIGxpc3Quc29ydChmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gYlswXSAtIGFbMF07IH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgZG91YmxlIHJlbmFtaW5nLCBnZXQgdGhlIHVuaXF1ZSBzZXQuXG4gICAgICAgIHNldCA9IFtdO1xuICAgICAgICBzZXQucHVzaChsaXN0WzBdKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChsaXN0W2ldWzBdICE9PSBsaXN0W2kgLSAxXVswXSkge1xuICAgICAgICAgICAgICAgIHNldC5wdXNoKGxpc3RbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWQgPSBpZGVudGlmaWNhdGlvbi5pZGVudGlmaWVyLm5hbWU7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBzZXQubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5zbGljZSgwLCBzZXRbaV1bMF0pICsgbmFtZSArIHJlc3VsdC5zbGljZShzZXRbaV1bMV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgZXhwb3J0cy5Db250ZXh0ID0gQ29udGV4dDtcbn0pKTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJuZ3BtY1FcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLlxcXFwuLlxcXFxub2RlX21vZHVsZXNcXFxcZXNyZWZhY3RvclxcXFxsaWJcXFxcZXNyZWZhY3Rvci5qc1wiLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxlc3JlZmFjdG9yXFxcXGxpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qXG4gIENvcHlyaWdodCAoQykgMjAxMi0yMDEzIFl1c3VrZSBTdXp1a2kgPHV0YXRhbmUudGVhQGdtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEzIEFsZXggU2V2aWxsZSA8aGlAYWxleGFuZGVyc2V2aWxsZS5jb20+XG5cbiAgUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0XG4gIG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICAgICogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGVcbiAgICAgIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG5cbiAgVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTIElTXCJcbiAgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRVxuICBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuICBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgPENPUFlSSUdIVCBIT0xERVI+IEJFIExJQUJMRSBGT1IgQU5ZXG4gIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTXG4gIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUztcbiAgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EXG4gIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUXG4gIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuICBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuKi9cblxuLypqc2xpbnQgYml0d2lzZTp0cnVlICovXG4vKmdsb2JhbCBleHBvcnRzOnRydWUsIGRlZmluZTp0cnVlLCByZXF1aXJlOnRydWUqL1xuKGZ1bmN0aW9uIChmYWN0b3J5LCBnbG9iYWwpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBuYW1lc3BhY2Uoc3RyLCBvYmopIHtcbiAgICAgICAgdmFyIGksIGl6LCBuYW1lcywgbmFtZTtcbiAgICAgICAgbmFtZXMgPSBzdHIuc3BsaXQoJy4nKTtcbiAgICAgICAgZm9yIChpID0gMCwgaXogPSBuYW1lcy5sZW5ndGg7IGkgPCBpejsgKytpKSB7XG4gICAgICAgICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgb2JqID0gb2JqW25hbWVdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvYmogPSAob2JqW25hbWVdID0ge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgLy8gVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uIChVTUQpIHRvIHN1cHBvcnQgQU1ELCBDb21tb25KUy9Ob2RlLmpzLFxuICAgIC8vIGFuZCBwbGFpbiBicm93c2VyIGxvYWRpbmcsXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoJ2VzY29wZScsIFsnZXhwb3J0cycsICdlc3RyYXZlcnNlJ10sIGZ1bmN0aW9uIChleHBvcnRzLCBlc3RyYXZlcnNlKSB7XG4gICAgICAgICAgICBmYWN0b3J5KGV4cG9ydHMsIGdsb2JhbCwgZXN0cmF2ZXJzZSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGZhY3RvcnkoZXhwb3J0cywgZ2xvYmFsLCByZXF1aXJlKCdlc3RyYXZlcnNlJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnkobmFtZXNwYWNlKCdlc2NvcGUnLCBnbG9iYWwpLCBnbG9iYWwsIGdsb2JhbC5lc3RyYXZlcnNlKTtcbiAgICB9XG59KGZ1bmN0aW9uIChleHBvcnRzLCBnbG9iYWwsIGVzdHJhdmVyc2UpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgU3ludGF4LFxuICAgICAgICBNYXAsXG4gICAgICAgIGN1cnJlbnRTY29wZSxcbiAgICAgICAgZ2xvYmFsU2NvcGUsXG4gICAgICAgIHNjb3BlcyxcbiAgICAgICAgb3B0aW9ucztcblxuICAgIFN5bnRheCA9IGVzdHJhdmVyc2UuU3ludGF4O1xuXG4gICAgaWYgKHR5cGVvZiBnbG9iYWwuTWFwICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBFUzYgTWFwXG4gICAgICAgIE1hcCA9IGdsb2JhbC5NYXA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgTWFwID0gZnVuY3Rpb24gTWFwKCkge1xuICAgICAgICAgICAgdGhpcy5fX2RhdGEgPSB7fTtcbiAgICAgICAgfTtcblxuICAgICAgICBNYXAucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIE1hcEdldChrZXkpIHtcbiAgICAgICAgICAgIGtleSA9ICckJyArIGtleTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9fZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19kYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIE1hcC5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24gTWFwSGFzKGtleSkge1xuICAgICAgICAgICAga2V5ID0gJyQnICsga2V5O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19kYXRhLmhhc093blByb3BlcnR5KGtleSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgTWFwLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBNYXBTZXQoa2V5LCB2YWwpIHtcbiAgICAgICAgICAgIGtleSA9ICckJyArIGtleTtcbiAgICAgICAgICAgIHRoaXMuX19kYXRhW2tleV0gPSB2YWw7XG4gICAgICAgIH07XG5cbiAgICAgICAgTWFwLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbiBNYXBEZWxldGUoa2V5KSB7XG4gICAgICAgICAgICBrZXkgPSAnJCcgKyBrZXk7XG4gICAgICAgICAgICByZXR1cm4gZGVsZXRlIHRoaXMuX19kYXRhW2tleV07XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXNzZXJ0KGNvbmQsIHRleHQpIHtcbiAgICAgICAgaWYgKCFjb25kKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWZhdWx0T3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wdGltaXN0aWM6IGZhbHNlLFxuICAgICAgICAgICAgZGlyZWN0aXZlOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVEZWVwbHkodGFyZ2V0LCBvdmVycmlkZSkge1xuICAgICAgICB2YXIga2V5LCB2YWw7XG5cbiAgICAgICAgZnVuY3Rpb24gaXNIYXNoT2JqZWN0KHRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB0YXJnZXQgPT09ICdvYmplY3QnICYmIHRhcmdldCBpbnN0YW5jZW9mIE9iamVjdCAmJiAhKHRhcmdldCBpbnN0YW5jZW9mIFJlZ0V4cCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGtleSBpbiBvdmVycmlkZSkge1xuICAgICAgICAgICAgaWYgKG92ZXJyaWRlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB2YWwgPSBvdmVycmlkZVtrZXldO1xuICAgICAgICAgICAgICAgIGlmIChpc0hhc2hPYmplY3QodmFsKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNIYXNoT2JqZWN0KHRhcmdldFtrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlRGVlcGx5KHRhcmdldFtrZXldLCB2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSB1cGRhdGVEZWVwbHkoe30sIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBSZWZlcmVuY2UoaWRlbnQsIHNjb3BlLCBmbGFnLCB3cml0ZUV4cHIsIG1heWJlSW1wbGljaXRHbG9iYWwpIHtcbiAgICAgICAgdGhpcy5pZGVudGlmaWVyID0gaWRlbnQ7XG4gICAgICAgIHRoaXMuZnJvbSA9IHNjb3BlO1xuICAgICAgICB0aGlzLnRhaW50ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5yZXNvbHZlZCA9IG51bGw7XG4gICAgICAgIHRoaXMuZmxhZyA9IGZsYWc7XG4gICAgICAgIGlmICh0aGlzLmlzV3JpdGUoKSkge1xuICAgICAgICAgICAgdGhpcy53cml0ZUV4cHIgPSB3cml0ZUV4cHI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fX21heWJlSW1wbGljaXRHbG9iYWwgPSBtYXliZUltcGxpY2l0R2xvYmFsO1xuICAgIH1cblxuICAgIFJlZmVyZW5jZS5SRUFEID0gMHgxO1xuICAgIFJlZmVyZW5jZS5XUklURSA9IDB4MjtcbiAgICBSZWZlcmVuY2UuUlcgPSAweDM7XG5cbiAgICBSZWZlcmVuY2UucHJvdG90eXBlLmlzU3RhdGljID0gZnVuY3Rpb24gaXNTdGF0aWMoKSB7XG4gICAgICAgIHJldHVybiAhdGhpcy50YWludGVkICYmIHRoaXMucmVzb2x2ZWQgJiYgdGhpcy5yZXNvbHZlZC5zY29wZS5pc1N0YXRpYygpO1xuICAgIH07XG5cbiAgICBSZWZlcmVuY2UucHJvdG90eXBlLmlzV3JpdGUgPSBmdW5jdGlvbiBpc1dyaXRlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mbGFnICYgUmVmZXJlbmNlLldSSVRFO1xuICAgIH07XG5cbiAgICBSZWZlcmVuY2UucHJvdG90eXBlLmlzUmVhZCA9IGZ1bmN0aW9uIGlzUmVhZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmxhZyAmIFJlZmVyZW5jZS5SRUFEO1xuICAgIH07XG5cbiAgICBSZWZlcmVuY2UucHJvdG90eXBlLmlzUmVhZE9ubHkgPSBmdW5jdGlvbiBpc1JlYWRPbmx5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mbGFnID09PSBSZWZlcmVuY2UuUkVBRDtcbiAgICB9O1xuXG4gICAgUmVmZXJlbmNlLnByb3RvdHlwZS5pc1dyaXRlT25seSA9IGZ1bmN0aW9uIGlzV3JpdGVPbmx5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mbGFnID09PSBSZWZlcmVuY2UuV1JJVEU7XG4gICAgfTtcblxuICAgIFJlZmVyZW5jZS5wcm90b3R5cGUuaXNSZWFkV3JpdGUgPSBmdW5jdGlvbiBpc1JlYWRXcml0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmxhZyA9PT0gUmVmZXJlbmNlLlJXO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBWYXJpYWJsZShuYW1lLCBzY29wZSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLmlkZW50aWZpZXJzID0gW107XG4gICAgICAgIHRoaXMucmVmZXJlbmNlcyA9IFtdO1xuXG4gICAgICAgIHRoaXMuZGVmcyA9IFtdO1xuXG4gICAgICAgIHRoaXMudGFpbnRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnN0YWNrID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zY29wZSA9IHNjb3BlO1xuICAgIH1cblxuICAgIFZhcmlhYmxlLkNhdGNoQ2xhdXNlID0gJ0NhdGNoQ2xhdXNlJztcbiAgICBWYXJpYWJsZS5QYXJhbWV0ZXIgPSAnUGFyYW1ldGVyJztcbiAgICBWYXJpYWJsZS5GdW5jdGlvbk5hbWUgPSAnRnVuY3Rpb25OYW1lJztcbiAgICBWYXJpYWJsZS5WYXJpYWJsZSA9ICdWYXJpYWJsZSc7XG4gICAgVmFyaWFibGUuSW1wbGljaXRHbG9iYWxWYXJpYWJsZSA9ICdJbXBsaWNpdEdsb2JhbFZhcmlhYmxlJztcblxuICAgIGZ1bmN0aW9uIGlzU3RyaWN0U2NvcGUoc2NvcGUsIGJsb2NrKSB7XG4gICAgICAgIHZhciBib2R5LCBpLCBpeiwgc3RtdCwgZXhwcjtcblxuICAgICAgICAvLyBXaGVuIHVwcGVyIHNjb3BlIGlzIGV4aXN0cyBhbmQgc3RyaWN0LCBpbm5lciBzY29wZSBpcyBhbHNvIHN0cmljdC5cbiAgICAgICAgaWYgKHNjb3BlLnVwcGVyICYmIHNjb3BlLnVwcGVyLmlzU3RyaWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzY29wZS50eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBib2R5ID0gYmxvY2suYm9keTtcbiAgICAgICAgfSBlbHNlIGlmIChzY29wZS50eXBlID09PSAnZ2xvYmFsJykge1xuICAgICAgICAgICAgYm9keSA9IGJsb2NrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuZGlyZWN0aXZlKSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBpeiA9IGJvZHkuYm9keS5sZW5ndGg7IGkgPCBpejsgKytpKSB7XG4gICAgICAgICAgICAgICAgc3RtdCA9IGJvZHkuYm9keVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoc3RtdC50eXBlICE9PSAnRGlyZWN0aXZlU3RhdGVtZW50Jykge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHN0bXQucmF3ID09PSAnXCJ1c2Ugc3RyaWN0XCInIHx8IHN0bXQucmF3ID09PSAnXFwndXNlIHN0cmljdFxcJycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChpID0gMCwgaXogPSBib2R5LmJvZHkubGVuZ3RoOyBpIDwgaXo7ICsraSkge1xuICAgICAgICAgICAgICAgIHN0bXQgPSBib2R5LmJvZHlbaV07XG4gICAgICAgICAgICAgICAgaWYgKHN0bXQudHlwZSAhPT0gU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4cHIgPSBzdG10LmV4cHJlc3Npb247XG4gICAgICAgICAgICAgICAgaWYgKGV4cHIudHlwZSAhPT0gU3ludGF4LkxpdGVyYWwgfHwgdHlwZW9mIGV4cHIudmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXhwci5yYXcgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXhwci5yYXcgPT09ICdcInVzZSBzdHJpY3RcIicgfHwgZXhwci5yYXcgPT09ICdcXCd1c2Ugc3RyaWN0XFwnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXhwci52YWx1ZSA9PT0gJ3VzZSBzdHJpY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gU2NvcGUoYmxvY2ssIG9wdCkge1xuICAgICAgICB2YXIgdmFyaWFibGUsIGJvZHk7XG5cbiAgICAgICAgdGhpcy50eXBlID1cbiAgICAgICAgICAgIChibG9jay50eXBlID09PSBTeW50YXguQ2F0Y2hDbGF1c2UpID8gJ2NhdGNoJyA6XG4gICAgICAgICAgICAoYmxvY2sudHlwZSA9PT0gU3ludGF4LldpdGhTdGF0ZW1lbnQpID8gJ3dpdGgnIDpcbiAgICAgICAgICAgIChibG9jay50eXBlID09PSBTeW50YXguUHJvZ3JhbSkgPyAnZ2xvYmFsJyA6ICdmdW5jdGlvbic7XG4gICAgICAgIHRoaXMuc2V0ID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLnRhaW50cyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5keW5hbWljID0gdGhpcy50eXBlID09PSAnZ2xvYmFsJyB8fCB0aGlzLnR5cGUgPT09ICd3aXRoJztcbiAgICAgICAgdGhpcy5ibG9jayA9IGJsb2NrO1xuICAgICAgICB0aGlzLnRocm91Z2ggPSBbXTtcbiAgICAgICAgdGhpcy52YXJpYWJsZXMgPSBbXTtcbiAgICAgICAgdGhpcy5yZWZlcmVuY2VzID0gW107XG4gICAgICAgIHRoaXMubGVmdCA9IFtdO1xuICAgICAgICB0aGlzLnZhcmlhYmxlU2NvcGUgPVxuICAgICAgICAgICAgKHRoaXMudHlwZSA9PT0gJ2dsb2JhbCcgfHwgdGhpcy50eXBlID09PSAnZnVuY3Rpb24nKSA/IHRoaXMgOiBjdXJyZW50U2NvcGUudmFyaWFibGVTY29wZTtcbiAgICAgICAgdGhpcy5mdW5jdGlvbkV4cHJlc3Npb25TY29wZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmRpcmVjdENhbGxUb0V2YWxTY29wZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRoaXNGb3VuZCA9IGZhbHNlO1xuICAgICAgICBib2R5ID0gdGhpcy50eXBlID09PSAnZnVuY3Rpb24nID8gYmxvY2suYm9keSA6IGJsb2NrO1xuICAgICAgICBpZiAob3B0Lm5hbWluZykge1xuICAgICAgICAgICAgdGhpcy5fX2RlZmluZShibG9jay5pZCwge1xuICAgICAgICAgICAgICAgIHR5cGU6IFZhcmlhYmxlLkZ1bmN0aW9uTmFtZSxcbiAgICAgICAgICAgICAgICBuYW1lOiBibG9jay5pZCxcbiAgICAgICAgICAgICAgICBub2RlOiBibG9ja1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmZ1bmN0aW9uRXhwcmVzc2lvblNjb3BlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB2YXJpYWJsZSA9IG5ldyBWYXJpYWJsZSgnYXJndW1lbnRzJywgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy50YWludHMuc2V0KCdhcmd1bWVudHMnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldC5zZXQoJ2FyZ3VtZW50cycsIHZhcmlhYmxlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnZhcmlhYmxlcy5wdXNoKHZhcmlhYmxlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGJsb2NrLnR5cGUgPT09IFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb24gJiYgYmxvY2suaWQpIHtcbiAgICAgICAgICAgICAgICBuZXcgU2NvcGUoYmxvY2ssIHsgbmFtaW5nOiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51cHBlciA9IGN1cnJlbnRTY29wZTtcbiAgICAgICAgdGhpcy5pc1N0cmljdCA9IGlzU3RyaWN0U2NvcGUodGhpcywgYmxvY2spO1xuXG4gICAgICAgIHRoaXMuY2hpbGRTY29wZXMgPSBbXTtcbiAgICAgICAgaWYgKGN1cnJlbnRTY29wZSkge1xuICAgICAgICAgICAgY3VycmVudFNjb3BlLmNoaWxkU2NvcGVzLnB1c2godGhpcyk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIFJBSUlcbiAgICAgICAgY3VycmVudFNjb3BlID0gdGhpcztcbiAgICAgICAgaWYgKHRoaXMudHlwZSA9PT0gJ2dsb2JhbCcpIHtcbiAgICAgICAgICAgIGdsb2JhbFNjb3BlID0gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBzY29wZXMucHVzaCh0aGlzKTtcbiAgICB9XG5cbiAgICBTY29wZS5wcm90b3R5cGUuX19jbG9zZSA9IGZ1bmN0aW9uIF9fY2xvc2UoKSB7XG4gICAgICAgIHZhciBpLCBpeiwgcmVmLCBjdXJyZW50LCBub2RlO1xuXG4gICAgICAgIC8vIEJlY2F1c2UgaWYgdGhpcyBpcyBnbG9iYWwgZW52aXJvbm1lbnQsIHVwcGVyIGlzIG51bGxcbiAgICAgICAgaWYgKCF0aGlzLmR5bmFtaWMgfHwgb3B0aW9ucy5vcHRpbWlzdGljKSB7XG4gICAgICAgICAgICAvLyBzdGF0aWMgcmVzb2x2ZVxuICAgICAgICAgICAgZm9yIChpID0gMCwgaXogPSB0aGlzLmxlZnQubGVuZ3RoOyBpIDwgaXo7ICsraSkge1xuICAgICAgICAgICAgICAgIHJlZiA9IHRoaXMubGVmdFtpXTtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX19yZXNvbHZlKHJlZikpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2RlbGVnYXRlVG9VcHBlclNjb3BlKHJlZik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBcImdsb2JhbFwiIC8gXCJ3aXRoXCIgLyBcImZ1bmN0aW9uIHdpdGggZXZhbFwiIGVudmlyb25tZW50XG4gICAgICAgICAgICBpZiAodGhpcy50eXBlID09PSAnd2l0aCcpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBpeiA9IHRoaXMubGVmdC5sZW5ndGg7IGkgPCBpejsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlZiA9IHRoaXMubGVmdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgcmVmLnRhaW50ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fZGVsZWdhdGVUb1VwcGVyU2NvcGUocmVmKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGl6ID0gdGhpcy5sZWZ0Lmxlbmd0aDsgaSA8IGl6OyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm90aWZ5IGFsbCBuYW1lcyBhcmUgdGhyb3VnaCB0byBnbG9iYWxcbiAgICAgICAgICAgICAgICAgICAgcmVmID0gdGhpcy5sZWZ0W2ldO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudC50aHJvdWdoLnB1c2gocmVmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50LnVwcGVyO1xuICAgICAgICAgICAgICAgICAgICB9IHdoaWxlIChjdXJyZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmICh0aGlzLnR5cGUgPT09ICdnbG9iYWwnKSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBpeiA9IHRoaXMubGVmdC5sZW5ndGg7IGkgPCBpejsgKytpKSB7XG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIGltcGxpY2l0IGdsb2JhbCB2YXJpYWJsZSBmcm9tIGFzc2lnbm1lbnQgZXhwcmVzc2lvblxuICAgICAgICAgICAgICAgIHJlZiA9IHRoaXMubGVmdFtpXTtcbiAgICAgICAgICAgICAgICBpZiAocmVmLl9fbWF5YmVJbXBsaWNpdEdsb2JhbCkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gcmVmLl9fbWF5YmVJbXBsaWNpdEdsb2JhbDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2RlZmluZShub2RlLmxlZnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFZhcmlhYmxlLkltcGxpY2l0R2xvYmFsVmFyaWFibGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLmxlZnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlOiBub2RlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubGVmdCA9IG51bGw7XG4gICAgICAgIGN1cnJlbnRTY29wZSA9IHRoaXMudXBwZXI7XG4gICAgfTtcblxuICAgIFNjb3BlLnByb3RvdHlwZS5fX3Jlc29sdmUgPSBmdW5jdGlvbiBfX3Jlc29sdmUocmVmKSB7XG4gICAgICAgIHZhciB2YXJpYWJsZSwgbmFtZTtcbiAgICAgICAgbmFtZSA9IHJlZi5pZGVudGlmaWVyLm5hbWU7XG4gICAgICAgIGlmICh0aGlzLnNldC5oYXMobmFtZSkpIHtcbiAgICAgICAgICAgIHZhcmlhYmxlID0gdGhpcy5zZXQuZ2V0KG5hbWUpO1xuICAgICAgICAgICAgdmFyaWFibGUucmVmZXJlbmNlcy5wdXNoKHJlZik7XG4gICAgICAgICAgICB2YXJpYWJsZS5zdGFjayA9IHZhcmlhYmxlLnN0YWNrICYmIHJlZi5mcm9tLnZhcmlhYmxlU2NvcGUgPT09IHRoaXMudmFyaWFibGVTY29wZTtcbiAgICAgICAgICAgIGlmIChyZWYudGFpbnRlZCkge1xuICAgICAgICAgICAgICAgIHZhcmlhYmxlLnRhaW50ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMudGFpbnRzLnNldCh2YXJpYWJsZS5uYW1lLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlZi5yZXNvbHZlZCA9IHZhcmlhYmxlO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBTY29wZS5wcm90b3R5cGUuX19kZWxlZ2F0ZVRvVXBwZXJTY29wZSA9IGZ1bmN0aW9uIF9fZGVsZWdhdGVUb1VwcGVyU2NvcGUocmVmKSB7XG4gICAgICAgIGlmICh0aGlzLnVwcGVyKSB7XG4gICAgICAgICAgICB0aGlzLnVwcGVyLmxlZnQucHVzaChyZWYpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGhyb3VnaC5wdXNoKHJlZik7XG4gICAgfTtcblxuICAgIFNjb3BlLnByb3RvdHlwZS5fX2RlZmluZSA9IGZ1bmN0aW9uIF9fZGVmaW5lKG5vZGUsIGluZm8pIHtcbiAgICAgICAgdmFyIG5hbWUsIHZhcmlhYmxlO1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICBuYW1lID0gbm9kZS5uYW1lO1xuICAgICAgICAgICAgaWYgKCF0aGlzLnNldC5oYXMobmFtZSkpIHtcbiAgICAgICAgICAgICAgICB2YXJpYWJsZSA9IG5ldyBWYXJpYWJsZShuYW1lLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXJpYWJsZS5pZGVudGlmaWVycy5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgIHZhcmlhYmxlLmRlZnMucHVzaChpbmZvKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldC5zZXQobmFtZSwgdmFyaWFibGUpO1xuICAgICAgICAgICAgICAgIHRoaXMudmFyaWFibGVzLnB1c2godmFyaWFibGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXJpYWJsZSA9IHRoaXMuc2V0LmdldChuYW1lKTtcbiAgICAgICAgICAgICAgICB2YXJpYWJsZS5pZGVudGlmaWVycy5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgIHZhcmlhYmxlLmRlZnMucHVzaChpbmZvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBTY29wZS5wcm90b3R5cGUuX19yZWZlcmVuY2luZyA9IGZ1bmN0aW9uIF9fcmVmZXJlbmNpbmcobm9kZSwgYXNzaWduLCB3cml0ZUV4cHIsIG1heWJlSW1wbGljaXRHbG9iYWwpIHtcbiAgICAgICAgdmFyIHJlZjtcbiAgICAgICAgLy8gYmVjYXVzZSBBcnJheSBlbGVtZW50IG1heSBiZSBudWxsXG4gICAgICAgIGlmIChub2RlICYmIG5vZGUudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHJlZiA9IG5ldyBSZWZlcmVuY2Uobm9kZSwgdGhpcywgYXNzaWduIHx8IFJlZmVyZW5jZS5SRUFELCB3cml0ZUV4cHIsIG1heWJlSW1wbGljaXRHbG9iYWwpO1xuICAgICAgICAgICAgdGhpcy5yZWZlcmVuY2VzLnB1c2gocmVmKTtcbiAgICAgICAgICAgIHRoaXMubGVmdC5wdXNoKHJlZik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgU2NvcGUucHJvdG90eXBlLl9fZGV0ZWN0RXZhbCA9IGZ1bmN0aW9uIF9fZGV0ZWN0RXZhbCgpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQ7XG4gICAgICAgIGN1cnJlbnQgPSB0aGlzO1xuICAgICAgICB0aGlzLmRpcmVjdENhbGxUb0V2YWxTY29wZSA9IHRydWU7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGN1cnJlbnQuZHluYW1pYyA9IHRydWU7XG4gICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC51cHBlcjtcbiAgICAgICAgfSB3aGlsZSAoY3VycmVudCk7XG4gICAgfTtcblxuICAgIFNjb3BlLnByb3RvdHlwZS5fX2RldGVjdFRoaXMgPSBmdW5jdGlvbiBfX2RldGVjdFRoaXMoKSB7XG4gICAgICAgIHRoaXMudGhpc0ZvdW5kID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgU2NvcGUucHJvdG90eXBlLl9faXNDbG9zZWQgPSBmdW5jdGlvbiBpc0Nsb3NlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGVmdCA9PT0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gQVBJIFNjb3BlI3Jlc29sdmUobmFtZSlcbiAgICAvLyByZXR1cm5zIHJlc29sdmVkIHJlZmVyZW5jZVxuICAgIFNjb3BlLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24gcmVzb2x2ZShpZGVudCkge1xuICAgICAgICB2YXIgcmVmLCBpLCBpejtcbiAgICAgICAgYXNzZXJ0KHRoaXMuX19pc0Nsb3NlZCgpLCAnc2NvcGUgc2hvdWxkIGJlIGNsb3NlZCcpO1xuICAgICAgICBhc3NlcnQoaWRlbnQudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIsICd0YXJnZXQgc2hvdWxkIGJlIGlkZW50aWZpZXInKTtcbiAgICAgICAgZm9yIChpID0gMCwgaXogPSB0aGlzLnJlZmVyZW5jZXMubGVuZ3RoOyBpIDwgaXo7ICsraSkge1xuICAgICAgICAgICAgcmVmID0gdGhpcy5yZWZlcmVuY2VzW2ldO1xuICAgICAgICAgICAgaWYgKHJlZi5pZGVudGlmaWVyID09PSBpZGVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWY7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIC8vIEFQSSBTY29wZSNpc1N0YXRpY1xuICAgIC8vIHJldHVybnMgdGhpcyBzY29wZSBpcyBzdGF0aWNcbiAgICBTY29wZS5wcm90b3R5cGUuaXNTdGF0aWMgPSBmdW5jdGlvbiBpc1N0YXRpYygpIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLmR5bmFtaWM7XG4gICAgfTtcblxuICAgIC8vIEFQSSBTY29wZSNpc0FyZ3VtZW50c01hdGVyaWFsaXplZFxuICAgIC8vIHJldHVybiB0aGlzIHNjb3BlIGhhcyBtYXRlcmlhbGl6ZWQgYXJndW1lbnRzXG4gICAgU2NvcGUucHJvdG90eXBlLmlzQXJndW1lbnRzTWF0ZXJpYWxpemVkID0gZnVuY3Rpb24gaXNBcmd1bWVudHNNYXRlcmlhbGl6ZWQoKSB7XG4gICAgICAgIC8vIFRPRE8oQ29uc3RlbGxhdGlvbilcbiAgICAgICAgLy8gV2UgY2FuIG1vcmUgYWdncmVzc2l2ZSBvbiB0aGlzIGNvbmRpdGlvbiBsaWtlIHRoaXMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGZ1bmN0aW9uIHQoKSB7XG4gICAgICAgIC8vICAgICAvLyBhcmd1bWVudHMgb2YgdCBpcyBhbHdheXMgaGlkZGVuLlxuICAgICAgICAvLyAgICAgZnVuY3Rpb24gYXJndW1lbnRzKCkge1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9XG4gICAgICAgIHZhciB2YXJpYWJsZTtcblxuICAgICAgICAvLyBUaGlzIGlzIG5vdCBmdW5jdGlvbiBzY29wZVxuICAgICAgICBpZiAodGhpcy50eXBlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5pc1N0YXRpYygpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhcmlhYmxlID0gdGhpcy5zZXQuZ2V0KCdhcmd1bWVudHMnKTtcbiAgICAgICAgYXNzZXJ0KHZhcmlhYmxlLCAnYWx3YXlzIGhhdmUgYXJndW1lbnRzIHZhcmlhYmxlJyk7XG4gICAgICAgIHJldHVybiB2YXJpYWJsZS50YWludGVkIHx8IHZhcmlhYmxlLnJlZmVyZW5jZXMubGVuZ3RoICAhPT0gMDtcbiAgICB9O1xuXG4gICAgLy8gQVBJIFNjb3BlI2lzVGhpc01hdGVyaWFsaXplZFxuICAgIC8vIHJldHVybiB0aGlzIHNjb3BlIGhhcyBtYXRlcmlhbGl6ZWQgYHRoaXNgIHJlZmVyZW5jZVxuICAgIFNjb3BlLnByb3RvdHlwZS5pc1RoaXNNYXRlcmlhbGl6ZWQgPSBmdW5jdGlvbiBpc1RoaXNNYXRlcmlhbGl6ZWQoKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgbm90IGZ1bmN0aW9uIHNjb3BlXG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5pc1N0YXRpYygpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy50aGlzRm91bmQ7XG4gICAgfTtcblxuICAgIFNjb3BlLm1hbmdsZWROYW1lID0gJ19fJGVzY29wZSRfXyc7XG5cbiAgICBTY29wZS5wcm90b3R5cGUuYXR0YWNoID0gZnVuY3Rpb24gYXR0YWNoKCkge1xuICAgICAgICBpZiAoIXRoaXMuZnVuY3Rpb25FeHByZXNzaW9uU2NvcGUpIHtcbiAgICAgICAgICAgIHRoaXMuYmxvY2tbU2NvcGUubWFuZ2xlZE5hbWVdID0gdGhpcztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBTY29wZS5wcm90b3R5cGUuZGV0YWNoID0gZnVuY3Rpb24gZGV0YWNoKCkge1xuICAgICAgICBpZiAoIXRoaXMuZnVuY3Rpb25FeHByZXNzaW9uU2NvcGUpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmJsb2NrW1Njb3BlLm1hbmdsZWROYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBTY29wZS5wcm90b3R5cGUuaXNVc2VkTmFtZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLnNldC5oYXMobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpeiA9IHRoaXMudGhyb3VnaC5sZW5ndGg7IGkgPCBpejsgKytpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aHJvdWdoW2ldLmlkZW50aWZpZXIubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gU2NvcGVNYW5hZ2VyKHNjb3Blcykge1xuICAgICAgICB0aGlzLnNjb3BlcyA9IHNjb3BlcztcbiAgICAgICAgdGhpcy5hdHRhY2hlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFJldHVybnMgYXBwcm9wbGlhdGUgc2NvcGUgZm9yIHRoaXMgbm9kZVxuICAgIFNjb3BlTWFuYWdlci5wcm90b3R5cGUuX19nZXQgPSBmdW5jdGlvbiBfX2dldChub2RlKSB7XG4gICAgICAgIHZhciBpLCBpeiwgc2NvcGU7XG4gICAgICAgIGlmICh0aGlzLmF0dGFjaGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZVtTY29wZS5tYW5nbGVkTmFtZV0gfHwgbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoU2NvcGUuaXNTY29wZVJlcXVpcmVkKG5vZGUpKSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBpeiA9IHRoaXMuc2NvcGVzLmxlbmd0aDsgaSA8IGl6OyArK2kpIHtcbiAgICAgICAgICAgICAgICBzY29wZSA9IHRoaXMuc2NvcGVzW2ldO1xuICAgICAgICAgICAgICAgIGlmICghc2NvcGUuZnVuY3Rpb25FeHByZXNzaW9uU2NvcGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLmJsb2NrID09PSBub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIFNjb3BlTWFuYWdlci5wcm90b3R5cGUuYWNxdWlyZSA9IGZ1bmN0aW9uIGFjcXVpcmUobm9kZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fX2dldChub2RlKTtcbiAgICB9O1xuXG4gICAgU2NvcGVNYW5hZ2VyLnByb3RvdHlwZS5yZWxlYXNlID0gZnVuY3Rpb24gcmVsZWFzZShub2RlKSB7XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXMuX19nZXQobm9kZSk7XG4gICAgICAgIGlmIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUgPSBzY29wZS51cHBlcjtcbiAgICAgICAgICAgIHdoaWxlIChzY29wZSkge1xuICAgICAgICAgICAgICAgIGlmICghc2NvcGUuZnVuY3Rpb25FeHByZXNzaW9uU2NvcGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzY29wZSA9IHNjb3BlLnVwcGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICBTY29wZU1hbmFnZXIucHJvdG90eXBlLmF0dGFjaCA9IGZ1bmN0aW9uIGF0dGFjaCgpIHtcbiAgICAgICAgdmFyIGksIGl6O1xuICAgICAgICBmb3IgKGkgPSAwLCBpeiA9IHRoaXMuc2NvcGVzLmxlbmd0aDsgaSA8IGl6OyArK2kpIHtcbiAgICAgICAgICAgIHRoaXMuc2NvcGVzW2ldLmF0dGFjaCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXR0YWNoZWQgPSB0cnVlO1xuICAgIH07XG5cbiAgICBTY29wZU1hbmFnZXIucHJvdG90eXBlLmRldGFjaCA9IGZ1bmN0aW9uIGRldGFjaCgpIHtcbiAgICAgICAgdmFyIGksIGl6O1xuICAgICAgICBmb3IgKGkgPSAwLCBpeiA9IHRoaXMuc2NvcGVzLmxlbmd0aDsgaSA8IGl6OyArK2kpIHtcbiAgICAgICAgICAgIHRoaXMuc2NvcGVzW2ldLmRldGFjaCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXR0YWNoZWQgPSBmYWxzZTtcbiAgICB9O1xuXG4gICAgU2NvcGUuaXNTY29wZVJlcXVpcmVkID0gZnVuY3Rpb24gaXNTY29wZVJlcXVpcmVkKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIFNjb3BlLmlzVmFyaWFibGVTY29wZVJlcXVpcmVkKG5vZGUpIHx8IG5vZGUudHlwZSA9PT0gU3ludGF4LldpdGhTdGF0ZW1lbnQgfHwgbm9kZS50eXBlID09PSBTeW50YXguQ2F0Y2hDbGF1c2U7XG4gICAgfTtcblxuICAgIFNjb3BlLmlzVmFyaWFibGVTY29wZVJlcXVpcmVkID0gZnVuY3Rpb24gaXNWYXJpYWJsZVNjb3BlUmVxdWlyZWQobm9kZSkge1xuICAgICAgICByZXR1cm4gbm9kZS50eXBlID09PSBTeW50YXguUHJvZ3JhbSB8fCBub2RlLnR5cGUgPT09IFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb24gfHwgbm9kZS50eXBlID09PSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gYW5hbHl6ZSh0cmVlLCBwcm92aWRlZE9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHJlc3VsdFNjb3BlcztcblxuICAgICAgICBvcHRpb25zID0gdXBkYXRlRGVlcGx5KGRlZmF1bHRPcHRpb25zKCksIHByb3ZpZGVkT3B0aW9ucyk7XG4gICAgICAgIHJlc3VsdFNjb3BlcyA9IHNjb3BlcyA9IFtdO1xuICAgICAgICBjdXJyZW50U2NvcGUgPSBudWxsO1xuICAgICAgICBnbG9iYWxTY29wZSA9IG51bGw7XG5cbiAgICAgICAgLy8gYXR0YWNoIHNjb3BlIGFuZCBjb2xsZWN0IC8gcmVzb2x2ZSBuYW1lc1xuICAgICAgICBlc3RyYXZlcnNlLnRyYXZlcnNlKHRyZWUsIHtcbiAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbiBlbnRlcihub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGksIGl6LCBkZWNsO1xuICAgICAgICAgICAgICAgIGlmIChTY29wZS5pc1Njb3BlUmVxdWlyZWQobm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3IFNjb3BlKG5vZGUsIHt9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5vcGVyYXRvciA9PT0gJz0nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLmxlZnQsIFJlZmVyZW5jZS5XUklURSwgbm9kZS5yaWdodCwgKCFjdXJyZW50U2NvcGUuaXNTdHJpY3QgJiYgbm9kZS5sZWZ0Lm5hbWUgIT0gbnVsbCkgJiYgbm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLmxlZnQsIFJlZmVyZW5jZS5SVywgbm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQXJyYXlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBpeiA9IG5vZGUuZWxlbWVudHMubGVuZ3RoOyBpIDwgaXo7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5lbGVtZW50c1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CbG9ja1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLmxlZnQpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLnJpZ2h0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CcmVha1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5jYWxsZWUpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBpeiA9IG5vZGVbJ2FyZ3VtZW50cyddLmxlbmd0aDsgaSA8IGl6OyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGVbJ2FyZ3VtZW50cyddW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIHRoaXMgaXMgZGlyZWN0IGNhbGwgdG8gZXZhbFxuICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMuaWdub3JlRXZhbCAmJiBub2RlLmNhbGxlZS50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBub2RlLmNhbGxlZS5uYW1lID09PSAnZXZhbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS52YXJpYWJsZVNjb3BlLl9fZGV0ZWN0RXZhbCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2F0Y2hDbGF1c2U6XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX2RlZmluZShub2RlLnBhcmFtLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBWYXJpYWJsZS5DYXRjaENsYXVzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUucGFyYW0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlOiBub2RlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS50ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkRpcmVjdGl2ZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Eb1doaWxlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLnRlc3QpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkRlYnVnZ2VyU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkVtcHR5U3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGUuZXhwcmVzc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRm9yU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLmluaXQpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLnRlc3QpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLnVwZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRm9ySW5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxlZnQudHlwZSA9PT0gU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGUubGVmdC5kZWNsYXJhdGlvbnNbMF0uaWQsIFJlZmVyZW5jZS5XUklURSwgbnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5sZWZ0LCBSZWZlcmVuY2UuV1JJVEUsIG51bGwsICghY3VycmVudFNjb3BlLmlzU3RyaWN0ICYmIG5vZGUubGVmdC5uYW1lICE9IG51bGwpICYmIG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGUucmlnaHQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgICAgIC8vIEZ1bmN0aW9uRGVjbGFyYXRpb24gbmFtZSBpcyBkZWZpbmVkIGluIHVwcGVyIHNjb3BlXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS51cHBlci5fX2RlZmluZShub2RlLmlkLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBWYXJpYWJsZS5GdW5jdGlvbk5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogbm9kZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMCwgaXogPSBub2RlLnBhcmFtcy5sZW5ndGg7IGkgPCBpejsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19kZWZpbmUobm9kZS5wYXJhbXNbaV0sIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBWYXJpYWJsZS5QYXJhbWV0ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5wYXJhbXNbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogaVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgIC8vIGlkIGlzIGRlZmluZWQgaW4gdXBwZXIgc2NvcGVcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMCwgaXogPSBub2RlLnBhcmFtcy5sZW5ndGg7IGkgPCBpejsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19kZWZpbmUobm9kZS5wYXJhbXNbaV0sIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBWYXJpYWJsZS5QYXJhbWV0ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5wYXJhbXNbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogaVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLnRlc3QpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkxpdGVyYWw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTGFiZWxlZFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5sZWZ0KTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5vYmplY3QpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5jb21wdXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS5wcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLmNhbGxlZSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGl6ID0gbm9kZVsnYXJndW1lbnRzJ10ubGVuZ3RoOyBpIDwgaXo7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZVsnYXJndW1lbnRzJ11baV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguT2JqZWN0RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9ncmFtOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb3BlcnR5OlxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGUuYXJndW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlNlcXVlbmNlRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMCwgaXogPSBub2RlLmV4cHJlc3Npb25zLmxlbmd0aDsgaSA8IGl6OyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGUuZXhwcmVzc2lvbnNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhub2RlLmRpc2NyaW1pbmFudCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoQ2FzZTpcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fcmVmZXJlbmNpbmcobm9kZS50ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLnZhcmlhYmxlU2NvcGUuX19kZXRlY3RUaGlzKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVGhyb3dTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGUuYXJndW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlRyeVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5VbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGUuYXJndW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlVwZGF0ZUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGUuYXJndW1lbnQsIFJlZmVyZW5jZS5SVywgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMCwgaXogPSBub2RlLmRlY2xhcmF0aW9ucy5sZW5ndGg7IGkgPCBpejsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWNsID0gbm9kZS5kZWNsYXJhdGlvbnNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUudmFyaWFibGVTY29wZS5fX2RlZmluZShkZWNsLmlkLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVmFyaWFibGUuVmFyaWFibGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogZGVjbC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlOiBkZWNsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiBpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogbm9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVjbC5pbml0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZXIgaXMgZm91bmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUuX19yZWZlcmVuY2luZyhkZWNsLmlkLCBSZWZlcmVuY2UuV1JJVEUsIGRlY2wuaW5pdCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKGRlY2wuaW5pdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3I6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguV2hpbGVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS5fX3JlZmVyZW5jaW5nKG5vZGUudGVzdCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguV2l0aFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgLy8gV2l0aFN0YXRlbWVudCBvYmplY3QgaXMgcmVmZXJlbmNlZCBhdCB1cHBlciBzY29wZVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2NvcGUudXBwZXIuX19yZWZlcmVuY2luZyhub2RlLm9iamVjdCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGxlYXZlOiBmdW5jdGlvbiBsZWF2ZShub2RlKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1cnJlbnRTY29wZSAmJiBub2RlID09PSBjdXJyZW50U2NvcGUuYmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNjb3BlLl9fY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFzc2VydChjdXJyZW50U2NvcGUgPT09IG51bGwpO1xuICAgICAgICBnbG9iYWxTY29wZSA9IG51bGw7XG4gICAgICAgIHNjb3BlcyA9IG51bGw7XG4gICAgICAgIG9wdGlvbnMgPSBudWxsO1xuXG4gICAgICAgIHJldHVybiBuZXcgU2NvcGVNYW5hZ2VyKHJlc3VsdFNjb3Blcyk7XG4gICAgfVxuXG4gICAgZXhwb3J0cy52ZXJzaW9uID0gJzAuMC4xNic7XG4gICAgZXhwb3J0cy5SZWZlcmVuY2UgPSBSZWZlcmVuY2U7XG4gICAgZXhwb3J0cy5WYXJpYWJsZSA9IFZhcmlhYmxlO1xuICAgIGV4cG9ydHMuU2NvcGUgPSBTY29wZTtcbiAgICBleHBvcnRzLlNjb3BlTWFuYWdlciA9IFNjb3BlTWFuYWdlcjtcbiAgICBleHBvcnRzLmFuYWx5emUgPSBhbmFseXplO1xufSwgdGhpcykpO1xuLyogdmltOiBzZXQgc3c9NCB0cz00IGV0IHR3PTgwIDogKi9cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJuZ3BtY1FcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLlxcXFwuLlxcXFxub2RlX21vZHVsZXNcXFxcZXNyZWZhY3RvclxcXFxub2RlX21vZHVsZXNcXFxcZXNjb3BlXFxcXGVzY29wZS5qc1wiLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxlc3JlZmFjdG9yXFxcXG5vZGVfbW9kdWxlc1xcXFxlc2NvcGVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgQXJpeWEgSGlkYXlhdCA8YXJpeWEuaGlkYXlhdEBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBNYXRoaWFzIEJ5bmVucyA8bWF0aGlhc0BxaXdpLmJlPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgSm9vc3QtV2ltIEJvZWtlc3RlaWpuIDxqb29zdC13aW1AYm9la2VzdGVpam4ubmw+XG4gIENvcHlyaWdodCAoQykgMjAxMiBLcmlzIEtvd2FsIDxrcmlzLmtvd2FsQGNpeGFyLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIFl1c3VrZSBTdXp1a2kgPHV0YXRhbmUudGVhQGdtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFycGFkIEJvcnNvcyA8YXJwYWQuYm9yc29zQGdvb2dsZW1haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTEgQXJpeWEgSGlkYXlhdCA8YXJpeWEuaGlkYXlhdEBnbWFpbC5jb20+XG5cbiAgUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0XG4gIG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICAgICogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGVcbiAgICAgIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG5cbiAgVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTIElTXCJcbiAgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRVxuICBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuICBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgPENPUFlSSUdIVCBIT0xERVI+IEJFIExJQUJMRSBGT1IgQU5ZXG4gIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTXG4gIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUztcbiAgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EXG4gIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUXG4gIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuICBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuKi9cblxuLypqc2xpbnQgYml0d2lzZTp0cnVlIHBsdXNwbHVzOnRydWUgKi9cbi8qZ2xvYmFsIGVzcHJpbWE6dHJ1ZSwgZGVmaW5lOnRydWUsIGV4cG9ydHM6dHJ1ZSwgd2luZG93OiB0cnVlLFxudGhyb3dFcnJvcjogdHJ1ZSwgY3JlYXRlTGl0ZXJhbDogdHJ1ZSwgZ2VuZXJhdGVTdGF0ZW1lbnQ6IHRydWUsXG5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uOiB0cnVlLCBwYXJzZUJsb2NrOiB0cnVlLCBwYXJzZUV4cHJlc3Npb246IHRydWUsXG5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb246IHRydWUsIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uOiB0cnVlLFxucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzOiB0cnVlLCBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcjogdHJ1ZSxcbnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjogdHJ1ZSxcbnBhcnNlU3RhdGVtZW50OiB0cnVlLCBwYXJzZVNvdXJjZUVsZW1lbnQ6IHRydWUgKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uIChVTUQpIHRvIHN1cHBvcnQgQU1ELCBDb21tb25KUy9Ob2RlLmpzLFxuICAgIC8vIFJoaW5vLCBhbmQgcGxhaW4gYnJvd3NlciBsb2FkaW5nLlxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBmYWN0b3J5KGV4cG9ydHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnkoKHJvb3QuZXNwcmltYSA9IHt9KSk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBUb2tlbixcbiAgICAgICAgVG9rZW5OYW1lLFxuICAgICAgICBTeW50YXgsXG4gICAgICAgIFByb3BlcnR5S2luZCxcbiAgICAgICAgTWVzc2FnZXMsXG4gICAgICAgIFJlZ2V4LFxuICAgICAgICBzb3VyY2UsXG4gICAgICAgIHN0cmljdCxcbiAgICAgICAgaW5kZXgsXG4gICAgICAgIGxpbmVOdW1iZXIsXG4gICAgICAgIGxpbmVTdGFydCxcbiAgICAgICAgbGVuZ3RoLFxuICAgICAgICBidWZmZXIsXG4gICAgICAgIHN0YXRlLFxuICAgICAgICBleHRyYTtcblxuICAgIFRva2VuID0ge1xuICAgICAgICBCb29sZWFuTGl0ZXJhbDogMSxcbiAgICAgICAgRU9GOiAyLFxuICAgICAgICBJZGVudGlmaWVyOiAzLFxuICAgICAgICBLZXl3b3JkOiA0LFxuICAgICAgICBOdWxsTGl0ZXJhbDogNSxcbiAgICAgICAgTnVtZXJpY0xpdGVyYWw6IDYsXG4gICAgICAgIFB1bmN0dWF0b3I6IDcsXG4gICAgICAgIFN0cmluZ0xpdGVyYWw6IDhcbiAgICB9O1xuXG4gICAgVG9rZW5OYW1lID0ge307XG4gICAgVG9rZW5OYW1lW1Rva2VuLkJvb2xlYW5MaXRlcmFsXSA9ICdCb29sZWFuJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uRU9GXSA9ICc8ZW5kPic7XG4gICAgVG9rZW5OYW1lW1Rva2VuLklkZW50aWZpZXJdID0gJ0lkZW50aWZpZXInO1xuICAgIFRva2VuTmFtZVtUb2tlbi5LZXl3b3JkXSA9ICdLZXl3b3JkJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uTnVsbExpdGVyYWxdID0gJ051bGwnO1xuICAgIFRva2VuTmFtZVtUb2tlbi5OdW1lcmljTGl0ZXJhbF0gPSAnTnVtZXJpYyc7XG4gICAgVG9rZW5OYW1lW1Rva2VuLlB1bmN0dWF0b3JdID0gJ1B1bmN0dWF0b3InO1xuICAgIFRva2VuTmFtZVtUb2tlbi5TdHJpbmdMaXRlcmFsXSA9ICdTdHJpbmcnO1xuXG4gICAgU3ludGF4ID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogJ0Fzc2lnbm1lbnRFeHByZXNzaW9uJyxcbiAgICAgICAgQXJyYXlFeHByZXNzaW9uOiAnQXJyYXlFeHByZXNzaW9uJyxcbiAgICAgICAgQmxvY2tTdGF0ZW1lbnQ6ICdCbG9ja1N0YXRlbWVudCcsXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246ICdCaW5hcnlFeHByZXNzaW9uJyxcbiAgICAgICAgQnJlYWtTdGF0ZW1lbnQ6ICdCcmVha1N0YXRlbWVudCcsXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiAnQ2FsbEV4cHJlc3Npb24nLFxuICAgICAgICBDYXRjaENsYXVzZTogJ0NhdGNoQ2xhdXNlJyxcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiAnQ29uZGl0aW9uYWxFeHByZXNzaW9uJyxcbiAgICAgICAgQ29udGludWVTdGF0ZW1lbnQ6ICdDb250aW51ZVN0YXRlbWVudCcsXG4gICAgICAgIERvV2hpbGVTdGF0ZW1lbnQ6ICdEb1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgRGVidWdnZXJTdGF0ZW1lbnQ6ICdEZWJ1Z2dlclN0YXRlbWVudCcsXG4gICAgICAgIEVtcHR5U3RhdGVtZW50OiAnRW1wdHlTdGF0ZW1lbnQnLFxuICAgICAgICBFeHByZXNzaW9uU3RhdGVtZW50OiAnRXhwcmVzc2lvblN0YXRlbWVudCcsXG4gICAgICAgIEZvclN0YXRlbWVudDogJ0ZvclN0YXRlbWVudCcsXG4gICAgICAgIEZvckluU3RhdGVtZW50OiAnRm9ySW5TdGF0ZW1lbnQnLFxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiAnRnVuY3Rpb25EZWNsYXJhdGlvbicsXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogJ0Z1bmN0aW9uRXhwcmVzc2lvbicsXG4gICAgICAgIElkZW50aWZpZXI6ICdJZGVudGlmaWVyJyxcbiAgICAgICAgSWZTdGF0ZW1lbnQ6ICdJZlN0YXRlbWVudCcsXG4gICAgICAgIExpdGVyYWw6ICdMaXRlcmFsJyxcbiAgICAgICAgTGFiZWxlZFN0YXRlbWVudDogJ0xhYmVsZWRTdGF0ZW1lbnQnLFxuICAgICAgICBMb2dpY2FsRXhwcmVzc2lvbjogJ0xvZ2ljYWxFeHByZXNzaW9uJyxcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogJ01lbWJlckV4cHJlc3Npb24nLFxuICAgICAgICBOZXdFeHByZXNzaW9uOiAnTmV3RXhwcmVzc2lvbicsXG4gICAgICAgIE9iamVjdEV4cHJlc3Npb246ICdPYmplY3RFeHByZXNzaW9uJyxcbiAgICAgICAgUHJvZ3JhbTogJ1Byb2dyYW0nLFxuICAgICAgICBQcm9wZXJ0eTogJ1Byb3BlcnR5JyxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiAnUmV0dXJuU3RhdGVtZW50JyxcbiAgICAgICAgU2VxdWVuY2VFeHByZXNzaW9uOiAnU2VxdWVuY2VFeHByZXNzaW9uJyxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiAnU3dpdGNoU3RhdGVtZW50JyxcbiAgICAgICAgU3dpdGNoQ2FzZTogJ1N3aXRjaENhc2UnLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogJ1RoaXNFeHByZXNzaW9uJyxcbiAgICAgICAgVGhyb3dTdGF0ZW1lbnQ6ICdUaHJvd1N0YXRlbWVudCcsXG4gICAgICAgIFRyeVN0YXRlbWVudDogJ1RyeVN0YXRlbWVudCcsXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogJ1VuYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdVcGRhdGVFeHByZXNzaW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogJ1ZhcmlhYmxlRGVjbGFyYXRpb24nLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0b3I6ICdWYXJpYWJsZURlY2xhcmF0b3InLFxuICAgICAgICBXaGlsZVN0YXRlbWVudDogJ1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgV2l0aFN0YXRlbWVudDogJ1dpdGhTdGF0ZW1lbnQnXG4gICAgfTtcblxuICAgIFByb3BlcnR5S2luZCA9IHtcbiAgICAgICAgRGF0YTogMSxcbiAgICAgICAgR2V0OiAyLFxuICAgICAgICBTZXQ6IDRcbiAgICB9O1xuXG4gICAgLy8gRXJyb3IgbWVzc2FnZXMgc2hvdWxkIGJlIGlkZW50aWNhbCB0byBWOC5cbiAgICBNZXNzYWdlcyA9IHtcbiAgICAgICAgVW5leHBlY3RlZFRva2VuOiAgJ1VuZXhwZWN0ZWQgdG9rZW4gJTAnLFxuICAgICAgICBVbmV4cGVjdGVkTnVtYmVyOiAgJ1VuZXhwZWN0ZWQgbnVtYmVyJyxcbiAgICAgICAgVW5leHBlY3RlZFN0cmluZzogICdVbmV4cGVjdGVkIHN0cmluZycsXG4gICAgICAgIFVuZXhwZWN0ZWRJZGVudGlmaWVyOiAgJ1VuZXhwZWN0ZWQgaWRlbnRpZmllcicsXG4gICAgICAgIFVuZXhwZWN0ZWRSZXNlcnZlZDogICdVbmV4cGVjdGVkIHJlc2VydmVkIHdvcmQnLFxuICAgICAgICBVbmV4cGVjdGVkRU9TOiAgJ1VuZXhwZWN0ZWQgZW5kIG9mIGlucHV0JyxcbiAgICAgICAgTmV3bGluZUFmdGVyVGhyb3c6ICAnSWxsZWdhbCBuZXdsaW5lIGFmdGVyIHRocm93JyxcbiAgICAgICAgSW52YWxpZFJlZ0V4cDogJ0ludmFsaWQgcmVndWxhciBleHByZXNzaW9uJyxcbiAgICAgICAgVW50ZXJtaW5hdGVkUmVnRXhwOiAgJ0ludmFsaWQgcmVndWxhciBleHByZXNzaW9uOiBtaXNzaW5nIC8nLFxuICAgICAgICBJbnZhbGlkTEhTSW5Bc3NpZ25tZW50OiAgJ0ludmFsaWQgbGVmdC1oYW5kIHNpZGUgaW4gYXNzaWdubWVudCcsXG4gICAgICAgIEludmFsaWRMSFNJbkZvckluOiAgJ0ludmFsaWQgbGVmdC1oYW5kIHNpZGUgaW4gZm9yLWluJyxcbiAgICAgICAgTXVsdGlwbGVEZWZhdWx0c0luU3dpdGNoOiAnTW9yZSB0aGFuIG9uZSBkZWZhdWx0IGNsYXVzZSBpbiBzd2l0Y2ggc3RhdGVtZW50JyxcbiAgICAgICAgTm9DYXRjaE9yRmluYWxseTogICdNaXNzaW5nIGNhdGNoIG9yIGZpbmFsbHkgYWZ0ZXIgdHJ5JyxcbiAgICAgICAgVW5rbm93bkxhYmVsOiAnVW5kZWZpbmVkIGxhYmVsIFxcJyUwXFwnJyxcbiAgICAgICAgUmVkZWNsYXJhdGlvbjogJyUwIFxcJyUxXFwnIGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQnLFxuICAgICAgICBJbGxlZ2FsQ29udGludWU6ICdJbGxlZ2FsIGNvbnRpbnVlIHN0YXRlbWVudCcsXG4gICAgICAgIElsbGVnYWxCcmVhazogJ0lsbGVnYWwgYnJlYWsgc3RhdGVtZW50JyxcbiAgICAgICAgSWxsZWdhbFJldHVybjogJ0lsbGVnYWwgcmV0dXJuIHN0YXRlbWVudCcsXG4gICAgICAgIFN0cmljdE1vZGVXaXRoOiAgJ1N0cmljdCBtb2RlIGNvZGUgbWF5IG5vdCBpbmNsdWRlIGEgd2l0aCBzdGF0ZW1lbnQnLFxuICAgICAgICBTdHJpY3RDYXRjaFZhcmlhYmxlOiAgJ0NhdGNoIHZhcmlhYmxlIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RWYXJOYW1lOiAgJ1ZhcmlhYmxlIG5hbWUgbWF5IG5vdCBiZSBldmFsIG9yIGFyZ3VtZW50cyBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFBhcmFtTmFtZTogICdQYXJhbWV0ZXIgbmFtZSBldmFsIG9yIGFyZ3VtZW50cyBpcyBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFBhcmFtRHVwZTogJ1N0cmljdCBtb2RlIGZ1bmN0aW9uIG1heSBub3QgaGF2ZSBkdXBsaWNhdGUgcGFyYW1ldGVyIG5hbWVzJyxcbiAgICAgICAgU3RyaWN0RnVuY3Rpb25OYW1lOiAgJ0Z1bmN0aW9uIG5hbWUgbWF5IG5vdCBiZSBldmFsIG9yIGFyZ3VtZW50cyBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdE9jdGFsTGl0ZXJhbDogICdPY3RhbCBsaXRlcmFscyBhcmUgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUuJyxcbiAgICAgICAgU3RyaWN0RGVsZXRlOiAgJ0RlbGV0ZSBvZiBhbiB1bnF1YWxpZmllZCBpZGVudGlmaWVyIGluIHN0cmljdCBtb2RlLicsXG4gICAgICAgIFN0cmljdER1cGxpY2F0ZVByb3BlcnR5OiAgJ0R1cGxpY2F0ZSBkYXRhIHByb3BlcnR5IGluIG9iamVjdCBsaXRlcmFsIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgQWNjZXNzb3JEYXRhUHJvcGVydHk6ICAnT2JqZWN0IGxpdGVyYWwgbWF5IG5vdCBoYXZlIGRhdGEgYW5kIGFjY2Vzc29yIHByb3BlcnR5IHdpdGggdGhlIHNhbWUgbmFtZScsXG4gICAgICAgIEFjY2Vzc29yR2V0U2V0OiAgJ09iamVjdCBsaXRlcmFsIG1heSBub3QgaGF2ZSBtdWx0aXBsZSBnZXQvc2V0IGFjY2Vzc29ycyB3aXRoIHRoZSBzYW1lIG5hbWUnLFxuICAgICAgICBTdHJpY3RMSFNBc3NpZ25tZW50OiAgJ0Fzc2lnbm1lbnQgdG8gZXZhbCBvciBhcmd1bWVudHMgaXMgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RMSFNQb3N0Zml4OiAgJ1Bvc3RmaXggaW5jcmVtZW50L2RlY3JlbWVudCBtYXkgbm90IGhhdmUgZXZhbCBvciBhcmd1bWVudHMgb3BlcmFuZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdExIU1ByZWZpeDogICdQcmVmaXggaW5jcmVtZW50L2RlY3JlbWVudCBtYXkgbm90IGhhdmUgZXZhbCBvciBhcmd1bWVudHMgb3BlcmFuZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFJlc2VydmVkV29yZDogICdVc2Ugb2YgZnV0dXJlIHJlc2VydmVkIHdvcmQgaW4gc3RyaWN0IG1vZGUnXG4gICAgfTtcblxuICAgIC8vIFNlZSBhbHNvIHRvb2xzL2dlbmVyYXRlLXVuaWNvZGUtcmVnZXgucHkuXG4gICAgUmVnZXggPSB7XG4gICAgICAgIE5vbkFzY2lpSWRlbnRpZmllclN0YXJ0OiBuZXcgUmVnRXhwKCdbXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MjdcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDVkMC1cXHUwNWVhXFx1MDVmMC1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4YTBcXHUwOGEyLVxcdTA4YWNcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk3N1xcdTA5NzktXFx1MDk3ZlxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzMzXFx1MGMzNS1cXHUwYzM5XFx1MGMzZFxcdTBjNThcXHUwYzU5XFx1MGM2MFxcdTBjNjFcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNjBcXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmMFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc3XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxY1xcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YzEtXFx1MTljN1xcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTJkXFx1MjEyZi1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MmUyZlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWQtXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZFxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZjY1xcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjk3XFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhNzhlXFx1YTc5MC1cXHVhNzkzXFx1YTdhMC1cXHVhN2FhXFx1YTdmOC1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE4MC1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYmMwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNdJyksXG4gICAgICAgIE5vbkFzY2lpSWRlbnRpZmllclBhcnQ6IG5ldyBSZWdFeHAoJ1tcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDMwMC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0ODMtXFx1MDQ4N1xcdTA0OGEtXFx1MDUyN1xcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYxLVxcdTA1ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNWQwLVxcdTA1ZWFcXHUwNWYwLVxcdTA1ZjJcXHUwNjEwLVxcdTA2MWFcXHUwNjIwLVxcdTA2NjlcXHUwNjZlLVxcdTA2ZDNcXHUwNmQ1LVxcdTA2ZGNcXHUwNmRmLVxcdTA2ZThcXHUwNmVhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMC1cXHUwNzRhXFx1MDc0ZC1cXHUwN2IxXFx1MDdjMC1cXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgyZFxcdTA4NDAtXFx1MDg1YlxcdTA4YTBcXHUwOGEyLVxcdTA4YWNcXHUwOGU0LVxcdTA4ZmVcXHUwOTAwLVxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTcxLVxcdTA5NzdcXHUwOTc5LVxcdTA5N2ZcXHUwOTgxLVxcdTA5ODNcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJjLVxcdTA5YzRcXHUwOWM3XFx1MDljOFxcdTA5Y2ItXFx1MDljZVxcdTA5ZDdcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllM1xcdTA5ZTYtXFx1MDlmMVxcdTBhMDEtXFx1MGEwM1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTY2LVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmMtXFx1MGFjNVxcdTBhYzctXFx1MGFjOVxcdTBhY2ItXFx1MGFjZFxcdTBhZDBcXHUwYWUwLVxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYjAxLVxcdTBiMDNcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzYy1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYzXFx1MGI2Ni1cXHUwYjZmXFx1MGI3MVxcdTBiODJcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDBcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMS1cXHUwYzAzXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzMzXFx1MGMzNS1cXHUwYzM5XFx1MGMzZC1cXHUwYzQ0XFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzU4XFx1MGM1OVxcdTBjNjAtXFx1MGM2M1xcdTBjNjYtXFx1MGM2ZlxcdTBjODJcXHUwYzgzXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiYy1cXHUwY2M0XFx1MGNjNi1cXHUwY2M4XFx1MGNjYS1cXHUwY2NkXFx1MGNkNVxcdTBjZDZcXHUwY2RlXFx1MGNlMC1cXHUwY2UzXFx1MGNlNi1cXHUwY2VmXFx1MGNmMVxcdTBjZjJcXHUwZDAyXFx1MGQwM1xcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2QtXFx1MGQ0NFxcdTBkNDYtXFx1MGQ0OFxcdTBkNGEtXFx1MGQ0ZVxcdTBkNTdcXHUwZDYwLVxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDdhLVxcdTBkN2ZcXHUwZDgyXFx1MGQ4M1xcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZGNhXFx1MGRjZi1cXHUwZGQ0XFx1MGRkNlxcdTBkZDgtXFx1MGRkZlxcdTBkZjJcXHUwZGYzXFx1MGUwMS1cXHUwZTNhXFx1MGU0MC1cXHUwZTRlXFx1MGU1MC1cXHUwZTU5XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjlcXHUwZWJiLVxcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVjOC1cXHUwZWNkXFx1MGVkMC1cXHUwZWQ5XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmMThcXHUwZjE5XFx1MGYyMC1cXHUwZjI5XFx1MGYzNVxcdTBmMzdcXHUwZjM5XFx1MGYzZS1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY3MS1cXHUwZjg0XFx1MGY4Ni1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMDAtXFx1MTA0OVxcdTEwNTAtXFx1MTA5ZFxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzVkLVxcdTEzNWZcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjBcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTRcXHUxNzIwLVxcdTE3MzRcXHUxNzQwLVxcdTE3NTNcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzcyXFx1MTc3M1xcdTE3ODAtXFx1MTdkM1xcdTE3ZDdcXHUxN2RjXFx1MTdkZFxcdTE3ZTAtXFx1MTdlOVxcdTE4MGItXFx1MTgwZFxcdTE4MTAtXFx1MTgxOVxcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxY1xcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NDYtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTE5ZDAtXFx1MTlkOVxcdTFhMDAtXFx1MWExYlxcdTFhMjAtXFx1MWE1ZVxcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFhYTdcXHUxYjAwLVxcdTFiNGJcXHUxYjUwLVxcdTFiNTlcXHUxYjZiLVxcdTFiNzNcXHUxYjgwLVxcdTFiZjNcXHUxYzAwLVxcdTFjMzdcXHUxYzQwLVxcdTFjNDlcXHUxYzRkLVxcdTFjN2RcXHUxY2QwLVxcdTFjZDJcXHUxY2Q0LVxcdTFjZjZcXHUxZDAwLVxcdTFkZTZcXHUxZGZjLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjAwY1xcdTIwMGRcXHUyMDNmXFx1MjA0MFxcdTIwNTRcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE5LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMmRcXHUyMTJmLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ3Zi1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MmRlMC1cXHUyZGZmXFx1MmUyZlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyZlxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOTlcXHUzMDlhXFx1MzA5ZC1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJkXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmNjXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjJiXFx1YTY0MC1cXHVhNjZmXFx1YTY3NC1cXHVhNjdkXFx1YTY3Zi1cXHVhNjk3XFx1YTY5Zi1cXHVhNmYxXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhNzhlXFx1YTc5MC1cXHVhNzkzXFx1YTdhMC1cXHVhN2FhXFx1YTdmOC1cXHVhODI3XFx1YTg0MC1cXHVhODczXFx1YTg4MC1cXHVhOGM0XFx1YThkMC1cXHVhOGQ5XFx1YThlMC1cXHVhOGY3XFx1YThmYlxcdWE5MDAtXFx1YTkyZFxcdWE5MzAtXFx1YTk1M1xcdWE5NjAtXFx1YTk3Y1xcdWE5ODAtXFx1YTljMFxcdWE5Y2YtXFx1YTlkOVxcdWFhMDAtXFx1YWEzNlxcdWFhNDAtXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdiXFx1YWE4MC1cXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVmXFx1YWFmMi1cXHVhYWY2XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWJjMC1cXHVhYmVhXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyNlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYxMC1cXHVmZjE5XFx1ZmYyMS1cXHVmZjNhXFx1ZmYzZlxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY10nKVxuICAgIH07XG5cbiAgICAvLyBFbnN1cmUgdGhlIGNvbmRpdGlvbiBpcyB0cnVlLCBvdGhlcndpc2UgdGhyb3cgYW4gZXJyb3IuXG4gICAgLy8gVGhpcyBpcyBvbmx5IHRvIGhhdmUgYSBiZXR0ZXIgY29udHJhY3Qgc2VtYW50aWMsIGkuZS4gYW5vdGhlciBzYWZldHkgbmV0XG4gICAgLy8gdG8gY2F0Y2ggYSBsb2dpYyBlcnJvci4gVGhlIGNvbmRpdGlvbiBzaGFsbCBiZSBmdWxmaWxsZWQgaW4gbm9ybWFsIGNhc2UuXG4gICAgLy8gRG8gTk9UIHVzZSB0aGlzIHRvIGVuZm9yY2UgYSBjZXJ0YWluIGNvbmRpdGlvbiBvbiBhbnkgdXNlciBpbnB1dC5cblxuICAgIGZ1bmN0aW9uIGFzc2VydChjb25kaXRpb24sIG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQVNTRVJUOiAnICsgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzbGljZVNvdXJjZShmcm9tLCB0bykge1xuICAgICAgICByZXR1cm4gc291cmNlLnNsaWNlKGZyb20sIHRvKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mICdlc3ByaW1hJ1swXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgc2xpY2VTb3VyY2UgPSBmdW5jdGlvbiBzbGljZUFycmF5U291cmNlKGZyb20sIHRvKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlLnNsaWNlKGZyb20sIHRvKS5qb2luKCcnKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RlY2ltYWxEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3ODknLmluZGV4T2YoY2gpID49IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNIZXhEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3ODlhYmNkZWZBQkNERUYnLmluZGV4T2YoY2gpID49IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNPY3RhbERpZ2l0KGNoKSB7XG4gICAgICAgIHJldHVybiAnMDEyMzQ1NjcnLmluZGV4T2YoY2gpID49IDA7XG4gICAgfVxuXG5cbiAgICAvLyA3LjIgV2hpdGUgU3BhY2VcblxuICAgIGZ1bmN0aW9uIGlzV2hpdGVTcGFjZShjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnICcpIHx8IChjaCA9PT0gJ1xcdTAwMDknKSB8fCAoY2ggPT09ICdcXHUwMDBCJykgfHxcbiAgICAgICAgICAgIChjaCA9PT0gJ1xcdTAwMEMnKSB8fCAoY2ggPT09ICdcXHUwMEEwJykgfHxcbiAgICAgICAgICAgIChjaC5jaGFyQ29kZUF0KDApID49IDB4MTY4MCAmJlxuICAgICAgICAgICAgICdcXHUxNjgwXFx1MTgwRVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBBXFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRicuaW5kZXhPZihjaCkgPj0gMCk7XG4gICAgfVxuXG4gICAgLy8gNy4zIExpbmUgVGVybWluYXRvcnNcblxuICAgIGZ1bmN0aW9uIGlzTGluZVRlcm1pbmF0b3IoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJ1xcbicgfHwgY2ggPT09ICdcXHInIHx8IGNoID09PSAnXFx1MjAyOCcgfHwgY2ggPT09ICdcXHUyMDI5Jyk7XG4gICAgfVxuXG4gICAgLy8gNy42IElkZW50aWZpZXIgTmFtZXMgYW5kIElkZW50aWZpZXJzXG5cbiAgICBmdW5jdGlvbiBpc0lkZW50aWZpZXJTdGFydChjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnJCcpIHx8IChjaCA9PT0gJ18nKSB8fCAoY2ggPT09ICdcXFxcJykgfHxcbiAgICAgICAgICAgIChjaCA+PSAnYScgJiYgY2ggPD0gJ3onKSB8fCAoY2ggPj0gJ0EnICYmIGNoIDw9ICdaJykgfHxcbiAgICAgICAgICAgICgoY2guY2hhckNvZGVBdCgwKSA+PSAweDgwKSAmJiBSZWdleC5Ob25Bc2NpaUlkZW50aWZpZXJTdGFydC50ZXN0KGNoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyUGFydChjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnJCcpIHx8IChjaCA9PT0gJ18nKSB8fCAoY2ggPT09ICdcXFxcJykgfHxcbiAgICAgICAgICAgIChjaCA+PSAnYScgJiYgY2ggPD0gJ3onKSB8fCAoY2ggPj0gJ0EnICYmIGNoIDw9ICdaJykgfHxcbiAgICAgICAgICAgICgoY2ggPj0gJzAnKSAmJiAoY2ggPD0gJzknKSkgfHxcbiAgICAgICAgICAgICgoY2guY2hhckNvZGVBdCgwKSA+PSAweDgwKSAmJiBSZWdleC5Ob25Bc2NpaUlkZW50aWZpZXJQYXJ0LnRlc3QoY2gpKTtcbiAgICB9XG5cbiAgICAvLyA3LjYuMS4yIEZ1dHVyZSBSZXNlcnZlZCBXb3Jkc1xuXG4gICAgZnVuY3Rpb24gaXNGdXR1cmVSZXNlcnZlZFdvcmQoaWQpIHtcbiAgICAgICAgc3dpdGNoIChpZCkge1xuXG4gICAgICAgIC8vIEZ1dHVyZSByZXNlcnZlZCB3b3Jkcy5cbiAgICAgICAgY2FzZSAnY2xhc3MnOlxuICAgICAgICBjYXNlICdlbnVtJzpcbiAgICAgICAgY2FzZSAnZXhwb3J0JzpcbiAgICAgICAgY2FzZSAnZXh0ZW5kcyc6XG4gICAgICAgIGNhc2UgJ2ltcG9ydCc6XG4gICAgICAgIGNhc2UgJ3N1cGVyJzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZChpZCkge1xuICAgICAgICBzd2l0Y2ggKGlkKSB7XG5cbiAgICAgICAgLy8gU3RyaWN0IE1vZGUgcmVzZXJ2ZWQgd29yZHMuXG4gICAgICAgIGNhc2UgJ2ltcGxlbWVudHMnOlxuICAgICAgICBjYXNlICdpbnRlcmZhY2UnOlxuICAgICAgICBjYXNlICdwYWNrYWdlJzpcbiAgICAgICAgY2FzZSAncHJpdmF0ZSc6XG4gICAgICAgIGNhc2UgJ3Byb3RlY3RlZCc6XG4gICAgICAgIGNhc2UgJ3B1YmxpYyc6XG4gICAgICAgIGNhc2UgJ3N0YXRpYyc6XG4gICAgICAgIGNhc2UgJ3lpZWxkJzpcbiAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzUmVzdHJpY3RlZFdvcmQoaWQpIHtcbiAgICAgICAgcmV0dXJuIGlkID09PSAnZXZhbCcgfHwgaWQgPT09ICdhcmd1bWVudHMnO1xuICAgIH1cblxuICAgIC8vIDcuNi4xLjEgS2V5d29yZHNcblxuICAgIGZ1bmN0aW9uIGlzS2V5d29yZChpZCkge1xuICAgICAgICB2YXIga2V5d29yZCA9IGZhbHNlO1xuICAgICAgICBzd2l0Y2ggKGlkLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnaWYnKSB8fCAoaWQgPT09ICdpbicpIHx8IChpZCA9PT0gJ2RvJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ3ZhcicpIHx8IChpZCA9PT0gJ2ZvcicpIHx8IChpZCA9PT0gJ25ldycpIHx8IChpZCA9PT0gJ3RyeScpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd0aGlzJykgfHwgKGlkID09PSAnZWxzZScpIHx8IChpZCA9PT0gJ2Nhc2UnKSB8fCAoaWQgPT09ICd2b2lkJykgfHwgKGlkID09PSAnd2l0aCcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd3aGlsZScpIHx8IChpZCA9PT0gJ2JyZWFrJykgfHwgKGlkID09PSAnY2F0Y2gnKSB8fCAoaWQgPT09ICd0aHJvdycpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICdyZXR1cm4nKSB8fCAoaWQgPT09ICd0eXBlb2YnKSB8fCAoaWQgPT09ICdkZWxldGUnKSB8fCAoaWQgPT09ICdzd2l0Y2gnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDc6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnZGVmYXVsdCcpIHx8IChpZCA9PT0gJ2ZpbmFsbHknKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnZnVuY3Rpb24nKSB8fCAoaWQgPT09ICdjb250aW51ZScpIHx8IChpZCA9PT0gJ2RlYnVnZ2VyJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxMDpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICdpbnN0YW5jZW9mJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChrZXl3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoaWQpIHtcbiAgICAgICAgLy8gRnV0dXJlIHJlc2VydmVkIHdvcmRzLlxuICAgICAgICAvLyAnY29uc3QnIGlzIHNwZWNpYWxpemVkIGFzIEtleXdvcmQgaW4gVjguXG4gICAgICAgIGNhc2UgJ2NvbnN0JzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIC8vIEZvciBjb21wYXRpYmxpdHkgdG8gU3BpZGVyTW9ua2V5IGFuZCBFUy5uZXh0XG4gICAgICAgIGNhc2UgJ3lpZWxkJzpcbiAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0cmljdCAmJiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQoaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpc0Z1dHVyZVJlc2VydmVkV29yZChpZCk7XG4gICAgfVxuXG4gICAgLy8gNy40IENvbW1lbnRzXG5cbiAgICBmdW5jdGlvbiBza2lwQ29tbWVudCgpIHtcbiAgICAgICAgdmFyIGNoLCBibG9ja0NvbW1lbnQsIGxpbmVDb21tZW50O1xuXG4gICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgICAgICBpZiAobGluZUNvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYmxvY2tDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4ICsgMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAgJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjYW5IZXhFc2NhcGUocHJlZml4KSB7XG4gICAgICAgIHZhciBpLCBsZW4sIGNoLCBjb2RlID0gMDtcblxuICAgICAgICBsZW4gPSAocHJlZml4ID09PSAndScpID8gNCA6IDI7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoICYmIGlzSGV4RGlnaXQoc291cmNlW2luZGV4XSkpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBjb2RlID0gY29kZSAqIDE2ICsgJzAxMjM0NTY3ODlhYmNkZWYnLmluZGV4T2YoY2gudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuSWRlbnRpZmllcigpIHtcbiAgICAgICAgdmFyIGNoLCBzdGFydCwgaWQsIHJlc3RvcmU7XG5cbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBpZiAoIWlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICBpZiAoc291cmNlW2luZGV4XSAhPT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgIGNoID0gc2NhbkhleEVzY2FwZSgndScpO1xuICAgICAgICAgICAgaWYgKGNoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgfHwgIWlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkID0gY2g7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICBpZCA9ICd1JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlkID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoIWlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gIT09ICd1Jykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGNoID0gc2NhbkhleEVzY2FwZSgndScpO1xuICAgICAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJyB8fCAhaXNJZGVudGlmaWVyUGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZCArPSBjaDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgICAgIGlkICs9ICd1JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlkICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZXJlIGlzIG5vIGtleXdvcmQgb3IgbGl0ZXJhbCB3aXRoIG9ubHkgb25lIGNoYXJhY3Rlci5cbiAgICAgICAgLy8gVGh1cywgaXQgbXVzdCBiZSBhbiBpZGVudGlmaWVyLlxuICAgICAgICBpZiAoaWQubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzS2V5d29yZChpZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uS2V5d29yZCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyA3LjguMSBOdWxsIExpdGVyYWxzXG5cbiAgICAgICAgaWYgKGlkID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uTnVsbExpdGVyYWwsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNy44LjIgQm9vbGVhbiBMaXRlcmFsc1xuXG4gICAgICAgIGlmIChpZCA9PT0gJ3RydWUnIHx8IGlkID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLkJvb2xlYW5MaXRlcmFsLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbi5JZGVudGlmaWVyLFxuICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gNy43IFB1bmN0dWF0b3JzXG5cbiAgICBmdW5jdGlvbiBzY2FuUHVuY3R1YXRvcigpIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gaW5kZXgsXG4gICAgICAgICAgICBjaDEgPSBzb3VyY2VbaW5kZXhdLFxuICAgICAgICAgICAgY2gyLFxuICAgICAgICAgICAgY2gzLFxuICAgICAgICAgICAgY2g0O1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBtb3N0IGNvbW1vbiBzaW5nbGUtY2hhcmFjdGVyIHB1bmN0dWF0b3JzLlxuXG4gICAgICAgIGlmIChjaDEgPT09ICc7JyB8fCBjaDEgPT09ICd7JyB8fCBjaDEgPT09ICd9Jykge1xuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogY2gxLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJywnIHx8IGNoMSA9PT0gJygnIHx8IGNoMSA9PT0gJyknKSB7XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBjaDEsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEb3QgKC4pIGNhbiBhbHNvIHN0YXJ0IGEgZmxvYXRpbmctcG9pbnQgbnVtYmVyLCBoZW5jZSB0aGUgbmVlZFxuICAgICAgICAvLyB0byBjaGVjayB0aGUgbmV4dCBjaGFyYWN0ZXIuXG5cbiAgICAgICAgY2gyID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgIGlmIChjaDEgPT09ICcuJyAmJiAhaXNEZWNpbWFsRGlnaXQoY2gyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBzb3VyY2VbaW5kZXgrK10sXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQZWVrIG1vcmUgY2hhcmFjdGVycy5cblxuICAgICAgICBjaDMgPSBzb3VyY2VbaW5kZXggKyAyXTtcbiAgICAgICAgY2g0ID0gc291cmNlW2luZGV4ICsgM107XG5cbiAgICAgICAgLy8gNC1jaGFyYWN0ZXIgcHVuY3R1YXRvcjogPj4+PVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc+JyAmJiBjaDIgPT09ICc+JyAmJiBjaDMgPT09ICc+Jykge1xuICAgICAgICAgICAgaWYgKGNoNCA9PT0gJz0nKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJz4+Pj0nLFxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDMtY2hhcmFjdGVyIHB1bmN0dWF0b3JzOiA9PT0gIT09ID4+PiA8PD0gPj49XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJz0nICYmIGNoMiA9PT0gJz0nICYmIGNoMyA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPT09JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICchJyAmJiBjaDIgPT09ICc9JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJyE9PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPicpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj4nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJzwnICYmIGNoMiA9PT0gJzwnICYmIGNoMyA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPDw9JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc+JyAmJiBjaDIgPT09ICc+JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJz4+PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyAyLWNoYXJhY3RlciBwdW5jdHVhdG9yczogPD0gPj0gPT0gIT0gKysgLS0gPDwgPj4gJiYgfHxcbiAgICAgICAgLy8gKz0gLT0gKj0gJT0gJj0gfD0gXj0gLz1cblxuICAgICAgICBpZiAoY2gyID09PSAnPScpIHtcbiAgICAgICAgICAgIGlmICgnPD49ISstKiUmfF4vJy5pbmRleE9mKGNoMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNoMSArIGNoMixcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSBjaDIgJiYgKCcrLTw+JnwnLmluZGV4T2YoY2gxKSA+PSAwKSkge1xuICAgICAgICAgICAgaWYgKCcrLTw+JnwnLmluZGV4T2YoY2gyKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY2gxICsgY2gyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSByZW1haW5pbmcgMS1jaGFyYWN0ZXIgcHVuY3R1YXRvcnMuXG5cbiAgICAgICAgaWYgKCdbXTw+Ky0qJSZ8XiF+Pzo9LycuaW5kZXhPZihjaDEpID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogc291cmNlW2luZGV4KytdLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gNy44LjMgTnVtZXJpYyBMaXRlcmFsc1xuXG4gICAgZnVuY3Rpb24gc2Nhbk51bWVyaWNMaXRlcmFsKCkge1xuICAgICAgICB2YXIgbnVtYmVyLCBzdGFydCwgY2g7XG5cbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBhc3NlcnQoaXNEZWNpbWFsRGlnaXQoY2gpIHx8IChjaCA9PT0gJy4nKSxcbiAgICAgICAgICAgICdOdW1lcmljIGxpdGVyYWwgbXVzdCBzdGFydCB3aXRoIGEgZGVjaW1hbCBkaWdpdCBvciBhIGRlY2ltYWwgcG9pbnQnKTtcblxuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICBudW1iZXIgPSAnJztcbiAgICAgICAgaWYgKGNoICE9PSAnLicpIHtcbiAgICAgICAgICAgIG51bWJlciA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICAgICAgLy8gSGV4IG51bWJlciBzdGFydHMgd2l0aCAnMHgnLlxuICAgICAgICAgICAgLy8gT2N0YWwgbnVtYmVyIHN0YXJ0cyB3aXRoICcwJy5cbiAgICAgICAgICAgIGlmIChudW1iZXIgPT09ICcwJykge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ3gnIHx8IGNoID09PSAnWCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzSGV4RGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bWJlci5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSAweFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUludChudW1iZXIsIDE2KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSB8fCBpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bWVyaWNMaXRlcmFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlSW50KG51bWJlciwgOCksXG4gICAgICAgICAgICAgICAgICAgICAgICBvY3RhbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGRlY2ltYWwgbnVtYmVyIHN0YXJ0cyB3aXRoICcwJyBzdWNoIGFzICcwOScgaXMgaWxsZWdhbC5cbiAgICAgICAgICAgICAgICBpZiAoaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJy4nKSB7XG4gICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmICghaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoID09PSAnZScgfHwgY2ggPT09ICdFJykge1xuICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcblxuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKGNoID09PSAnKycgfHwgY2ggPT09ICctJykge1xuICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2ggPSAnY2hhcmFjdGVyICcgKyBjaDtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gJzxlbmQ+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bWVyaWNMaXRlcmFsLFxuICAgICAgICAgICAgdmFsdWU6IHBhcnNlRmxvYXQobnVtYmVyKSxcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDcuOC40IFN0cmluZyBMaXRlcmFsc1xuXG4gICAgZnVuY3Rpb24gc2NhblN0cmluZ0xpdGVyYWwoKSB7XG4gICAgICAgIHZhciBzdHIgPSAnJywgcXVvdGUsIHN0YXJ0LCBjaCwgY29kZSwgdW5lc2NhcGVkLCByZXN0b3JlLCBvY3RhbCA9IGZhbHNlO1xuXG4gICAgICAgIHF1b3RlID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KChxdW90ZSA9PT0gJ1xcJycgfHwgcXVvdGUgPT09ICdcIicpLFxuICAgICAgICAgICAgJ1N0cmluZyBsaXRlcmFsIG11c3Qgc3RhcnRzIHdpdGggYSBxdW90ZScpO1xuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICsraW5kZXg7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcblxuICAgICAgICAgICAgaWYgKGNoID09PSBxdW90ZSkge1xuICAgICAgICAgICAgICAgIHF1b3RlID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY2gpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xccic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3gnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5lc2NhcGVkID0gc2NhbkhleEVzY2FwZShjaCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodW5lc2NhcGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IHVuZXNjYXBlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxiJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxmJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFx4MEInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc09jdGFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9ICcwMTIzNDU2NycuaW5kZXhPZihjaCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcXDAgaXMgbm90IG9jdGFsIGVzY2FwZSBzZXF1ZW5jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9jdGFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGggJiYgaXNPY3RhbERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9jdGFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiA4ICsgJzAxMjM0NTY3Jy5pbmRleE9mKHNvdXJjZVtpbmRleCsrXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMyBkaWdpdHMgYXJlIG9ubHkgYWxsb3dlZCB3aGVuIHN0cmluZyBzdGFydHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2l0aCAwLCAxLCAyLCAzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnMDEyMycuaW5kZXhPZihjaCkgPj0gMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4IDwgbGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNPY3RhbERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlID0gY29kZSAqIDggKyAnMDEyMzQ1NjcnLmluZGV4T2Yoc291cmNlW2luZGV4KytdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocXVvdGUgIT09ICcnKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW4uU3RyaW5nTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiBzdHIsXG4gICAgICAgICAgICBvY3RhbDogb2N0YWwsXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuUmVnRXhwKCkge1xuICAgICAgICB2YXIgc3RyLCBjaCwgc3RhcnQsIHBhdHRlcm4sIGZsYWdzLCB2YWx1ZSwgY2xhc3NNYXJrZXIgPSBmYWxzZSwgcmVzdG9yZSwgdGVybWluYXRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgIHNraXBDb21tZW50KCk7XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBhc3NlcnQoY2ggPT09ICcvJywgJ1JlZ3VsYXIgZXhwcmVzc2lvbiBsaXRlcmFsIG11c3Qgc3RhcnQgd2l0aCBhIHNsYXNoJyk7XG4gICAgICAgIHN0ciA9IHNvdXJjZVtpbmRleCsrXTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAvLyBFQ01BLTI2MiA3LjguNVxuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTWFya2VyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NNYXJrZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm1pbmF0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnWycpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NNYXJrZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW50ZXJtaW5hdGVkUmVnRXhwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRlcm1pbmF0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVudGVybWluYXRlZFJlZ0V4cCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeGNsdWRlIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoLlxuICAgICAgICBwYXR0ZXJuID0gc3RyLnN1YnN0cigxLCBzdHIubGVuZ3RoIC0gMik7XG5cbiAgICAgICAgZmxhZ3MgPSAnJztcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoIWlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJyAmJiBpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICd1Jykge1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICByZXN0b3JlID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gc2NhbkhleEVzY2FwZSgndScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXFxcdSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKDsgcmVzdG9yZSA8IGluZGV4OyArK3Jlc3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gc291cmNlW3Jlc3RvcmVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3MgKz0gJ3UnO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXFxcdSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcXFwnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmxhZ3MgKz0gY2g7XG4gICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhbHVlID0gbmV3IFJlZ0V4cChwYXR0ZXJuLCBmbGFncyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRSZWdFeHApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGxpdGVyYWw6IHN0cixcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSWRlbnRpZmllck5hbWUodG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIgfHxcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQgfHxcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuLkJvb2xlYW5MaXRlcmFsIHx8XG4gICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5OdWxsTGl0ZXJhbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZHZhbmNlKCkge1xuICAgICAgICB2YXIgY2gsIHRva2VuO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG5cbiAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5FT0YsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW2luZGV4LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IHNjYW5QdW5jdHVhdG9yKCk7XG4gICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgaWYgKGNoID09PSAnXFwnJyB8fCBjaCA9PT0gJ1wiJykge1xuICAgICAgICAgICAgcmV0dXJuIHNjYW5TdHJpbmdMaXRlcmFsKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2ggPT09ICcuJyB8fCBpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2FuTnVtZXJpY0xpdGVyYWwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gc2NhbklkZW50aWZpZXIoKTtcbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsZXgoKSB7XG4gICAgICAgIHZhciB0b2tlbjtcblxuICAgICAgICBpZiAoYnVmZmVyKSB7XG4gICAgICAgICAgICBpbmRleCA9IGJ1ZmZlci5yYW5nZVsxXTtcbiAgICAgICAgICAgIGxpbmVOdW1iZXIgPSBidWZmZXIubGluZU51bWJlcjtcbiAgICAgICAgICAgIGxpbmVTdGFydCA9IGJ1ZmZlci5saW5lU3RhcnQ7XG4gICAgICAgICAgICB0b2tlbiA9IGJ1ZmZlcjtcbiAgICAgICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICByZXR1cm4gYWR2YW5jZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvb2thaGVhZCgpIHtcbiAgICAgICAgdmFyIHBvcywgbGluZSwgc3RhcnQ7XG5cbiAgICAgICAgaWYgKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHBvcyA9IGluZGV4O1xuICAgICAgICBsaW5lID0gbGluZU51bWJlcjtcbiAgICAgICAgc3RhcnQgPSBsaW5lU3RhcnQ7XG4gICAgICAgIGJ1ZmZlciA9IGFkdmFuY2UoKTtcbiAgICAgICAgaW5kZXggPSBwb3M7XG4gICAgICAgIGxpbmVOdW1iZXIgPSBsaW5lO1xuICAgICAgICBsaW5lU3RhcnQgPSBzdGFydDtcblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZXJlIGlzIGEgbGluZSB0ZXJtaW5hdG9yIGJlZm9yZSB0aGUgbmV4dCB0b2tlbi5cblxuICAgIGZ1bmN0aW9uIHBlZWtMaW5lVGVybWluYXRvcigpIHtcbiAgICAgICAgdmFyIHBvcywgbGluZSwgc3RhcnQsIGZvdW5kO1xuXG4gICAgICAgIHBvcyA9IGluZGV4O1xuICAgICAgICBsaW5lID0gbGluZU51bWJlcjtcbiAgICAgICAgc3RhcnQgPSBsaW5lU3RhcnQ7XG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIGZvdW5kID0gbGluZU51bWJlciAhPT0gbGluZTtcbiAgICAgICAgaW5kZXggPSBwb3M7XG4gICAgICAgIGxpbmVOdW1iZXIgPSBsaW5lO1xuICAgICAgICBsaW5lU3RhcnQgPSBzdGFydDtcblxuICAgICAgICByZXR1cm4gZm91bmQ7XG4gICAgfVxuXG4gICAgLy8gVGhyb3cgYW4gZXhjZXB0aW9uXG5cbiAgICBmdW5jdGlvbiB0aHJvd0Vycm9yKHRva2VuLCBtZXNzYWdlRm9ybWF0KSB7XG4gICAgICAgIHZhciBlcnJvcixcbiAgICAgICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpLFxuICAgICAgICAgICAgbXNnID0gbWVzc2FnZUZvcm1hdC5yZXBsYWNlKFxuICAgICAgICAgICAgICAgIC8lKFxcZCkvZyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAod2hvbGUsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmdzW2luZGV4XSB8fCAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuXG4gICAgICAgIGlmICh0eXBlb2YgdG9rZW4ubGluZU51bWJlciA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKCdMaW5lICcgKyB0b2tlbi5saW5lTnVtYmVyICsgJzogJyArIG1zZyk7XG4gICAgICAgICAgICBlcnJvci5pbmRleCA9IHRva2VuLnJhbmdlWzBdO1xuICAgICAgICAgICAgZXJyb3IubGluZU51bWJlciA9IHRva2VuLmxpbmVOdW1iZXI7XG4gICAgICAgICAgICBlcnJvci5jb2x1bW4gPSB0b2tlbi5yYW5nZVswXSAtIGxpbmVTdGFydCArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcignTGluZSAnICsgbGluZU51bWJlciArICc6ICcgKyBtc2cpO1xuICAgICAgICAgICAgZXJyb3IuaW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgIGVycm9yLmxpbmVOdW1iZXIgPSBsaW5lTnVtYmVyO1xuICAgICAgICAgICAgZXJyb3IuY29sdW1uID0gaW5kZXggLSBsaW5lU3RhcnQgKyAxO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dFcnJvclRvbGVyYW50KCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhyb3dFcnJvci5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZXh0cmEuZXJyb3JzKSB7XG4gICAgICAgICAgICAgICAgZXh0cmEuZXJyb3JzLnB1c2goZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8vIFRocm93IGFuIGV4Y2VwdGlvbiBiZWNhdXNlIG9mIHRoZSB0b2tlbi5cblxuICAgIGZ1bmN0aW9uIHRocm93VW5leHBlY3RlZCh0b2tlbikge1xuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkRU9TKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5OdW1lcmljTGl0ZXJhbCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZE51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFN0cmluZyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZElkZW50aWZpZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIGlmIChpc0Z1dHVyZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkUmVzZXJ2ZWQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdHJpY3QgJiYgaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sIHRva2VuLnZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJvb2xlYW5MaXRlcmFsLCBOdWxsTGl0ZXJhbCwgb3IgUHVuY3R1YXRvci5cbiAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCB0b2tlbi52YWx1ZSk7XG4gICAgfVxuXG4gICAgLy8gRXhwZWN0IHRoZSBuZXh0IHRva2VuIHRvIG1hdGNoIHRoZSBzcGVjaWZpZWQgcHVuY3R1YXRvci5cbiAgICAvLyBJZiBub3QsIGFuIGV4Y2VwdGlvbiB3aWxsIGJlIHRocm93bi5cblxuICAgIGZ1bmN0aW9uIGV4cGVjdCh2YWx1ZSkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IgfHwgdG9rZW4udmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRXhwZWN0IHRoZSBuZXh0IHRva2VuIHRvIG1hdGNoIHRoZSBzcGVjaWZpZWQga2V5d29yZC5cbiAgICAvLyBJZiBub3QsIGFuIGV4Y2VwdGlvbiB3aWxsIGJlIHRocm93bi5cblxuICAgIGZ1bmN0aW9uIGV4cGVjdEtleXdvcmQoa2V5d29yZCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLktleXdvcmQgfHwgdG9rZW4udmFsdWUgIT09IGtleXdvcmQpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGUgbmV4dCB0b2tlbiBtYXRjaGVzIHRoZSBzcGVjaWZpZWQgcHVuY3R1YXRvci5cblxuICAgIGZ1bmN0aW9uIG1hdGNoKHZhbHVlKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICByZXR1cm4gdG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvciAmJiB0b2tlbi52YWx1ZSA9PT0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlIG5leHQgdG9rZW4gbWF0Y2hlcyB0aGUgc3BlY2lmaWVkIGtleXdvcmRcblxuICAgIGZ1bmN0aW9uIG1hdGNoS2V5d29yZChrZXl3b3JkKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICByZXR1cm4gdG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCAmJiB0b2tlbi52YWx1ZSA9PT0ga2V5d29yZDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGUgbmV4dCB0b2tlbiBpcyBhbiBhc3NpZ25tZW50IG9wZXJhdG9yXG5cbiAgICBmdW5jdGlvbiBtYXRjaEFzc2lnbigpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCksXG4gICAgICAgICAgICBvcCA9IHRva2VuLnZhbHVlO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wID09PSAnPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnKj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJy89JyB8fFxuICAgICAgICAgICAgb3AgPT09ICclPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnKz0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJy09JyB8fFxuICAgICAgICAgICAgb3AgPT09ICc8PD0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJz4+PScgfHxcbiAgICAgICAgICAgIG9wID09PSAnPj4+PScgfHxcbiAgICAgICAgICAgIG9wID09PSAnJj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJ149JyB8fFxuICAgICAgICAgICAgb3AgPT09ICd8PSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29uc3VtZVNlbWljb2xvbigpIHtcbiAgICAgICAgdmFyIHRva2VuLCBsaW5lO1xuXG4gICAgICAgIC8vIENhdGNoIHRoZSB2ZXJ5IGNvbW1vbiBjYXNlIGZpcnN0LlxuICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJzsnKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBpZiAobGluZU51bWJlciAhPT0gbGluZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCc7JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLkVPRiAmJiAhbWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHByb3ZpZGVkIGV4cHJlc3Npb24gaXMgTGVmdEhhbmRTaWRlRXhwcmVzc2lvblxuXG4gICAgZnVuY3Rpb24gaXNMZWZ0SGFuZFNpZGUoZXhwcikge1xuICAgICAgICByZXR1cm4gZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciB8fCBleHByLnR5cGUgPT09IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIDExLjEuNCBBcnJheSBJbml0aWFsaXNlclxuXG4gICAgZnVuY3Rpb24gcGFyc2VBcnJheUluaXRpYWxpc2VyKCkge1xuICAgICAgICB2YXIgZWxlbWVudHMgPSBbXTtcblxuICAgICAgICBleHBlY3QoJ1snKTtcblxuICAgICAgICB3aGlsZSAoIW1hdGNoKCddJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCkpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaCgnXScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCgnLCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnXScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQXJyYXlFeHByZXNzaW9uLFxuICAgICAgICAgICAgZWxlbWVudHM6IGVsZW1lbnRzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTEuMS41IE9iamVjdCBJbml0aWFsaXNlclxuXG4gICAgZnVuY3Rpb24gcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKHBhcmFtLCBmaXJzdCkge1xuICAgICAgICB2YXIgcHJldmlvdXNTdHJpY3QsIGJvZHk7XG5cbiAgICAgICAgcHJldmlvdXNTdHJpY3QgPSBzdHJpY3Q7XG4gICAgICAgIGJvZHkgPSBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMoKTtcbiAgICAgICAgaWYgKGZpcnN0ICYmIHN0cmljdCAmJiBpc1Jlc3RyaWN0ZWRXb3JkKHBhcmFtWzBdLm5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoZmlyc3QsIE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb24sXG4gICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgIHBhcmFtczogcGFyYW0sXG4gICAgICAgICAgICBkZWZhdWx0czogW10sXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgcmVzdDogbnVsbCxcbiAgICAgICAgICAgIGdlbmVyYXRvcjogZmFsc2UsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIC8vIE5vdGU6IFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9ubHkgZnJvbSBwYXJzZU9iamVjdFByb3BlcnR5KCksIHdoZXJlXG4gICAgICAgIC8vIEVPRiBhbmQgUHVuY3R1YXRvciB0b2tlbnMgYXJlIGFscmVhZHkgZmlsdGVyZWQgb3V0LlxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5TdHJpbmdMaXRlcmFsIHx8IHRva2VuLnR5cGUgPT09IFRva2VuLk51bWVyaWNMaXRlcmFsKSB7XG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIHRva2VuLm9jdGFsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgbmFtZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU9iamVjdFByb3BlcnR5KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGtleSwgaWQsIHBhcmFtO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcblxuICAgICAgICAgICAgaWQgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG5cbiAgICAgICAgICAgIC8vIFByb3BlcnR5IEFzc2lnbm1lbnQ6IEdldHRlciBhbmQgU2V0dGVyLlxuXG4gICAgICAgICAgICBpZiAodG9rZW4udmFsdWUgPT09ICdnZXQnICYmICFtYXRjaCgnOicpKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnKCcpO1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnKScpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZVByb3BlcnR5RnVuY3Rpb24oW10pLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiAnZ2V0J1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnZhbHVlID09PSAnc2V0JyAmJiAhbWF0Y2goJzonKSkge1xuICAgICAgICAgICAgICAgIGtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoJygnKTtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCgnKScpO1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgdG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKFtdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdzZXQnXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW0gPSBbIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCkgXTtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0KCcpJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZVByb3BlcnR5RnVuY3Rpb24ocGFyYW0sIHRva2VuKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdzZXQnXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoJzonKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgIGtleTogaWQsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdpbml0J1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uRU9GIHx8IHRva2VuLnR5cGUgPT09IFRva2VuLlB1bmN0dWF0b3IpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG4gICAgICAgICAgICBleHBlY3QoJzonKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAga2luZDogJ2luaXQnXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VPYmplY3RJbml0aWFsaXNlcigpIHtcbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBbXSwgcHJvcGVydHksIG5hbWUsIGtpbmQsIG1hcCA9IHt9LCB0b1N0cmluZyA9IFN0cmluZztcblxuICAgICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgICB3aGlsZSAoIW1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgIHByb3BlcnR5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eSgpO1xuXG4gICAgICAgICAgICBpZiAocHJvcGVydHkua2V5LnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IHByb3BlcnR5LmtleS5uYW1lO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gdG9TdHJpbmcocHJvcGVydHkua2V5LnZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtpbmQgPSAocHJvcGVydHkua2luZCA9PT0gJ2luaXQnKSA/IFByb3BlcnR5S2luZC5EYXRhIDogKHByb3BlcnR5LmtpbmQgPT09ICdnZXQnKSA/IFByb3BlcnR5S2luZC5HZXQgOiBQcm9wZXJ0eUtpbmQuU2V0O1xuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtYXAsIG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1hcFtuYW1lXSA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBraW5kID09PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3REdXBsaWNhdGVQcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2luZCAhPT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuQWNjZXNzb3JEYXRhUHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtpbmQgPT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLkFjY2Vzc29yRGF0YVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtYXBbbmFtZV0gJiBraW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLkFjY2Vzc29yR2V0U2V0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtYXBbbmFtZV0gfD0ga2luZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWFwW25hbWVdID0ga2luZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJvcGVydGllcy5wdXNoKHByb3BlcnR5KTtcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJ30nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4Lk9iamVjdEV4cHJlc3Npb24sXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTEuMS42IFRoZSBHcm91cGluZyBPcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gcGFyc2VHcm91cEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cblxuICAgIC8vIDExLjEgUHJpbWFyeSBFeHByZXNzaW9uc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCksXG4gICAgICAgICAgICB0eXBlID0gdG9rZW4udHlwZTtcblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICBuYW1lOiBsZXgoKS52YWx1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5TdHJpbmdMaXRlcmFsIHx8IHR5cGUgPT09IFRva2VuLk51bWVyaWNMaXRlcmFsKSB7XG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIHRva2VuLm9jdGFsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwobGV4KCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ3RoaXMnKSkge1xuICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5UaGlzRXhwcmVzc2lvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5Cb29sZWFuTGl0ZXJhbCkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICB0b2tlbi52YWx1ZSA9ICh0b2tlbi52YWx1ZSA9PT0gJ3RydWUnKTtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5OdWxsTGl0ZXJhbCkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICB0b2tlbi52YWx1ZSA9IG51bGw7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlQXJyYXlJbml0aWFsaXNlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCd7JykpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZU9iamVjdEluaXRpYWxpc2VyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJygnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlR3JvdXBFeHByZXNzaW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJy8nKSB8fCBtYXRjaCgnLz0nKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwoc2NhblJlZ0V4cCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aHJvd1VuZXhwZWN0ZWQobGV4KCkpO1xuICAgIH1cblxuICAgIC8vIDExLjIgTGVmdC1IYW5kLVNpZGUgRXhwcmVzc2lvbnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlQXJndW1lbnRzKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGlmICghbWF0Y2goJyknKSkge1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSk7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4cGVjdCgnLCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcmV0dXJuIGFyZ3M7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VOb25Db21wdXRlZFByb3BlcnR5KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICBpZiAoIWlzSWRlbnRpZmllck5hbWUodG9rZW4pKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgbmFtZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKCkge1xuICAgICAgICBleHBlY3QoJy4nKTtcblxuICAgICAgICByZXR1cm4gcGFyc2VOb25Db21wdXRlZFByb3BlcnR5KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VDb21wdXRlZE1lbWJlcigpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwZWN0KCdbJyk7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnXScpO1xuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTmV3RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnbmV3Jyk7XG5cbiAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5OZXdFeHByZXNzaW9uLFxuICAgICAgICAgICAgY2FsbGVlOiBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICdhcmd1bWVudHMnOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICBleHByWydhcmd1bWVudHMnXSA9IHBhcnNlQXJndW1lbnRzKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwoKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSB8fCBtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJygnKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY2FsbGVlOiBleHByLFxuICAgICAgICAgICAgICAgICAgICAnYXJndW1lbnRzJzogcGFyc2VBcmd1bWVudHMoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VDb21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjMgUG9zdGZpeCBFeHByZXNzaW9uc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwoKSwgdG9rZW47XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChtYXRjaCgnKysnKSB8fCBtYXRjaCgnLS0nKSkgJiYgIXBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICAvLyAxMS4zLjEsIDExLjMuMlxuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyICYmIGlzUmVzdHJpY3RlZFdvcmQoZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0TEhTUG9zdGZpeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGV4cHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Bc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVXBkYXRlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcHJlZml4OiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjQgVW5hcnkgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIHRva2VuLCBleHByO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yICYmIHRva2VuLnR5cGUgIT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVBvc3RmaXhFeHByZXNzaW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJysrJykgfHwgbWF0Y2goJy0tJykpIHtcbiAgICAgICAgICAgIHRva2VuID0gbGV4KCk7XG4gICAgICAgICAgICBleHByID0gcGFyc2VVbmFyeUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIC8vIDExLjQuNCwgMTEuNC41XG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgJiYgaXNSZXN0cmljdGVkV29yZChleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RMSFNQcmVmaXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGV4cHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Bc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVXBkYXRlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogdG9rZW4udmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJysnKSB8fCBtYXRjaCgnLScpIHx8IG1hdGNoKCd+JykgfHwgbWF0Y2goJyEnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICBwcmVmaXg6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2RlbGV0ZScpIHx8IG1hdGNoS2V5d29yZCgndm9pZCcpIHx8IG1hdGNoS2V5d29yZCgndHlwZW9mJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVuYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IHBhcnNlVW5hcnlFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLm9wZXJhdG9yID09PSAnZGVsZXRlJyAmJiBleHByLmFyZ3VtZW50LnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3REZWxldGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpO1xuICAgIH1cblxuICAgIC8vIDExLjUgTXVsdGlwbGljYXRpdmUgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnKicpIHx8IG1hdGNoKCcvJykgfHwgbWF0Y2goJyUnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjYgQWRkaXRpdmUgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnKycpIHx8IG1hdGNoKCctJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS43IEJpdHdpc2UgU2hpZnQgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVNoaWZ0RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnPDwnKSB8fCBtYXRjaCgnPj4nKSB8fCBtYXRjaCgnPj4+JykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG4gICAgLy8gMTEuOCBSZWxhdGlvbmFsIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIsIHByZXZpb3VzQWxsb3dJbjtcblxuICAgICAgICBwcmV2aW91c0FsbG93SW4gPSBzdGF0ZS5hbGxvd0luO1xuICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcblxuICAgICAgICBleHByID0gcGFyc2VTaGlmdEV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJzwnKSB8fCBtYXRjaCgnPicpIHx8IG1hdGNoKCc8PScpIHx8IG1hdGNoKCc+PScpIHx8IChwcmV2aW91c0FsbG93SW4gJiYgbWF0Y2hLZXl3b3JkKCdpbicpKSB8fCBtYXRjaEtleXdvcmQoJ2luc3RhbmNlb2YnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VTaGlmdEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmFsbG93SW4gPSBwcmV2aW91c0FsbG93SW47XG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjkgRXF1YWxpdHkgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCc9PScpIHx8IG1hdGNoKCchPScpIHx8IG1hdGNoKCc9PT0nKSB8fCBtYXRjaCgnIT09JykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjEwIEJpbmFyeSBCaXR3aXNlIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnJicpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcmJyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCdeJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ14nLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCd8JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ3wnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjExIEJpbmFyeSBMb2dpY2FsIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJyYmJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTG9naWNhbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcmJicsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnfHwnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ3x8JyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMiBDb25kaXRpb25hbCBPcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByLCBwcmV2aW91c0FsbG93SW4sIGNvbnNlcXVlbnQ7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnPycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHByZXZpb3VzQWxsb3dJbiA9IHN0YXRlLmFsbG93SW47XG4gICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNlcXVlbnQgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gcHJldmlvdXNBbGxvd0luO1xuICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICB0ZXN0OiBleHByLFxuICAgICAgICAgICAgICAgIGNvbnNlcXVlbnQ6IGNvbnNlcXVlbnQsXG4gICAgICAgICAgICAgICAgYWx0ZXJuYXRlOiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMyBBc3NpZ25tZW50IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIHRva2VuLCBleHByO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGV4cHIgPSBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGlmIChtYXRjaEFzc2lnbigpKSB7XG4gICAgICAgICAgICAvLyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG4gICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGV4cHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Bc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gMTEuMTMuMVxuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyICYmIGlzUmVzdHJpY3RlZFdvcmQoZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0TEhTQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xNCBDb21tYSBPcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcblxuICAgICAgICBpZiAobWF0Y2goJywnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguU2VxdWVuY2VFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb25zOiBbIGV4cHIgXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICBleHByLmV4cHJlc3Npb25zLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDEyLjEgQmxvY2tcblxuICAgIGZ1bmN0aW9uIHBhcnNlU3RhdGVtZW50TGlzdCgpIHtcbiAgICAgICAgdmFyIGxpc3QgPSBbXSxcbiAgICAgICAgICAgIHN0YXRlbWVudDtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhdGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGlzdC5wdXNoKHN0YXRlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJsb2NrKCkge1xuICAgICAgICB2YXIgYmxvY2s7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgYmxvY2sgPSBwYXJzZVN0YXRlbWVudExpc3QoKTtcblxuICAgICAgICBleHBlY3QoJ30nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkJsb2NrU3RhdGVtZW50LFxuICAgICAgICAgICAgYm9keTogYmxvY2tcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4yIFZhcmlhYmxlIFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgbmFtZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24oa2luZCkge1xuICAgICAgICB2YXIgaWQgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpLFxuICAgICAgICAgICAgaW5pdCA9IG51bGw7XG5cbiAgICAgICAgLy8gMTIuMi4xXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChpZC5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RWYXJOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChraW5kID09PSAnY29uc3QnKSB7XG4gICAgICAgICAgICBleHBlY3QoJz0nKTtcbiAgICAgICAgICAgIGluaXQgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2goJz0nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBpbml0ID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IsXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBpbml0OiBpbml0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChraW5kKSB7XG4gICAgICAgIHZhciBsaXN0ID0gW107XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgbGlzdC5wdXNoKHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbihraW5kKSk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICB9IHdoaWxlIChpbmRleCA8IGxlbmd0aCk7XG5cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGRlY2xhcmF0aW9ucztcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd2YXInKTtcblxuICAgICAgICBkZWNsYXJhdGlvbnMgPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25zLFxuICAgICAgICAgICAga2luZDogJ3ZhcidcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBraW5kIG1heSBiZSBgY29uc3RgIG9yIGBsZXRgXG4gICAgLy8gQm90aCBhcmUgZXhwZXJpbWVudGFsIGFuZCBub3QgaW4gdGhlIHNwZWNpZmljYXRpb24geWV0LlxuICAgIC8vIHNlZSBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmNvbnN0XG4gICAgLy8gYW5kIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6bGV0XG4gICAgZnVuY3Rpb24gcGFyc2VDb25zdExldERlY2xhcmF0aW9uKGtpbmQpIHtcbiAgICAgICAgdmFyIGRlY2xhcmF0aW9ucztcblxuICAgICAgICBleHBlY3RLZXl3b3JkKGtpbmQpO1xuXG4gICAgICAgIGRlY2xhcmF0aW9ucyA9IHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qoa2luZCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25zLFxuICAgICAgICAgICAga2luZDoga2luZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjMgRW1wdHkgU3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUVtcHR5U3RhdGVtZW50KCkge1xuICAgICAgICBleHBlY3QoJzsnKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkVtcHR5U3RhdGVtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNCBFeHByZXNzaW9uIFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBleHByXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNSBJZiBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlSWZTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0ZXN0LCBjb25zZXF1ZW50LCBhbHRlcm5hdGU7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnaWYnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgY29uc2VxdWVudCA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZWxzZScpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGFsdGVybmF0ZSA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbHRlcm5hdGUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZlN0YXRlbWVudCxcbiAgICAgICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgICAgICBjb25zZXF1ZW50OiBjb25zZXF1ZW50LFxuICAgICAgICAgICAgYWx0ZXJuYXRlOiBhbHRlcm5hdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi42IEl0ZXJhdGlvbiBTdGF0ZW1lbnRzXG5cbiAgICBmdW5jdGlvbiBwYXJzZURvV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBib2R5LCB0ZXN0LCBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdkbycpO1xuXG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gdHJ1ZTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3doaWxlJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRG9XaGlsZVN0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VXaGlsZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRlc3QsIGJvZHksIG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3doaWxlJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gdHJ1ZTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguV2hpbGVTdGF0ZW1lbnQsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgYm9keTogYm9keVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbigpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uLFxuICAgICAgICAgICAgZGVjbGFyYXRpb25zOiBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KCksXG4gICAgICAgICAgICBraW5kOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRm9yU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgaW5pdCwgdGVzdCwgdXBkYXRlLCBsZWZ0LCByaWdodCwgYm9keSwgb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgaW5pdCA9IHRlc3QgPSB1cGRhdGUgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2ZvcicpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ3ZhcicpIHx8IG1hdGNoS2V5d29yZCgnbGV0JykpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaW5pdCA9IHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbigpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKGluaXQuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSAmJiBtYXRjaEtleXdvcmQoJ2luJykpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSBpbml0O1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgICAgICBpbml0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpbml0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdpbicpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExlZnRIYW5kU2lkZUV4cHJlc3Npb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShpbml0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Gb3JJbik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IGluaXQ7XG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIGluaXQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnOycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJykge1xuXG4gICAgICAgICAgICBpZiAoIW1hdGNoKCc7JykpIHtcbiAgICAgICAgICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBleHBlY3QoJzsnKTtcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBpZiAodHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Gb3JTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgaW5pdDogaW5pdCxcbiAgICAgICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgICAgIHVwZGF0ZTogdXBkYXRlLFxuICAgICAgICAgICAgICAgIGJvZHk6IGJvZHlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZvckluU3RhdGVtZW50LFxuICAgICAgICAgICAgbGVmdDogbGVmdCxcbiAgICAgICAgICAgIHJpZ2h0OiByaWdodCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICBlYWNoOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjcgVGhlIGNvbnRpbnVlIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VDb250aW51ZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBsYWJlbCA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnY29udGludWUnKTtcblxuICAgICAgICAvLyBPcHRpbWl6ZSB0aGUgbW9zdCBjb21tb24gZm9ybTogJ2NvbnRpbnVlOycuXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnOycpIHtcbiAgICAgICAgICAgIGxleCgpO1xuXG4gICAgICAgICAgICBpZiAoIXN0YXRlLmluSXRlcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbENvbnRpbnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ29udGludWVTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIGlmICghc3RhdGUuaW5JdGVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQ29udGludWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db250aW51ZVN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICBsYWJlbCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG5cbiAgICAgICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLmxhYmVsU2V0LCBsYWJlbC5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVua25vd25MYWJlbCwgbGFiZWwubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgaWYgKGxhYmVsID09PSBudWxsICYmICFzdGF0ZS5pbkl0ZXJhdGlvbikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbENvbnRpbnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQ29udGludWVTdGF0ZW1lbnQsXG4gICAgICAgICAgICBsYWJlbDogbGFiZWxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi44IFRoZSBicmVhayBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlQnJlYWtTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiwgbGFiZWwgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2JyZWFrJyk7XG5cbiAgICAgICAgLy8gT3B0aW1pemUgdGhlIG1vc3QgY29tbW9uIGZvcm06ICdicmVhazsnLlxuICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJzsnKSB7XG4gICAgICAgICAgICBsZXgoKTtcblxuICAgICAgICAgICAgaWYgKCEoc3RhdGUuaW5JdGVyYXRpb24gfHwgc3RhdGUuaW5Td2l0Y2gpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbEJyZWFrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQnJlYWtTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIGlmICghKHN0YXRlLmluSXRlcmF0aW9uIHx8IHN0YXRlLmluU3dpdGNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxCcmVhayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJyZWFrU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIGxhYmVsID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcblxuICAgICAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RhdGUubGFiZWxTZXQsIGxhYmVsLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5rbm93bkxhYmVsLCBsYWJlbC5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICBpZiAobGFiZWwgPT09IG51bGwgJiYgIShzdGF0ZS5pbkl0ZXJhdGlvbiB8fCBzdGF0ZS5pblN3aXRjaCkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxCcmVhayk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkJyZWFrU3RhdGVtZW50LFxuICAgICAgICAgICAgbGFiZWw6IGxhYmVsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuOSBUaGUgcmV0dXJuIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VSZXR1cm5TdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiwgYXJndW1lbnQgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3JldHVybicpO1xuXG4gICAgICAgIGlmICghc3RhdGUuaW5GdW5jdGlvbkJvZHkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuSWxsZWdhbFJldHVybik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyAncmV0dXJuJyBmb2xsb3dlZCBieSBhIHNwYWNlIGFuZCBhbiBpZGVudGlmaWVyIGlzIHZlcnkgY29tbW9uLlxuICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJyAnKSB7XG4gICAgICAgICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoc291cmNlW2luZGV4ICsgMV0pKSB7XG4gICAgICAgICAgICAgICAgYXJndW1lbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlJldHVyblN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgYXJndW1lbnQ6IGFyZ3VtZW50XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUmV0dXJuU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCgnfScpICYmIHRva2VuLnR5cGUgIT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQsXG4gICAgICAgICAgICBhcmd1bWVudDogYXJndW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xMCBUaGUgd2l0aCBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlV2l0aFN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIG9iamVjdCwgYm9keTtcblxuICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdE1vZGVXaXRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3dpdGgnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBvYmplY3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LldpdGhTdGF0ZW1lbnQsXG4gICAgICAgICAgICBvYmplY3Q6IG9iamVjdCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xMCBUaGUgc3dpdGggc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVN3aXRjaENhc2UoKSB7XG4gICAgICAgIHZhciB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudCA9IFtdLFxuICAgICAgICAgICAgc3RhdGVtZW50O1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2RlZmF1bHQnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICB0ZXN0ID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4cGVjdEtleXdvcmQoJ2Nhc2UnKTtcbiAgICAgICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuICAgICAgICBleHBlY3QoJzonKTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpIHx8IG1hdGNoS2V5d29yZCgnZGVmYXVsdCcpIHx8IG1hdGNoS2V5d29yZCgnY2FzZScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzdGF0ZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zZXF1ZW50LnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguU3dpdGNoQ2FzZSxcbiAgICAgICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgICAgICBjb25zZXF1ZW50OiBjb25zZXF1ZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VTd2l0Y2hTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBkaXNjcmltaW5hbnQsIGNhc2VzLCBjbGF1c2UsIG9sZEluU3dpdGNoLCBkZWZhdWx0Rm91bmQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnc3dpdGNoJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgZGlzY3JpbWluYW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgY2FzZXMgPSBbXTtcblxuICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgZGlzY3JpbWluYW50OiBkaXNjcmltaW5hbnQsXG4gICAgICAgICAgICAgICAgY2FzZXM6IGNhc2VzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgb2xkSW5Td2l0Y2ggPSBzdGF0ZS5pblN3aXRjaDtcbiAgICAgICAgc3RhdGUuaW5Td2l0Y2ggPSB0cnVlO1xuICAgICAgICBkZWZhdWx0Rm91bmQgPSBmYWxzZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbGF1c2UgPSBwYXJzZVN3aXRjaENhc2UoKTtcbiAgICAgICAgICAgIGlmIChjbGF1c2UudGVzdCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0Rm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuTXVsdGlwbGVEZWZhdWx0c0luU3dpdGNoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVmYXVsdEZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2VzLnB1c2goY2xhdXNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gb2xkSW5Td2l0Y2g7XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hTdGF0ZW1lbnQsXG4gICAgICAgICAgICBkaXNjcmltaW5hbnQ6IGRpc2NyaW1pbmFudCxcbiAgICAgICAgICAgIGNhc2VzOiBjYXNlc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjEzIFRoZSB0aHJvdyBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlVGhyb3dTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBhcmd1bWVudDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd0aHJvdycpO1xuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuTmV3bGluZUFmdGVyVGhyb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXJndW1lbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5UaHJvd1N0YXRlbWVudCxcbiAgICAgICAgICAgIGFyZ3VtZW50OiBhcmd1bWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjE0IFRoZSB0cnkgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUNhdGNoQ2xhdXNlKCkge1xuICAgICAgICB2YXIgcGFyYW07XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnY2F0Y2gnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcbiAgICAgICAgaWYgKG1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZChsb29rYWhlYWQoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgIC8vIDEyLjE0LjFcbiAgICAgICAgaWYgKHN0cmljdCAmJiBpc1Jlc3RyaWN0ZWRXb3JkKHBhcmFtLm5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdENhdGNoVmFyaWFibGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYXRjaENsYXVzZSxcbiAgICAgICAgICAgIHBhcmFtOiBwYXJhbSxcbiAgICAgICAgICAgIGJvZHk6IHBhcnNlQmxvY2soKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVHJ5U3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYmxvY2ssIGhhbmRsZXJzID0gW10sIGZpbmFsaXplciA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndHJ5Jyk7XG5cbiAgICAgICAgYmxvY2sgPSBwYXJzZUJsb2NrKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnY2F0Y2gnKSkge1xuICAgICAgICAgICAgaGFuZGxlcnMucHVzaChwYXJzZUNhdGNoQ2xhdXNlKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZmluYWxseScpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGZpbmFsaXplciA9IHBhcnNlQmxvY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDAgJiYgIWZpbmFsaXplcikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuTm9DYXRjaE9yRmluYWxseSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlRyeVN0YXRlbWVudCxcbiAgICAgICAgICAgIGJsb2NrOiBibG9jayxcbiAgICAgICAgICAgIGd1YXJkZWRIYW5kbGVyczogW10sXG4gICAgICAgICAgICBoYW5kbGVyczogaGFuZGxlcnMsXG4gICAgICAgICAgICBmaW5hbGl6ZXI6IGZpbmFsaXplclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjE1IFRoZSBkZWJ1Z2dlciBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlRGVidWdnZXJTdGF0ZW1lbnQoKSB7XG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2RlYnVnZ2VyJyk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRGVidWdnZXJTdGF0ZW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMiBTdGF0ZW1lbnRzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCksXG4gICAgICAgICAgICBleHByLFxuICAgICAgICAgICAgbGFiZWxlZEJvZHk7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICc7JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VFbXB0eVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAneyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlQmxvY2soKTtcbiAgICAgICAgICAgIGNhc2UgJygnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUV4cHJlc3Npb25TdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnYnJlYWsnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUJyZWFrU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdjb250aW51ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlQ29udGludWVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnZ2VyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VEZWJ1Z2dlclN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnZG8nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZURvV2hpbGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2Zvcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRm9yU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbigpO1xuICAgICAgICAgICAgY2FzZSAnaWYnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUlmU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdyZXR1cm4nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVJldHVyblN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnc3dpdGNoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VTd2l0Y2hTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3Rocm93JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUaHJvd1N0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAndHJ5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUcnlTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3Zhcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVmFyaWFibGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3doaWxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VXaGlsZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnd2l0aCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlV2l0aFN0YXRlbWVudCgpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICAvLyAxMi4xMiBMYWJlbGxlZCBTdGF0ZW1lbnRzXG4gICAgICAgIGlmICgoZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllcikgJiYgbWF0Y2goJzonKSkge1xuICAgICAgICAgICAgbGV4KCk7XG5cbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RhdGUubGFiZWxTZXQsIGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5SZWRlY2xhcmF0aW9uLCAnTGFiZWwnLCBleHByLm5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdGF0ZS5sYWJlbFNldFtleHByLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgIGxhYmVsZWRCb2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5sYWJlbFNldFtleHByLm5hbWVdO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MYWJlbGVkU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBleHByLFxuICAgICAgICAgICAgICAgIGJvZHk6IGxhYmVsZWRCb2R5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudCxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGV4cHJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMyBGdW5jdGlvbiBEZWZpbml0aW9uXG5cbiAgICBmdW5jdGlvbiBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMoKSB7XG4gICAgICAgIHZhciBzb3VyY2VFbGVtZW50LCBzb3VyY2VFbGVtZW50cyA9IFtdLCB0b2tlbiwgZGlyZWN0aXZlLCBmaXJzdFJlc3RyaWN0ZWQsXG4gICAgICAgICAgICBvbGRMYWJlbFNldCwgb2xkSW5JdGVyYXRpb24sIG9sZEluU3dpdGNoLCBvbGRJbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZUVsZW1lbnQuZXhwcmVzc2lvbi50eXBlICE9PSBTeW50YXguTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgbm90IGRpcmVjdGl2ZVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlyZWN0aXZlID0gc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0gKyAxLCB0b2tlbi5yYW5nZVsxXSAtIDEpO1xuICAgICAgICAgICAgaWYgKGRpcmVjdGl2ZSA9PT0gJ3VzZSBzdHJpY3QnKSB7XG4gICAgICAgICAgICAgICAgc3RyaWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChmaXJzdFJlc3RyaWN0ZWQsIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpcnN0UmVzdHJpY3RlZCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBvbGRMYWJlbFNldCA9IHN0YXRlLmxhYmVsU2V0O1xuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBvbGRJblN3aXRjaCA9IHN0YXRlLmluU3dpdGNoO1xuICAgICAgICBvbGRJbkZ1bmN0aW9uQm9keSA9IHN0YXRlLmluRnVuY3Rpb25Cb2R5O1xuXG4gICAgICAgIHN0YXRlLmxhYmVsU2V0ID0ge307XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLmluRnVuY3Rpb25Cb2R5ID0gdHJ1ZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZUVsZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgc3RhdGUubGFiZWxTZXQgPSBvbGRMYWJlbFNldDtcbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcbiAgICAgICAgc3RhdGUuaW5Td2l0Y2ggPSBvbGRJblN3aXRjaDtcbiAgICAgICAgc3RhdGUuaW5GdW5jdGlvbkJvZHkgPSBvbGRJbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkJsb2NrU3RhdGVtZW50LFxuICAgICAgICAgICAgYm9keTogc291cmNlRWxlbWVudHNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKSB7XG4gICAgICAgIHZhciBpZCwgcGFyYW0sIHBhcmFtcyA9IFtdLCBib2R5LCB0b2tlbiwgc3RyaWN0ZWQsIGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSwgcHJldmlvdXNTdHJpY3QsIHBhcmFtU2V0O1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2Z1bmN0aW9uJyk7XG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdEZ1bmN0aW9uTmFtZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHBhcmFtU2V0ID0ge307XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgICAgIHBhcmFtID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmFtU2V0LCB0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgICAgICAgICAgcGFyYW1TZXRbcGFyYW0ubmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHByZXZpb3VzU3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBib2R5ID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCk7XG4gICAgICAgIGlmIChzdHJpY3QgJiYgZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmljdCAmJiBzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHN0cmljdGVkLCBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBzdHJpY3QgPSBwcmV2aW91c1N0cmljdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgaWQgPSBudWxsLCBzdHJpY3RlZCwgZmlyc3RSZXN0cmljdGVkLCBtZXNzYWdlLCBwYXJhbSwgcGFyYW1zID0gW10sIGJvZHksIHByZXZpb3VzU3RyaWN0LCBwYXJhbVNldDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmdW5jdGlvbicpO1xuXG4gICAgICAgIGlmICghbWF0Y2goJygnKSkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFJlc2VydmVkV29yZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHBhcmFtU2V0ID0ge307XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgICAgIHBhcmFtID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmFtU2V0LCB0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgICAgICAgICAgcGFyYW1TZXRbcGFyYW0ubmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHByZXZpb3VzU3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBib2R5ID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCk7XG4gICAgICAgIGlmIChzdHJpY3QgJiYgZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmljdCAmJiBzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHN0cmljdGVkLCBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBzdHJpY3QgPSBwcmV2aW91c1N0cmljdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZ1bmN0aW9uRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgICAgZGVmYXVsdHM6IFtdLFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIHJlc3Q6IG51bGwsXG4gICAgICAgICAgICBnZW5lcmF0b3I6IGZhbHNlLFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxNCBQcm9ncmFtXG5cbiAgICBmdW5jdGlvbiBwYXJzZVNvdXJjZUVsZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdjb25zdCc6XG4gICAgICAgICAgICBjYXNlICdsZXQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24odG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlU291cmNlRWxlbWVudHMoKSB7XG4gICAgICAgIHZhciBzb3VyY2VFbGVtZW50LCBzb3VyY2VFbGVtZW50cyA9IFtdLCB0b2tlbiwgZGlyZWN0aXZlLCBmaXJzdFJlc3RyaWN0ZWQ7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VFbGVtZW50LmV4cHJlc3Npb24udHlwZSAhPT0gU3ludGF4LkxpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIG5vdCBkaXJlY3RpdmVcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdICsgMSwgdG9rZW4ucmFuZ2VbMV0gLSAxKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgPT09ICd1c2Ugc3RyaWN0Jykge1xuICAgICAgICAgICAgICAgIHN0cmljdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoZmlyc3RSZXN0cmljdGVkLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaXJzdFJlc3RyaWN0ZWQgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZUVsZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3VyY2VFbGVtZW50cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVByb2dyYW0oKSB7XG4gICAgICAgIHZhciBwcm9ncmFtO1xuICAgICAgICBzdHJpY3QgPSBmYWxzZTtcbiAgICAgICAgcHJvZ3JhbSA9IHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9ncmFtLFxuICAgICAgICAgICAgYm9keTogcGFyc2VTb3VyY2VFbGVtZW50cygpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBwcm9ncmFtO1xuICAgIH1cblxuICAgIC8vIFRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIGFyZSBuZWVkZWQgb25seSB3aGVuIHRoZSBvcHRpb24gdG8gcHJlc2VydmVcbiAgICAvLyB0aGUgY29tbWVudHMgaXMgYWN0aXZlLlxuXG4gICAgZnVuY3Rpb24gYWRkQ29tbWVudCh0eXBlLCB2YWx1ZSwgc3RhcnQsIGVuZCwgbG9jKSB7XG4gICAgICAgIGFzc2VydCh0eXBlb2Ygc3RhcnQgPT09ICdudW1iZXInLCAnQ29tbWVudCBtdXN0IGhhdmUgdmFsaWQgcG9zaXRpb24nKTtcblxuICAgICAgICAvLyBCZWNhdXNlIHRoZSB3YXkgdGhlIGFjdHVhbCB0b2tlbiBpcyBzY2FubmVkLCBvZnRlbiB0aGUgY29tbWVudHNcbiAgICAgICAgLy8gKGlmIGFueSkgYXJlIHNraXBwZWQgdHdpY2UgZHVyaW5nIHRoZSBsZXhpY2FsIGFuYWx5c2lzLlxuICAgICAgICAvLyBUaHVzLCB3ZSBuZWVkIHRvIHNraXAgYWRkaW5nIGEgY29tbWVudCBpZiB0aGUgY29tbWVudCBhcnJheSBhbHJlYWR5XG4gICAgICAgIC8vIGhhbmRsZWQgaXQuXG4gICAgICAgIGlmIChleHRyYS5jb21tZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoZXh0cmEuY29tbWVudHNbZXh0cmEuY29tbWVudHMubGVuZ3RoIC0gMV0ucmFuZ2VbMV0gPiBzdGFydCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dHJhLmNvbW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGVuZF0sXG4gICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuQ29tbWVudCgpIHtcbiAgICAgICAgdmFyIGNvbW1lbnQsIGNoLCBsb2MsIHN0YXJ0LCBibG9ja0NvbW1lbnQsIGxpbmVDb21tZW50O1xuXG4gICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgYmxvY2tDb21tZW50ID0gZmFsc2U7XG4gICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgICAgIGlmIChsaW5lQ29tbWVudCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnQgLSAxXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0xpbmUnLCBjb21tZW50LCBzdGFydCwgaW5kZXggLSAxLCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogbGVuZ3RoIC0gbGluZVN0YXJ0XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0xpbmUnLCBjb21tZW50LCBzdGFydCwgbGVuZ3RoLCBsb2MpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChibG9ja0NvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXggKyAxXSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9ICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSBjb21tZW50LnN1YnN0cigwLCBjb21tZW50Lmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ29tbWVudCgnQmxvY2snLCBjb21tZW50LCBzdGFydCwgaW5kZXgsIGxvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXggKyAxXTtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICBsb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0xpbmUnLCBjb21tZW50LCBzdGFydCwgaW5kZXgsIGxvYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnQgLSAyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNXaGl0ZVNwYWNlKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyQ29tbWVudExvY2F0aW9uKCkge1xuICAgICAgICB2YXIgaSwgZW50cnksIGNvbW1lbnQsIGNvbW1lbnRzID0gW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGV4dHJhLmNvbW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBlbnRyeSA9IGV4dHJhLmNvbW1lbnRzW2ldO1xuICAgICAgICAgICAgY29tbWVudCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBlbnRyeS50eXBlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlbnRyeS52YWx1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIGNvbW1lbnQucmFuZ2UgPSBlbnRyeS5yYW5nZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBjb21tZW50LmxvYyA9IGVudHJ5LmxvYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbW1lbnRzLnB1c2goY29tbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS5jb21tZW50cyA9IGNvbW1lbnRzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbGxlY3RUb2tlbigpIHtcbiAgICAgICAgdmFyIHN0YXJ0LCBsb2MsIHRva2VuLCByYW5nZSwgdmFsdWU7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0b2tlbiA9IGV4dHJhLmFkdmFuY2UoKTtcbiAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgcmFuZ2UgPSBbdG9rZW4ucmFuZ2VbMF0sIHRva2VuLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIHZhbHVlID0gc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0sIHRva2VuLnJhbmdlWzFdKTtcbiAgICAgICAgICAgIGV4dHJhLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbk5hbWVbdG9rZW4udHlwZV0sXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZSxcbiAgICAgICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29sbGVjdFJlZ2V4KCkge1xuICAgICAgICB2YXIgcG9zLCBsb2MsIHJlZ2V4LCB0b2tlbjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIHBvcyA9IGluZGV4O1xuICAgICAgICBsb2MgPSB7XG4gICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlZ2V4ID0gZXh0cmEuc2NhblJlZ0V4cCgpO1xuICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQb3AgdGhlIHByZXZpb3VzIHRva2VuLCB3aGljaCBpcyBsaWtlbHkgJy8nIG9yICcvPSdcbiAgICAgICAgaWYgKGV4dHJhLnRva2Vucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGV4dHJhLnRva2Vuc1tleHRyYS50b2tlbnMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAodG9rZW4ucmFuZ2VbMF0gPT09IHBvcyAmJiB0b2tlbi50eXBlID09PSAnUHVuY3R1YXRvcicpIHtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udmFsdWUgPT09ICcvJyB8fCB0b2tlbi52YWx1ZSA9PT0gJy89Jykge1xuICAgICAgICAgICAgICAgICAgICBleHRyYS50b2tlbnMucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEudG9rZW5zLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogJ1JlZ3VsYXJFeHByZXNzaW9uJyxcbiAgICAgICAgICAgIHZhbHVlOiByZWdleC5saXRlcmFsLFxuICAgICAgICAgICAgcmFuZ2U6IFtwb3MsIGluZGV4XSxcbiAgICAgICAgICAgIGxvYzogbG9jXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZWdleDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJUb2tlbkxvY2F0aW9uKCkge1xuICAgICAgICB2YXIgaSwgZW50cnksIHRva2VuLCB0b2tlbnMgPSBbXTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZXh0cmEudG9rZW5zLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBlbnRyeSA9IGV4dHJhLnRva2Vuc1tpXTtcbiAgICAgICAgICAgIHRva2VuID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IGVudHJ5LnR5cGUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGVudHJ5LnZhbHVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4ucmFuZ2UgPSBlbnRyeS5yYW5nZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICB0b2tlbi5sb2MgPSBlbnRyeS5sb2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS50b2tlbnMgPSB0b2tlbnM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlTGl0ZXJhbCh0b2tlbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVSYXdMaXRlcmFsKHRva2VuKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiB0b2tlbi52YWx1ZSxcbiAgICAgICAgICAgIHJhdzogc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0sIHRva2VuLnJhbmdlWzFdKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uTWFya2VyKCkge1xuICAgICAgICB2YXIgbWFya2VyID0ge307XG5cbiAgICAgICAgbWFya2VyLnJhbmdlID0gW2luZGV4LCBpbmRleF07XG4gICAgICAgIG1hcmtlci5sb2MgPSB7XG4gICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVuZDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIG1hcmtlci5lbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnJhbmdlWzFdID0gaW5kZXg7XG4gICAgICAgICAgICB0aGlzLmxvYy5lbmQubGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgICAgICB0aGlzLmxvYy5lbmQuY29sdW1uID0gaW5kZXggLSBsaW5lU3RhcnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgbWFya2VyLmFwcGx5R3JvdXAgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5ncm91cFJhbmdlID0gW3RoaXMucmFuZ2VbMF0sIHRoaXMucmFuZ2VbMV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4dHJhLmxvYykge1xuICAgICAgICAgICAgICAgIG5vZGUuZ3JvdXBMb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5zdGFydC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5zdGFydC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW5kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5lbmQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2MuZW5kLmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtYXJrZXIuYXBwbHkgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yYW5nZSA9IFt0aGlzLnJhbmdlWzBdLCB0aGlzLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBub2RlLmxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMubG9jLnN0YXJ0LmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMubG9jLnN0YXJ0LmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMubG9jLmVuZC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5lbmQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBtYXJrZXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tHcm91cEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBtYXJrZXIsIGV4cHI7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgbWFya2VyLmFwcGx5R3JvdXAoZXhwcik7XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VDb21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFja0xlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwoKSB7XG4gICAgICAgIHZhciBtYXJrZXIsIGV4cHI7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykgfHwgbWF0Y2goJygnKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxlZTogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgJ2FyZ3VtZW50cyc6IHBhcnNlQXJndW1lbnRzKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyR3JvdXAobm9kZSkge1xuICAgICAgICB2YXIgbiwgaSwgZW50cnk7XG5cbiAgICAgICAgbiA9IChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KG5vZGUpID09PSAnW29iamVjdCBBcnJheV0nKSA/IFtdIDoge307XG4gICAgICAgIGZvciAoaSBpbiBub2RlKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5oYXNPd25Qcm9wZXJ0eShpKSAmJiBpICE9PSAnZ3JvdXBSYW5nZScgJiYgaSAhPT0gJ2dyb3VwTG9jJykge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gbm9kZVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT09IG51bGwgfHwgdHlwZW9mIGVudHJ5ICE9PSAnb2JqZWN0JyB8fCBlbnRyeSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgICAgICAgICAgICBuW2ldID0gZW50cnk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbltpXSA9IGZpbHRlckdyb3VwKGVudHJ5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gd3JhcFRyYWNraW5nRnVuY3Rpb24ocmFuZ2UsIGxvYykge1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocGFyc2VGdW5jdGlvbikge1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBpc0JpbmFyeShub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUudHlwZSA9PT0gU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uIHx8XG4gICAgICAgICAgICAgICAgICAgIG5vZGUudHlwZSA9PT0gU3ludGF4LkJpbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHZpc2l0KG5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RhcnQsIGVuZDtcblxuICAgICAgICAgICAgICAgIGlmIChpc0JpbmFyeShub2RlLmxlZnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0KG5vZGUubGVmdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc0JpbmFyeShub2RlLnJpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpdChub2RlLnJpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUubGVmdC5ncm91cFJhbmdlIHx8IG5vZGUucmlnaHQuZ3JvdXBSYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQuZ3JvdXBSYW5nZSA/IG5vZGUubGVmdC5ncm91cFJhbmdlWzBdIDogbm9kZS5sZWZ0LnJhbmdlWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbm9kZS5yaWdodC5ncm91cFJhbmdlID8gbm9kZS5yaWdodC5ncm91cFJhbmdlWzFdIDogbm9kZS5yaWdodC5yYW5nZVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucmFuZ2UgPSBbc3RhcnQsIGVuZF07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5vZGUucmFuZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IG5vZGUubGVmdC5yYW5nZVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IG5vZGUucmlnaHQucmFuZ2VbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJhbmdlID0gW3N0YXJ0LCBlbmRdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsb2MpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUubGVmdC5ncm91cExvYyB8fCBub2RlLnJpZ2h0Lmdyb3VwTG9jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IG5vZGUubGVmdC5ncm91cExvYyA/IG5vZGUubGVmdC5ncm91cExvYy5zdGFydCA6IG5vZGUubGVmdC5sb2Muc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBub2RlLnJpZ2h0Lmdyb3VwTG9jID8gbm9kZS5yaWdodC5ncm91cExvYy5lbmQgOiBub2RlLnJpZ2h0LmxvYy5lbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5vZGUubG9jID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IG5vZGUubGVmdC5sb2Muc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiBub2RlLnJpZ2h0LmxvYy5lbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hcmtlciwgbm9kZTtcblxuICAgICAgICAgICAgICAgIHNraXBDb21tZW50KCk7XG5cbiAgICAgICAgICAgICAgICBtYXJrZXIgPSBjcmVhdGVMb2NhdGlvbk1hcmtlcigpO1xuICAgICAgICAgICAgICAgIG5vZGUgPSBwYXJzZUZ1bmN0aW9uLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlICYmIHR5cGVvZiBub2RlLnJhbmdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxvYyAmJiB0eXBlb2Ygbm9kZS5sb2MgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShub2RlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaXQobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhdGNoKCkge1xuXG4gICAgICAgIHZhciB3cmFwVHJhY2tpbmc7XG5cbiAgICAgICAgaWYgKGV4dHJhLmNvbW1lbnRzKSB7XG4gICAgICAgICAgICBleHRyYS5za2lwQ29tbWVudCA9IHNraXBDb21tZW50O1xuICAgICAgICAgICAgc2tpcENvbW1lbnQgPSBzY2FuQ29tbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChleHRyYS5yYXcpIHtcbiAgICAgICAgICAgIGV4dHJhLmNyZWF0ZUxpdGVyYWwgPSBjcmVhdGVMaXRlcmFsO1xuICAgICAgICAgICAgY3JlYXRlTGl0ZXJhbCA9IGNyZWF0ZVJhd0xpdGVyYWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG5cbiAgICAgICAgICAgIGV4dHJhLnBhcnNlR3JvdXBFeHByZXNzaW9uID0gcGFyc2VHcm91cEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24gPSBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwgPSBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGw7XG4gICAgICAgICAgICBwYXJzZUdyb3VwRXhwcmVzc2lvbiA9IHRyYWNrR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuXG4gICAgICAgICAgICB3cmFwVHJhY2tpbmcgPSB3cmFwVHJhY2tpbmdGdW5jdGlvbihleHRyYS5yYW5nZSwgZXh0cmEubG9jKTtcblxuICAgICAgICAgICAgZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24gPSBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24gPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbiA9IHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24gPSBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uID0gcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQmxvY2sgPSBwYXJzZUJsb2NrO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDYXRjaENsYXVzZSA9IHBhcnNlQ2F0Y2hDbGF1c2U7XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyID0gcGFyc2VDb21wdXRlZE1lbWJlcjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uID0gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24gPSBwYXJzZUNvbnN0TGV0RGVjbGFyYXRpb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUVxdWFsaXR5RXhwcmVzc2lvbiA9IHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VFeHByZXNzaW9uID0gcGFyc2VFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uID0gcGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uID0gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb24gPSBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24gPSBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTmV3RXhwcmVzc2lvbiA9IHBhcnNlTmV3RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHkgPSBwYXJzZU9iamVjdFByb3BlcnR5O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXk7XG4gICAgICAgICAgICBleHRyYS5wYXJzZVBvc3RmaXhFeHByZXNzaW9uID0gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJpbWFyeUV4cHJlc3Npb24gPSBwYXJzZVByaW1hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQcm9ncmFtID0gcGFyc2VQcm9ncmFtO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbiA9IHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVN0YXRlbWVudCA9IHBhcnNlU3RhdGVtZW50O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VTaGlmdEV4cHJlc3Npb24gPSBwYXJzZVNoaWZ0RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlU3dpdGNoQ2FzZSA9IHBhcnNlU3dpdGNoQ2FzZTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlVW5hcnlFeHByZXNzaW9uID0gcGFyc2VVbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVZhcmlhYmxlSWRlbnRpZmllciA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyO1xuXG4gICAgICAgICAgICBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUFkZGl0aXZlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQmxvY2sgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCbG9jayk7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKTtcbiAgICAgICAgICAgIHBhcnNlQ2F0Y2hDbGF1c2UgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VDYXRjaENsYXVzZSk7XG4gICAgICAgICAgICBwYXJzZUNvbXB1dGVkTWVtYmVyID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29tcHV0ZWRNZW1iZXIpO1xuICAgICAgICAgICAgcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUVxdWFsaXR5RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcocGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTmV3RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU5ld0V4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VOb25Db21wdXRlZFByb3BlcnR5ID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSk7XG4gICAgICAgICAgICBwYXJzZU9iamVjdFByb3BlcnR5ID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHkpO1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5S2V5KTtcbiAgICAgICAgICAgIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VQb3N0Zml4RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVByaW1hcnlFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJpbWFyeUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VQcm9ncmFtID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJvZ3JhbSk7XG4gICAgICAgICAgICBwYXJzZVByb3BlcnR5RnVuY3Rpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVN0YXRlbWVudCA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVN0YXRlbWVudCk7XG4gICAgICAgICAgICBwYXJzZVNoaWZ0RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVNoaWZ0RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVN3aXRjaENhc2UgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTd2l0Y2hDYXNlKTtcbiAgICAgICAgICAgIHBhcnNlVW5hcnlFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlVW5hcnlFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYS50b2tlbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBleHRyYS5hZHZhbmNlID0gYWR2YW5jZTtcbiAgICAgICAgICAgIGV4dHJhLnNjYW5SZWdFeHAgPSBzY2FuUmVnRXhwO1xuXG4gICAgICAgICAgICBhZHZhbmNlID0gY29sbGVjdFRva2VuO1xuICAgICAgICAgICAgc2NhblJlZ0V4cCA9IGNvbGxlY3RSZWdleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVucGF0Y2goKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmEuc2tpcENvbW1lbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHNraXBDb21tZW50ID0gZXh0cmEuc2tpcENvbW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmF3KSB7XG4gICAgICAgICAgICBjcmVhdGVMaXRlcmFsID0gZXh0cmEuY3JlYXRlTGl0ZXJhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChleHRyYS5yYW5nZSB8fCBleHRyYS5sb2MpIHtcbiAgICAgICAgICAgIHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uID0gZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gZXh0cmEucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uID0gZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUJsb2NrID0gZXh0cmEucGFyc2VCbG9jaztcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyA9IGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cztcbiAgICAgICAgICAgIHBhcnNlQ2F0Y2hDbGF1c2UgPSBleHRyYS5wYXJzZUNhdGNoQ2xhdXNlO1xuICAgICAgICAgICAgcGFyc2VDb21wdXRlZE1lbWJlciA9IGV4dHJhLnBhcnNlQ29tcHV0ZWRNZW1iZXI7XG4gICAgICAgICAgICBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gZXh0cmEucGFyc2VDb25zdExldERlY2xhcmF0aW9uO1xuICAgICAgICAgICAgcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUVxdWFsaXR5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uID0gZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUdyb3VwRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VOZXdFeHByZXNzaW9uID0gZXh0cmEucGFyc2VOZXdFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VOb25Db21wdXRlZFByb3BlcnR5ID0gZXh0cmEucGFyc2VOb25Db21wdXRlZFByb3BlcnR5O1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eSA9IGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHk7XG4gICAgICAgICAgICBwYXJzZU9iamVjdFByb3BlcnR5S2V5ID0gZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleTtcbiAgICAgICAgICAgIHBhcnNlUHJpbWFyeUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VQb3N0Zml4RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlUG9zdGZpeEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVByb2dyYW0gPSBleHRyYS5wYXJzZVByb2dyYW07XG4gICAgICAgICAgICBwYXJzZVByb3BlcnR5RnVuY3Rpb24gPSBleHRyYS5wYXJzZVByb3BlcnR5RnVuY3Rpb247XG4gICAgICAgICAgICBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uID0gZXh0cmEucGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlU3RhdGVtZW50ID0gZXh0cmEucGFyc2VTdGF0ZW1lbnQ7XG4gICAgICAgICAgICBwYXJzZVNoaWZ0RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlU2hpZnRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VTd2l0Y2hDYXNlID0gZXh0cmEucGFyc2VTd2l0Y2hDYXNlO1xuICAgICAgICAgICAgcGFyc2VVbmFyeUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyID0gZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnNjYW5SZWdFeHAgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFkdmFuY2UgPSBleHRyYS5hZHZhbmNlO1xuICAgICAgICAgICAgc2NhblJlZ0V4cCA9IGV4dHJhLnNjYW5SZWdFeHA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdHJpbmdUb0FycmF5KHN0cikge1xuICAgICAgICB2YXIgbGVuZ3RoID0gc3RyLmxlbmd0aCxcbiAgICAgICAgICAgIHJlc3VsdCA9IFtdLFxuICAgICAgICAgICAgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICByZXN1bHRbaV0gPSBzdHIuY2hhckF0KGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2UoY29kZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgcHJvZ3JhbSwgdG9TdHJpbmc7XG5cbiAgICAgICAgdG9TdHJpbmcgPSBTdHJpbmc7XG4gICAgICAgIGlmICh0eXBlb2YgY29kZSAhPT0gJ3N0cmluZycgJiYgIShjb2RlIGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgICAgICAgICAgY29kZSA9IHRvU3RyaW5nKGNvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgc291cmNlID0gY29kZTtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICBsaW5lTnVtYmVyID0gKHNvdXJjZS5sZW5ndGggPiAwKSA/IDEgOiAwO1xuICAgICAgICBsaW5lU3RhcnQgPSAwO1xuICAgICAgICBsZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xuICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICAgIGFsbG93SW46IHRydWUsXG4gICAgICAgICAgICBsYWJlbFNldDoge30sXG4gICAgICAgICAgICBpbkZ1bmN0aW9uQm9keTogZmFsc2UsXG4gICAgICAgICAgICBpbkl0ZXJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBpblN3aXRjaDogZmFsc2VcbiAgICAgICAgfTtcblxuICAgICAgICBleHRyYSA9IHt9O1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBleHRyYS5yYW5nZSA9ICh0eXBlb2Ygb3B0aW9ucy5yYW5nZSA9PT0gJ2Jvb2xlYW4nKSAmJiBvcHRpb25zLnJhbmdlO1xuICAgICAgICAgICAgZXh0cmEubG9jID0gKHR5cGVvZiBvcHRpb25zLmxvYyA9PT0gJ2Jvb2xlYW4nKSAmJiBvcHRpb25zLmxvYztcbiAgICAgICAgICAgIGV4dHJhLnJhdyA9ICh0eXBlb2Ygb3B0aW9ucy5yYXcgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5yYXc7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9rZW5zID09PSAnYm9vbGVhbicgJiYgb3B0aW9ucy50b2tlbnMpIHtcbiAgICAgICAgICAgICAgICBleHRyYS50b2tlbnMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jb21tZW50ID09PSAnYm9vbGVhbicgJiYgb3B0aW9ucy5jb21tZW50KSB7XG4gICAgICAgICAgICAgICAgZXh0cmEuY29tbWVudHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy50b2xlcmFudCA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMudG9sZXJhbnQpIHtcbiAgICAgICAgICAgICAgICBleHRyYS5lcnJvcnMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVswXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgZmlyc3QgdG8gY29udmVydCB0byBhIHN0cmluZy4gVGhpcyBpcyBnb29kIGFzIGZhc3QgcGF0aFxuICAgICAgICAgICAgICAgIC8vIGZvciBvbGQgSUUgd2hpY2ggdW5kZXJzdGFuZHMgc3RyaW5nIGluZGV4aW5nIGZvciBzdHJpbmdcbiAgICAgICAgICAgICAgICAvLyBsaXRlcmFscyBvbmx5IGFuZCBub3QgZm9yIHN0cmluZyBvYmplY3QuXG4gICAgICAgICAgICAgICAgaWYgKGNvZGUgaW5zdGFuY2VvZiBTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgc291cmNlID0gY29kZS52YWx1ZU9mKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgYWNjZXNzaW5nIHRoZSBjaGFyYWN0ZXJzIHZpYSBhbiBhcnJheS5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVswXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgc291cmNlID0gc3RyaW5nVG9BcnJheShjb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwYXRjaCgpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcHJvZ3JhbSA9IHBhcnNlUHJvZ3JhbSgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5jb21tZW50cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJDb21tZW50TG9jYXRpb24oKTtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLmNvbW1lbnRzID0gZXh0cmEuY29tbWVudHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnRva2VucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJUb2tlbkxvY2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS50b2tlbnMgPSBleHRyYS50b2tlbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dHJhLmVycm9ycyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLmVycm9ycyA9IGV4dHJhLmVycm9ycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSB8fCBleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLmJvZHkgPSBmaWx0ZXJHcm91cChwcm9ncmFtLmJvZHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdW5wYXRjaCgpO1xuICAgICAgICAgICAgZXh0cmEgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcm9ncmFtO1xuICAgIH1cblxuICAgIC8vIFN5bmMgd2l0aCBwYWNrYWdlLmpzb24uXG4gICAgZXhwb3J0cy52ZXJzaW9uID0gJzEuMC40JztcblxuICAgIGV4cG9ydHMucGFyc2UgPSBwYXJzZTtcblxuICAgIC8vIERlZXAgY29weS5cbiAgICBleHBvcnRzLlN5bnRheCA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuYW1lLCB0eXBlcyA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHlwZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChuYW1lIGluIFN5bnRheCkge1xuICAgICAgICAgICAgaWYgKFN5bnRheC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHR5cGVzW25hbWVdID0gU3ludGF4W25hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBPYmplY3QuZnJlZXplID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHR5cGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0eXBlcztcbiAgICB9KCkpO1xuXG59KSk7XG4vKiB2aW06IHNldCBzdz00IHRzPTQgZXQgdHc9ODAgOiAqL1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm5ncG1jUVwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxlc3JlZmFjdG9yXFxcXG5vZGVfbW9kdWxlc1xcXFxlc3ByaW1hXFxcXGVzcHJpbWEuanNcIixcIi8uLlxcXFwuLlxcXFxub2RlX21vZHVsZXNcXFxcZXNyZWZhY3RvclxcXFxub2RlX21vZHVsZXNcXFxcZXNwcmltYVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qXG4gIENvcHlyaWdodCAoQykgMjAxMiBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBBcml5YSBIaWRheWF0IDxhcml5YS5oaWRheWF0QGdtYWlsLmNvbT5cblxuICBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yIHdpdGhvdXRcbiAgbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZVxuICAgICAgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cblxuICBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIFRIRSBDT1BZUklHSFQgSE9MREVSUyBBTkQgQ09OVFJJQlVUT1JTIFwiQVMgSVNcIlxuICBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFXG4gIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFXG4gIEFSRSBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCA8Q09QWVJJR0hUIEhPTERFUj4gQkUgTElBQkxFIEZPUiBBTllcbiAgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcbiAgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTO1xuICBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKSBIT1dFVkVSIENBVVNFRCBBTkRcbiAgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlRcbiAgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GXG4gIFRISVMgU09GVFdBUkUsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4qL1xuXG4vKmpzbGludCBiaXR3aXNlOnRydWUgKi9cbi8qZ2xvYmFsIGV4cG9ydHM6dHJ1ZSwgZGVmaW5lOnRydWUsIHdpbmRvdzp0cnVlICovXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24gKFVNRCkgdG8gc3VwcG9ydCBBTUQsIENvbW1vbkpTL05vZGUuanMsXG4gICAgLy8gYW5kIHBsYWluIGJyb3dzZXIgbG9hZGluZyxcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KCh3aW5kb3cuZXN0cmF2ZXJzZSA9IHt9KSk7XG4gICAgfVxufShmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBTeW50YXgsXG4gICAgICAgIGlzQXJyYXksXG4gICAgICAgIFZpc2l0b3JPcHRpb24sXG4gICAgICAgIFZpc2l0b3JLZXlzLFxuICAgICAgICB3cmFwcGVycztcblxuICAgIFN5bnRheCA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246ICdBc3NpZ25tZW50RXhwcmVzc2lvbicsXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogJ0FycmF5RXhwcmVzc2lvbicsXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiAnQmluYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiAnQnJlYWtTdGF0ZW1lbnQnLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogJ0NhbGxFeHByZXNzaW9uJyxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6ICdDYXRjaENsYXVzZScsXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogJ0NvbmRpdGlvbmFsRXhwcmVzc2lvbicsXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiAnQ29udGludWVTdGF0ZW1lbnQnLFxuICAgICAgICBEZWJ1Z2dlclN0YXRlbWVudDogJ0RlYnVnZ2VyU3RhdGVtZW50JyxcbiAgICAgICAgRGlyZWN0aXZlU3RhdGVtZW50OiAnRGlyZWN0aXZlU3RhdGVtZW50JyxcbiAgICAgICAgRG9XaGlsZVN0YXRlbWVudDogJ0RvV2hpbGVTdGF0ZW1lbnQnLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogJ0VtcHR5U3RhdGVtZW50JyxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogJ0V4cHJlc3Npb25TdGF0ZW1lbnQnLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6ICdGb3JTdGF0ZW1lbnQnLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogJ0ZvckluU3RhdGVtZW50JyxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgICBGdW5jdGlvbkV4cHJlc3Npb246ICdGdW5jdGlvbkV4cHJlc3Npb24nLFxuICAgICAgICBJZGVudGlmaWVyOiAnSWRlbnRpZmllcicsXG4gICAgICAgIElmU3RhdGVtZW50OiAnSWZTdGF0ZW1lbnQnLFxuICAgICAgICBMaXRlcmFsOiAnTGl0ZXJhbCcsXG4gICAgICAgIExhYmVsZWRTdGF0ZW1lbnQ6ICdMYWJlbGVkU3RhdGVtZW50JyxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246ICdMb2dpY2FsRXhwcmVzc2lvbicsXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246ICdNZW1iZXJFeHByZXNzaW9uJyxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiAnT2JqZWN0RXhwcmVzc2lvbicsXG4gICAgICAgIFByb2dyYW06ICdQcm9ncmFtJyxcbiAgICAgICAgUHJvcGVydHk6ICdQcm9wZXJ0eScsXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogJ1JldHVyblN0YXRlbWVudCcsXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogJ1NlcXVlbmNlRXhwcmVzc2lvbicsXG4gICAgICAgIFN3aXRjaFN0YXRlbWVudDogJ1N3aXRjaFN0YXRlbWVudCcsXG4gICAgICAgIFN3aXRjaENhc2U6ICdTd2l0Y2hDYXNlJyxcbiAgICAgICAgVGhpc0V4cHJlc3Npb246ICdUaGlzRXhwcmVzc2lvbicsXG4gICAgICAgIFRocm93U3RhdGVtZW50OiAnVGhyb3dTdGF0ZW1lbnQnLFxuICAgICAgICBUcnlTdGF0ZW1lbnQ6ICdUcnlTdGF0ZW1lbnQnLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnVXBkYXRlRXhwcmVzc2lvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246ICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiAnVmFyaWFibGVEZWNsYXJhdG9yJyxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6ICdXaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6ICdXaXRoU3RhdGVtZW50J1xuICAgIH07XG5cbiAgICBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbiAgICBpZiAoIWlzQXJyYXkpIHtcbiAgICAgICAgaXNBcnJheSA9IGZ1bmN0aW9uIGlzQXJyYXkoYXJyYXkpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyYXkpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIFZpc2l0b3JLZXlzID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogWydlbGVtZW50cyddLFxuICAgICAgICBCbG9ja1N0YXRlbWVudDogWydib2R5J10sXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246IFsnbGVmdCcsICdyaWdodCddLFxuICAgICAgICBCcmVha1N0YXRlbWVudDogWydsYWJlbCddLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogWydjYWxsZWUnLCAnYXJndW1lbnRzJ10sXG4gICAgICAgIENhdGNoQ2xhdXNlOiBbJ3BhcmFtJywgJ2JvZHknXSxcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiBbJ3Rlc3QnLCAnY29uc2VxdWVudCcsICdhbHRlcm5hdGUnXSxcbiAgICAgICAgQ29udGludWVTdGF0ZW1lbnQ6IFsnbGFiZWwnXSxcbiAgICAgICAgRGVidWdnZXJTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBEaXJlY3RpdmVTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiBbJ2JvZHknLCAndGVzdCddLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogW10sXG4gICAgICAgIEV4cHJlc3Npb25TdGF0ZW1lbnQ6IFsnZXhwcmVzc2lvbiddLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6IFsnaW5pdCcsICd0ZXN0JywgJ3VwZGF0ZScsICdib2R5J10sXG4gICAgICAgIEZvckluU3RhdGVtZW50OiBbJ2xlZnQnLCAncmlnaHQnLCAnYm9keSddLFxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBbJ2lkJywgJ3BhcmFtcycsICdib2R5J10sXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogWydpZCcsICdwYXJhbXMnLCAnYm9keSddLFxuICAgICAgICBJZGVudGlmaWVyOiBbXSxcbiAgICAgICAgSWZTdGF0ZW1lbnQ6IFsndGVzdCcsICdjb25zZXF1ZW50JywgJ2FsdGVybmF0ZSddLFxuICAgICAgICBMaXRlcmFsOiBbXSxcbiAgICAgICAgTGFiZWxlZFN0YXRlbWVudDogWydsYWJlbCcsICdib2R5J10sXG4gICAgICAgIExvZ2ljYWxFeHByZXNzaW9uOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogWydvYmplY3QnLCAncHJvcGVydHknXSxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogWydjYWxsZWUnLCAnYXJndW1lbnRzJ10sXG4gICAgICAgIE9iamVjdEV4cHJlc3Npb246IFsncHJvcGVydGllcyddLFxuICAgICAgICBQcm9ncmFtOiBbJ2JvZHknXSxcbiAgICAgICAgUHJvcGVydHk6IFsna2V5JywgJ3ZhbHVlJ10sXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogWydhcmd1bWVudCddLFxuICAgICAgICBTZXF1ZW5jZUV4cHJlc3Npb246IFsnZXhwcmVzc2lvbnMnXSxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiBbJ2Rpc2NyaW1pbmFudCcsICdjYXNlcyddLFxuICAgICAgICBTd2l0Y2hDYXNlOiBbJ3Rlc3QnLCAnY29uc2VxdWVudCddLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogW10sXG4gICAgICAgIFRocm93U3RhdGVtZW50OiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFRyeVN0YXRlbWVudDogWydibG9jaycsICdoYW5kbGVycycsICdmaW5hbGl6ZXInXSxcbiAgICAgICAgVW5hcnlFeHByZXNzaW9uOiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IFsnYXJndW1lbnQnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogWydkZWNsYXJhdGlvbnMnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiBbJ2lkJywgJ2luaXQnXSxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6IFsndGVzdCcsICdib2R5J10sXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6IFsnb2JqZWN0JywgJ2JvZHknXVxuICAgIH07XG5cbiAgICBWaXNpdG9yT3B0aW9uID0ge1xuICAgICAgICBCcmVhazogMSxcbiAgICAgICAgU2tpcDogMlxuICAgIH07XG5cbiAgICB3cmFwcGVycyA9IHtcbiAgICAgICAgUHJvcGVydHlXcmFwcGVyOiAnUHJvcGVydHknXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKHRvcCwgdmlzaXRvcikge1xuICAgICAgICB2YXIgd29ya2xpc3QsIGxlYXZlbGlzdCwgbm9kZSwgbm9kZVR5cGUsIHJldCwgY3VycmVudCwgY3VycmVudDIsIGNhbmRpZGF0ZXMsIGNhbmRpZGF0ZSwgbWFya2VyID0ge307XG5cbiAgICAgICAgd29ya2xpc3QgPSBbIHRvcCBdO1xuICAgICAgICBsZWF2ZWxpc3QgPSBbIG51bGwgXTtcblxuICAgICAgICB3aGlsZSAod29ya2xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICBub2RlID0gd29ya2xpc3QucG9wKCk7XG4gICAgICAgICAgICBub2RlVHlwZSA9IG5vZGUudHlwZTtcblxuICAgICAgICAgICAgaWYgKG5vZGUgPT09IG1hcmtlcikge1xuICAgICAgICAgICAgICAgIG5vZGUgPSBsZWF2ZWxpc3QucG9wKCk7XG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IubGVhdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdmlzaXRvci5sZWF2ZShub2RlLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXQgPT09IFZpc2l0b3JPcHRpb24uQnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmICh3cmFwcGVycy5oYXNPd25Qcm9wZXJ0eShub2RlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUubm9kZTtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGUgPSB3cmFwcGVyc1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IuZW50ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdmlzaXRvci5lbnRlcihub2RlLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChtYXJrZXIpO1xuICAgICAgICAgICAgICAgIGxlYXZlbGlzdC5wdXNoKG5vZGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJldCAhPT0gVmlzaXRvck9wdGlvbi5Ta2lwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZXMgPSBWaXNpdG9yS2V5c1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjYW5kaWRhdGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50IC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSA9IG5vZGVbY2FuZGlkYXRlc1tjdXJyZW50XV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2FuZGlkYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50MiA9IGNhbmRpZGF0ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgoY3VycmVudDIgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZVtjdXJyZW50Ml0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihub2RlVHlwZSA9PT0gU3ludGF4Lk9iamVjdEV4cHJlc3Npb24gJiYgJ3Byb3BlcnRpZXMnID09PSBjYW5kaWRhdGVzW2N1cnJlbnRdICYmIG51bGwgPT0gY2FuZGlkYXRlc1tjdXJyZW50XS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goe3R5cGU6ICdQcm9wZXJ0eVdyYXBwZXInLCBub2RlOiBjYW5kaWRhdGVbY3VycmVudDJdfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChjYW5kaWRhdGVbY3VycmVudDJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwbGFjZSh0b3AsIHZpc2l0b3IpIHtcbiAgICAgICAgdmFyIHdvcmtsaXN0LCBsZWF2ZWxpc3QsIG5vZGUsIG5vZGVUeXBlLCB0YXJnZXQsIHR1cGxlLCByZXQsIGN1cnJlbnQsIGN1cnJlbnQyLCBjYW5kaWRhdGVzLCBjYW5kaWRhdGUsIG1hcmtlciA9IHt9LCByZXN1bHQ7XG5cbiAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgdG9wOiB0b3BcbiAgICAgICAgfTtcblxuICAgICAgICB0dXBsZSA9IFsgdG9wLCByZXN1bHQsICd0b3AnIF07XG4gICAgICAgIHdvcmtsaXN0ID0gWyB0dXBsZSBdO1xuICAgICAgICBsZWF2ZWxpc3QgPSBbIHR1cGxlIF07XG5cbiAgICAgICAgZnVuY3Rpb24gbm90aWZ5KHYpIHtcbiAgICAgICAgICAgIHJldCA9IHY7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAod29ya2xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0dXBsZSA9IHdvcmtsaXN0LnBvcCgpO1xuXG4gICAgICAgICAgICBpZiAodHVwbGUgPT09IG1hcmtlcikge1xuICAgICAgICAgICAgICAgIHR1cGxlID0gbGVhdmVsaXN0LnBvcCgpO1xuICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBpZiAodmlzaXRvci5sZWF2ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gdHVwbGVbMF07XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHZpc2l0b3IubGVhdmUodHVwbGVbMF0sIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV1bMF0sIG5vdGlmeSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHRhcmdldDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0dXBsZVsxXVt0dXBsZVsyXV0gPSBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBWaXNpdG9yT3B0aW9uLkJyZWFrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQudG9wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHVwbGVbMF0pIHtcbiAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgbm9kZSA9IHR1cGxlWzBdO1xuXG4gICAgICAgICAgICAgICAgbm9kZVR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgaWYgKHdyYXBwZXJzLmhhc093blByb3BlcnR5KG5vZGVUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICB0dXBsZVswXSA9IG5vZGUgPSBub2RlLm5vZGU7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVUeXBlID0gd3JhcHBlcnNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh2aXNpdG9yLmVudGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHZpc2l0b3IuZW50ZXIodHVwbGVbMF0sIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV1bMF0sIG5vdGlmeSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHRhcmdldDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0dXBsZVsxXVt0dXBsZVsyXV0gPSBub2RlO1xuICAgICAgICAgICAgICAgICAgICB0dXBsZVswXSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRvcDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodHVwbGVbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChtYXJrZXIpO1xuICAgICAgICAgICAgICAgICAgICBsZWF2ZWxpc3QucHVzaCh0dXBsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJldCAhPT0gVmlzaXRvck9wdGlvbi5Ta2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVzID0gVmlzaXRvcktleXNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGNhbmRpZGF0ZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50IC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgPSBub2RlW2NhbmRpZGF0ZXNbY3VycmVudF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2FuZGlkYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudDIgPSBjYW5kaWRhdGUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50MiAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZVtjdXJyZW50Ml0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobm9kZVR5cGUgPT09IFN5bnRheC5PYmplY3RFeHByZXNzaW9uICYmICdwcm9wZXJ0aWVzJyA9PT0gY2FuZGlkYXRlc1tjdXJyZW50XSAmJiBudWxsID09IGNhbmRpZGF0ZXNbY3VycmVudF0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbe3R5cGU6ICdQcm9wZXJ0eVdyYXBwZXInLCBub2RlOiBjYW5kaWRhdGVbY3VycmVudDJdfSwgY2FuZGlkYXRlLCBjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbY2FuZGlkYXRlW2N1cnJlbnQyXSwgY2FuZGlkYXRlLCBjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbY2FuZGlkYXRlLCBub2RlLCBjYW5kaWRhdGVzW2N1cnJlbnRdXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0LnRvcDtcbiAgICB9XG5cbiAgICBleHBvcnRzLnZlcnNpb24gPSAnMC4wLjQnO1xuICAgIGV4cG9ydHMuU3ludGF4ID0gU3ludGF4O1xuICAgIGV4cG9ydHMudHJhdmVyc2UgPSB0cmF2ZXJzZTtcbiAgICBleHBvcnRzLnJlcGxhY2UgPSByZXBsYWNlO1xuICAgIGV4cG9ydHMuVmlzaXRvcktleXMgPSBWaXNpdG9yS2V5cztcbiAgICBleHBvcnRzLlZpc2l0b3JPcHRpb24gPSBWaXNpdG9yT3B0aW9uO1xufSkpO1xuLyogdmltOiBzZXQgc3c9NCB0cz00IGV0IHR3PTgwIDogKi9cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJuZ3BtY1FcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLlxcXFwuLlxcXFxub2RlX21vZHVsZXNcXFxcZXNyZWZhY3RvclxcXFxub2RlX21vZHVsZXNcXFxcZXN0cmF2ZXJzZVxcXFxlc3RyYXZlcnNlLmpzXCIsXCIvLi5cXFxcLi5cXFxcbm9kZV9tb2R1bGVzXFxcXGVzcmVmYWN0b3JcXFxcbm9kZV9tb2R1bGVzXFxcXGVzdHJhdmVyc2VcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5fdXNlVHlwZWRBcnJheXNgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAoY29tcGF0aWJsZSBkb3duIHRvIElFNilcbiAqL1xuQnVmZmVyLl91c2VUeXBlZEFycmF5cyA9IChmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCBpZiBicm93c2VyIHN1cHBvcnRzIFR5cGVkIEFycmF5cy4gU3VwcG9ydGVkIGJyb3dzZXJzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssXG4gIC8vIENocm9tZSA3KywgU2FmYXJpIDUuMSssIE9wZXJhIDExLjYrLCBpT1MgNC4yKy4gSWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBhZGRpbmdcbiAgLy8gcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLCB0aGVuIHRoYXQncyB0aGUgc2FtZSBhcyBubyBgVWludDhBcnJheWAgc3VwcG9ydFxuICAvLyBiZWNhdXNlIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBhZGQgYWxsIHRoZSBub2RlIEJ1ZmZlciBBUEkgbWV0aG9kcy4gVGhpcyBpcyBhbiBpc3N1ZVxuICAvLyBpbiBGaXJlZm94IDQtMjkuIE5vdyBmaXhlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJlxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nIC8vIENocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBXb3JrYXJvdW5kOiBub2RlJ3MgYmFzZTY0IGltcGxlbWVudGF0aW9uIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBzdHJpbmdzXG4gIC8vIHdoaWxlIGJhc2U2NC1qcyBkb2VzIG5vdC5cbiAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JyAmJiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHN1YmplY3QgPSBzdHJpbmd0cmltKHN1YmplY3QpXG4gICAgd2hpbGUgKHN1YmplY3QubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgICAgc3ViamVjdCA9IHN1YmplY3QgKyAnPSdcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdC5sZW5ndGgpIC8vIGFzc3VtZSB0aGF0IG9iamVjdCBpcyBhcnJheS1saWtlXG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSlcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICAgIGVsc2VcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdFtpXVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9PSBudWxsICYmIGIgIT09IHVuZGVmaW5lZCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggLyAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoICogMlxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgYXNzZXJ0KGlzQXJyYXkobGlzdCksICdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0LCBbdG90YWxMZW5ndGhdKVxcbicgK1xuICAgICAgJ2xpc3Qgc2hvdWxkIGJlIGFuIEFycmF5LicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBfaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBhc3NlcnQoc3RyTGVuICUgMiA9PT0gMCwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGFzc2VydCghaXNOYU4oYnl0ZSksICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGkgKiAyXG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIF91dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gX2FzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuICBzdGFydCA9IE51bWJlcihzdGFydCkgfHwgMFxuICBlbmQgPSAoZW5kICE9PSB1bmRlZmluZWQpXG4gICAgPyBOdW1iZXIoZW5kKVxuICAgIDogZW5kID0gc2VsZi5sZW5ndGhcblxuICAvLyBGYXN0cGF0aCBlbXB0eSBzdHJpbmdzXG4gIGlmIChlbmQgPT09IHN0YXJ0KVxuICAgIHJldHVybiAnJ1xuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgYXNzZXJ0KHRhcmdldF9zdGFydCA+PSAwICYmIHRhcmdldF9zdGFydCA8IHRhcmdldC5sZW5ndGgsXG4gICAgICAndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgc291cmNlLmxlbmd0aCwgJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMCB8fCAhQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIF91dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gX2FzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBfYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gX2FzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBfaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpKzFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IGNsYW1wKHN0YXJ0LCBsZW4sIDApXG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pXG5cbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICByZXR1cm4gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICB2YXIgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICAgIHJldHVybiBuZXdCdWZcbiAgfVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gYnVmW29mZnNldF0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMl0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICAgIHZhbCB8PSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXQgKyAzXSA8PCAyNCA+Pj4gMClcbiAgfSBlbHNlIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAxXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAyXSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDNdXG4gICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXRdIDw8IDI0ID4+PiAwKVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHZhciBuZWcgPSB0aGlzW29mZnNldF0gJiAweDgwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDE2KGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQzMihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRGbG9hdCAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZERvdWJsZSAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm5cblxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZiwgLTB4ODApXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIHRoaXMud3JpdGVVSW50OCh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgZWxzZVxuICAgIHRoaXMud3JpdGVVSW50OCgweGZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MTYoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgMHhmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQzMihidWYsIDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmNoYXJDb2RlQXQoMClcbiAgfVxuXG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmICFpc05hTih2YWx1ZSksICd2YWx1ZSBpcyBub3QgYSBudW1iZXInKVxuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCB0aGlzLmxlbmd0aCwgJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHRoaXMubGVuZ3RoLCAnZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdGhpc1tpXSA9IHZhbHVlXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3V0ID0gW11cbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBvdXRbaV0gPSB0b0hleCh0aGlzW2ldKVxuICAgIGlmIChpID09PSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTKSB7XG4gICAgICBvdXRbaSArIDFdID0gJy4uLidcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgb3V0LmpvaW4oJyAnKSArICc+J1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSlcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG4vLyBzbGljZShzdGFydCwgZW5kKVxuZnVuY3Rpb24gY2xhbXAgKGluZGV4LCBsZW4sIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykgcmV0dXJuIGRlZmF1bHRWYWx1ZVxuICBpbmRleCA9IH5+aW5kZXg7ICAvLyBDb2VyY2UgdG8gaW50ZWdlci5cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIGluZGV4ICs9IGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvZXJjZSAobGVuZ3RoKSB7XG4gIC8vIENvZXJjZSBsZW5ndGggdG8gYSBudW1iZXIgKHBvc3NpYmx5IE5hTiksIHJvdW5kIHVwXG4gIC8vIGluIGNhc2UgaXQncyBmcmFjdGlvbmFsIChlLmcuIDEyMy40NTYpIHRoZW4gZG8gYVxuICAvLyBkb3VibGUgbmVnYXRlIHRvIGNvZXJjZSBhIE5hTiB0byAwLiBFYXN5LCByaWdodD9cbiAgbGVuZ3RoID0gfn5NYXRoLmNlaWwoK2xlbmd0aClcbiAgcmV0dXJuIGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKHN1YmplY3QpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdWJqZWN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICB9KShzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgfVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3NcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdFxuICogaXMgbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3RcbiAqIGV4Y2VlZCB0aGUgbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICovXG5mdW5jdGlvbiB2ZXJpZnVpbnQgKHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlID49IDAsICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZzaW50ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZJRUVFNzU0ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbn1cblxuZnVuY3Rpb24gYXNzZXJ0ICh0ZXN0LCBtZXNzYWdlKSB7XG4gIGlmICghdGVzdCkgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UgfHwgJ0ZhaWxlZCBhc3NlcnRpb24nKVxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm5ncG1jUVwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxndWxwLWJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJ1ZmZlclxcXFxpbmRleC5qc1wiLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxndWxwLWJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJ1ZmZlclwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbnZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgUExVUyAgID0gJysnLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIICA9ICcvJy5jaGFyQ29kZUF0KDApXG5cdHZhciBOVU1CRVIgPSAnMCcuY2hhckNvZGVBdCgwKVxuXHR2YXIgTE9XRVIgID0gJ2EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFVQUEVSICA9ICdBJy5jaGFyQ29kZUF0KDApXG5cdHZhciBQTFVTX1VSTF9TQUZFID0gJy0nLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIX1VSTF9TQUZFID0gJ18nLmNoYXJDb2RlQXQoMClcblxuXHRmdW5jdGlvbiBkZWNvZGUgKGVsdCkge1xuXHRcdHZhciBjb2RlID0gZWx0LmNoYXJDb2RlQXQoMClcblx0XHRpZiAoY29kZSA9PT0gUExVUyB8fFxuXHRcdCAgICBjb2RlID09PSBQTFVTX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYyIC8vICcrJ1xuXHRcdGlmIChjb2RlID09PSBTTEFTSCB8fFxuXHRcdCAgICBjb2RlID09PSBTTEFTSF9VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MyAvLyAnLydcblx0XHRpZiAoY29kZSA8IE5VTUJFUilcblx0XHRcdHJldHVybiAtMSAvL25vIG1hdGNoXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIgKyAxMClcblx0XHRcdHJldHVybiBjb2RlIC0gTlVNQkVSICsgMjYgKyAyNlxuXHRcdGlmIChjb2RlIDwgVVBQRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gVVBQRVJcblx0XHRpZiAoY29kZSA8IExPV0VSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIExPV0VSICsgMjZcblx0fVxuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5IChiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuXG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Jylcblx0XHR9XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuXHRcdC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcblx0XHQvLyByZXByZXNlbnQgb25lIGJ5dGVcblx0XHQvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcblx0XHQvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG5cdFx0dmFyIGxlbiA9IGI2NC5sZW5ndGhcblx0XHRwbGFjZUhvbGRlcnMgPSAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMikgPyAyIDogJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDEpID8gMSA6IDBcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IG5ldyBBcnIoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoXG5cblx0XHR2YXIgTCA9IDBcblxuXHRcdGZ1bmN0aW9uIHB1c2ggKHYpIHtcblx0XHRcdGFycltMKytdID0gdlxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBkZWNvZGUoYjY0LmNoYXJBdChpICsgMykpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDApID4+IDgpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpID4+IDQpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTApIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgNCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA+PiAyKVxuXHRcdFx0cHVzaCgodG1wID4+IDgpICYgMHhGRilcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyXG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0ICh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoXG5cblx0XHRmdW5jdGlvbiBlbmNvZGUgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cC5jaGFyQXQobnVtKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKG51bSA+PiAxOCAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiAxMiAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiA2ICYgMHgzRikgKyBlbmNvZGUobnVtICYgMHgzRilcblx0XHR9XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKVxuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAyKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSdcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcCA9ICh1aW50OFt1aW50OC5sZW5ndGggLSAyXSA8PCA4KSArICh1aW50OFt1aW50OC5sZW5ndGggLSAxXSlcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDEwKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wID4+IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCAyKSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPSdcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0XG5cdH1cblxuXHRleHBvcnRzLnRvQnl0ZUFycmF5ID0gYjY0VG9CeXRlQXJyYXlcblx0ZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NFxufSh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcgPyAodGhpcy5iYXNlNjRqcyA9IHt9KSA6IGV4cG9ydHMpKVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm5ncG1jUVwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxndWxwLWJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJ1ZmZlclxcXFxub2RlX21vZHVsZXNcXFxcYmFzZTY0LWpzXFxcXGxpYlxcXFxiNjQuanNcIixcIi8uLlxcXFwuLlxcXFxub2RlX21vZHVsZXNcXFxcZ3VscC1icm93c2VyaWZ5XFxcXG5vZGVfbW9kdWxlc1xcXFxicm93c2VyaWZ5XFxcXG5vZGVfbW9kdWxlc1xcXFxidWZmZXJcXFxcbm9kZV9tb2R1bGVzXFxcXGJhc2U2NC1qc1xcXFxsaWJcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5leHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBuQml0cyA9IC03LFxuICAgICAgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwLFxuICAgICAgZCA9IGlzTEUgPyAtMSA6IDEsXG4gICAgICBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKSxcbiAgICAgIGQgPSBpc0xFID8gMSA6IC0xLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm5ncG1jUVwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxndWxwLWJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJ1ZmZlclxcXFxub2RlX21vZHVsZXNcXFxcaWVlZTc1NFxcXFxpbmRleC5qc1wiLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxndWxwLWJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJ1ZmZlclxcXFxub2RlX21vZHVsZXNcXFxcaWVlZTc1NFwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm5ncG1jUVwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxndWxwLWJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXHByb2Nlc3NcXFxcYnJvd3Nlci5qc1wiLFwiLy4uXFxcXC4uXFxcXG5vZGVfbW9kdWxlc1xcXFxndWxwLWJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXGJyb3dzZXJpZnlcXFxcbm9kZV9tb2R1bGVzXFxcXHByb2Nlc3NcIikiXX0=

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.
 * @description
 * # 
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('_', function () {
	return _;
});

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.esprima
 * @description
 * # esprima
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('esprima', function() {
	return esprima;
});

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.esrefactor
 * @description
 * # esrefactor
 * Service in the validateDsl.
 */
// angular.module('validateDsl').service('esrefactor', function() {
// 	return esrefactor;
// });

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.moment
 * @description
 * # moment
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('moment', function() {
	return moment;
});

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.RewireScope
 * @description
 * # RewireScope
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('RewireScope', function(esrefactor, _) {

	var RewireScope = {};

	RewireScope.getSimpleWrapper = function(callback) {
		return "(function() { return "+callback.toString()+"})()";
	}

	RewireScope.rewire = function(callback, newScopeMapper) {
		var newCallback = RewireScope.rename(callback, newScopeMapper);
		newCallback = RewireScope.wrapFn(newCallback.toString(), _.keys(newScopeMapper), "newScopeMapper");
		var e = eval(newCallback);
		return e;
	};

	// e.g.
	//      rename(function() { test(); test2(); }, "Rules", {test: "whatever"})
	//      will return function: function() { Rules.test(); test2(); }
	RewireScope.rename = function(callback, newScopeMapper) {
		// var code = "(function(){ return "+callback.toString()+"; })()";

		var code = RewireScope.wrapFn(callback.toString());

		_.each(newScopeMapper, function(newScope, prefix) {
			code = rename(code, prefix, newScope);
		});

		function rename(code, prefix, newScope) {
			var ctx = new esrefactor.Context(code);

			var keys = _.keys(newScope);

			var newCode = code;

			_.each(keys, function(key){
				var value = newScope[key];
				var indices = RewireScope.getIndices(newCode, key);
				for(var k in indices) {
					if(indices.hasOwnProperty(k)) {
						var index = indices[k];
						var id = ctx.identify(index);
						if(id) {
							var name = _.result(id, "identifier.name");
							if(name === key && _.isNull(id.declaration) && name) {
								var newName = getNewName(newScope, key, name);
								newCode = ctx.rename(id, prefix+"."+name);
								ctx = new esrefactor.Context(newCode);
								break;
							}
						}
					}
				}
			});

			function getNewName(newScope, key, currentName) {
				var value = newScope[key];
				if(_.isPlainObject(value)) {
					return key+"."+currentName;
				} else {
					return currentName;
				}
			}

			return newCode;
		}

		return eval(code);
	};

	RewireScope.getIndices = function(text, searchString, indices, start) {
		indices = indices || [];
		start = start || 0;
		if(text.length === 0) {
			return indices;
		} else {
			var index = text.indexOf(searchString);
			if(index !== -1) {
				indices.push(start+index);
				return RewireScope.getIndices(text.substr(index+1), searchString, indices, start+index);
			} else {
				return RewireScope.getIndices("", searchString, indices, start);
			}
		}
	};

	RewireScope.wrapFn = function(fnString, argumentNames, finalPrefix) {
		if(typeof fnString === 'function') {
			fnString = fnString.toString();
		}

		argumentNames = argumentNames || [];

		var parameterNames = argumentNames;

		if(finalPrefix) {
			parameterNames = _.map(argumentNames, function(v) {
				return finalPrefix+"."+v;
			});
		}

		var argumentNamesStr = argumentNames.join(", ");
		var parameterNamesStr = parameterNames.join(", ");

		return "(function("+argumentNamesStr+") { return "+fnString+"; })("+parameterNamesStr+")";
	}

	function isFromOutsideScope(id) {
		return id ? !!id.declaration : false;
	}


	return RewireScope;
});

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.Rule
 * @description
 * # Rule
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('Rule', function(_) {
	function Rule(check, errorMessage) {
		var debug = false;

		var checkFn;
		if(typeof check !== 'function') {
			checkFn = function() {
				return check;
			}
		} else {
			checkFn = check;
		}

		function RuleClass(thenRule, otherwiseRule, errorMessage, errorHandler) {
			this.thenRule = thenRule;
			this.otherwiseRule = otherwiseRule;
			this.errorMessage = errorMessage;
			this.errorHandler = errorHandler;
		}

		RuleClass.prototype.then = function(rule) {
			return new RuleClass(rule, this.otherwiseRule, this.errorMessage, this.errorHandler);
		};

		RuleClass.prototype.otherwise = function(rule) {
			// console.log("otherwise", rule, errorMessage);
			return new RuleClass(this.thenRule, rule, this.errorMessage, this.errorHandler);
		};

		RuleClass.prototype.onError = function(errorHandler) {
			return new RuleClass(this.thenRule, this.otherwiseRule, this.errorMessage, errorHandler);
		};

		RuleClass.prototype.withErrorMessage = function(errorMessage) {
			this.errorMessage = errorMessage;
			return this;
		}

		RuleClass.prototype.evaluate = function(value) {
			var r = checkFn(value);

			// debug && console.log("[Rule] checkFn("+value+") --> "+r, "["+checkFn+"]", check);
			debug && console.log("[Rule] checkFn("+value+") --> "+r);

			var nextRule;

			if(r) {
				if(this.thenRule) {
					nextRule = this.thenRule;
				}
			} else {
				if(this.otherwiseRule) {
					nextRule = this.otherwiseRule;
				}
			}

			if(nextRule) {
				r = nextRule.evaluate(value);

				if(! r) {
					if(! this.errorMessage) {
						this.errorMessage = nextRule.errorMessage;
					} else {
						this.errorMessage += ", "+nextRule.errorMessage;
					}
				}
			}

			if(! r && typeof this.errorHandler === 'function') {
				this.errorHandler(this.errorMessage);
			}

			return r;
		};

		return new RuleClass().withErrorMessage(errorMessage);
	}

	return Rule;
});

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

'use strict';

/**
 * @ngdoc service
 * @name validateDsl.ValidateDSL
 * @description
 * # ValidateDSL
 * Service in the validateDsl.
 */
angular.module('validateDsl').service('ValidateDSL', function($q, _, Rule, Rules, RewireScope) {

	return function(contextCallback, context) {
		if(typeof contextCallback === 'function') {
			context = context || {};

			// re-wire scope to current scope
			contextCallback = RewireScope.rewire(contextCallback, {
				Rules: Rules,
				Rule: Rule,
				context: context
			});

			return contextCallback();
		}
	}

});
