var base = require('./base.js');
var gen = require('./gen.js');
var parser = require('./parse.js');
var path = require('path');

module.exports = function (code, opt) {
	opt = opt || {};
	opt.base_path = opt.base_path || path.join(__dirname, '/base.js');
	opt.prefix = opt.prefix || "b";
	var ast = base.parse(parser(), code);
	if (!ast || !ast.val) return ast;
	var code = new gen(ast.val, opt.prefix);
	opt.main_rule = opt.main_rule || code.main_rule;
	return "var b = require(" + JSON.stringify(opt.base_path) + ");\n" + code.result + "\nmodule.exports = grammar;";
};