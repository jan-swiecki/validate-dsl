// window.esrefactor = require("esrefactor");
// console.log("esrefactor", window.esrefactor);

angular.module('validateDsl').service('esrefactor', function() {
	return require("esrefactor");
});

// var code = "console.log(x); x()";

// var ctx = new esrefactor.Context(code);

// var id = ctx.identify(12);

// console.log(ctx.rename(id, "Rules.x"));