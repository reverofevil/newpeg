var base = require('./base.js');
var gen = require('./gen.js');
var parser = require('./parse.js');
var path = require('path');

var m = {};

m.comp_parser = function (parser) {
	return function (code) {
		var res = base.parse(parser(), code);
		return res ? res.val : null;
	};
};

m.comp_gen = function (gen) {
	return function (ast, prefix, base_path) {
		if (!ast) return null;
		var code = new gen(ast, prefix);
		return "var b = require(" + JSON.stringify(base_path) + ");\n" + code.result + "\nmodule.exports = grammar;";
	};
};

m.make = function (code, opt) {
	opt = opt || {};
	opt.base_path = opt.base_path || path.join(__dirname, '/base.js');
	opt.prefix = opt.prefix || "b";
	opt.main_rule = opt.main_rule || code.main_rule;
	opt.parser = opt.parser || m.comp_parser(parser);
	opt.generator = opt.generator || m.comp_gen(gen);
	return opt.generator(opt.parser(code), opt.prefix, opt.base_path);
};

module.exports = m;