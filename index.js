var base = require('./base.js');
var gen = require('./gen.js');
var parser = require('./parse.js');
var path = require('path');

module.exports = function (code, opt) {
	opt = opt || {};
	opt.parser = opt.parser || parser;
	opt.base_path = opt.base_path || path.join(__dirname, '/base.js');
	return gen.generate(base.parse(opt.parser(), code).val, opt.base_path);
};