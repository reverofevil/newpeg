var _ = require('lodash-node');
var assert = require('assert');

function generator(ast, prefix) {
	this.prefix = prefix || "b";
	this.required = {};
	this.provided = {};
	this.result = this.genGrammar(ast);
	this.checkRequires();
}

generator.prototype.genGrammar = function (node) {
	assert(node.type === 'grammar', "genGrammar takes only grammars");
	return node.rules.map(this.genRule.bind(this)).join("\n");
};

generator.prototype.genRule = function (node) {
	assert(node.type === 'rule', "genRule takes only rules");
	this.provided[node.name] = true;
	if (!this.main_rule) this.main_rule = node.name;
	return "function " + node.name + "() { return " + this.genExpr(node.expr) + " ; }";
};

generator.prototype.genExpr = function (node) {
	switch (node.type) {
		case 'named':
		case 'saved':     return this.genExpr(node.expr);
		case 'choice':    return this.genChoice(node);
		case 'apply':     return this.genApply(node);
		case 'sequence':  return this.genSequence(node);
		case 'eps':       return this.genEps(node);
		case 'negcheck':  return this.genNegCheck(node);
		case 'poscheck':  return this.genPosCheck(node);
		case 'stringify': return this.genStringify(node);
		case 'kleene':    return this.genKleene(node);
		case 'some':      return this.genSome(node);
		case 'maybe':     return this.genMaybe(node);
		case 'several':   return this.genSeveral(node);
		case 'class':     return this.genClass(node);
		case 'any':       return this.genAny(node);
		case 'ref':       return this.genRef(node);
		case 'check':     return this.genCheck(node);
		case 'strlit':    return this.genStrlit(node);
		default:          assert(false, "genExpr got " + JSON.stringify(node));
	}
};

generator.prototype.genChoice = function (node) {
	assert(node.type === 'choice', "genChoice takes only choice");
	return this.prefix + ".par(" + node.args.map(this.genExpr.bind(this)).join(", ") + ")";
};

generator.prototype.genArgs = function (filt) {
	return filt.map(function (i) { return "$data[" + i + "]"; }).join(", ");
};

generator.prototype.removeChecks = function (types) {
	var ret = [];
	types.map(function (type, index) {
		if (type !== 'poscheck' && type !== 'negcheck' && type !== 'check')
			ret.push(index);
	});
	return ret;
};

generator.prototype.leaveSaved = function (types) {
	var ret = [];
	types.map(function (type, index) {
		if (type === 'saved')
			ret.push(index);
	});
	return ret;
};

generator.prototype.genNames = function (types, names) {
	var ph_count = 0;
	return types.map(function (type, index) {
		return type === 'named' ? names[index] : "$" + (ph_count++);
	});
};

generator.prototype.genApply = function (node) {
	assert(node.type === 'apply', "genApply takes only apply");
	if (node.expr.type !== "sequence")
		return this.prefix + ".apply(" + this.genExpr(node.expr) + ", function (data) {" + node.code + "})";
	var res = this.genSequenceImpl(node.expr);
	if (res.apptype === 'flat')
		return this.prefix + ".flat(" + res.code + ", function (" + res.names.join(", ") + ") {" + node.code + "})";
	if (res.apptype === 'only')
		return this.prefix + ".apply(" + res.code + ", function (" + res.arg + ") { " + node.code + "; })";
	return this.prefix + ".apply(" + res.code + ", function ($data) { " +
		"return (function (data) {" + node.code + "})(" + this.genArgs(res.filtered) + "); })";
};

generator.prototype.genSequenceImpl = function (node) {
	var types = _.pluck(node.args, "type");
	var names = _.pluck(node.args, "name");
	var hasNamed = _.contains(types, "named");
	var hasSaved = _.contains(types, "saved");
	assert(!hasNamed || !hasSaved, "Sequence cannot contain named and saved subexpressions at the same time");
	var code = node.args.map(this.genExpr.bind(this)).join(", ");
	if (node.args.length == 1) return { code: code, apptype: "only", arg: hasNamed ? names[0] : 'data' };
	code = this.prefix + ".seq(" + code + ")";
	if (hasNamed) return { code: code, apptype: "flat", names: this.genNames(types, names) };
	var ret = { code: code, apptype: "apply", filtered: hasSaved ? this.leaveSaved(types) : this.removeChecks(types) };
	ret.omitted = ret.filtered.length != types.length;
	return ret;
};

generator.prototype.genSequence = function (node) {
	assert(node.type === 'sequence', "genSequence takes only sequence");
	var res = this.genSequenceImpl(node);
	if (!res.omitted) return res.code;
	var ret = this.prefix + ".apply(" + res.code + ", function ($data) { return ";
	ret += res.filtered.length == 1 ? "$data[" + res.filtered[0] + "]" : "[" + this.genArgs(res.filtered) + "]"
	return ret + "; })";
};

generator.prototype.genEps = function (node) {
	assert(node.type === 'eps', "genEps takes only eps");
	return this.prefix + ".eps";
};

generator.prototype.genNegCheck = function (node) {
	assert(node.type === 'negcheck', "genNegCheck takes only negcheck");
	return this.prefix + ".negcheck(" + this.genExpr(node.expr) + ")";
};

generator.prototype.genPosCheck = function (node) {
	assert(node.type === 'poscheck', "genPosCheck takes only poscheck");
	return this.prefix + ".poscheck(" + this.genExpr(node.expr) + ")";
};

generator.prototype.genStringify = function (node) {
	assert(node.type === 'stringify', "genStringify takes only stringify");
	return this.prefix + ".str(" + this.genExpr(node.expr) + ")";
};

generator.prototype.genKleene = function (node) {
	assert(node.type === 'kleene', "genKleene takes only kleene");
	return this.prefix + ".any(" + this.genExpr(node.expr) + ")";
};

generator.prototype.genSome = function (node) {
	assert(node.type === 'some', "genSome takes only some");
	return this.prefix + ".some(" + this.genExpr(node.expr) + ")";
};

generator.prototype.genMaybe = function (node) {
	assert(node.type === 'maybe', "genMaybe takes only maybe");
	return this.prefix + ".maybe(" + this.genExpr(node.expr) + ")";
};

generator.prototype.genSeveral = function (node) {
	assert(node.type === 'several', "genSeveral takes only several");
	switch (node.quantity.type) {
		case 'exact': 
			return this.prefix + ".times(" + this.genExpr(node.expr) + ", " + node.quantity.num + ")"; 
		case 'atleast':
			return this.prefix + ".atleast(" + this.genExpr(node.expr) + ", " + node.quantity.from + ")"; 
		case 'between':
			return this.prefix + ".between(" + this.genExpr(node.expr) + ", " + node.quantity.from + ", " + node.quantity.to + ")"; 
		default: assert(false, "Unknown quantity type");
	}
};

function escape(chr) {
	return JSON.stringify(chr);
}

generator.prototype.genClass = function (node) {
	assert(node.type === 'class', "genClass takes only class");
	var self = this;
	var res = this.prefix + ".par(" + node.ranges.map(function (range) {
		if (range.type === 'range') {
			if (!node.case_insens ||
				range.from.toLowerCase() == range.from.toUpperCase() &&
				range.to.toLowerCase() == range.to.toUpperCase())
				return self.prefix + ".range(" + escape(range.from) + ", " + escape(range.to) + ")";
			return self.prefix + ".range(" + escape(range.from.toLowerCase()) + ", " + escape(range.to.toLowerCase()) + "), " +
				self.prefix + ".range(" + escape(range.from.toUpperCase()) + ", " + escape(range.to.toUpperCase()) + ")";
		} else if (range.type === 'single') {
			if (!node.case_insens || range.chr.toLowerCase() == range.chr.toUpperCase())
				return self.prefix + ".lit(" + escape(range.chr) + ")";
			return self.prefix + ".lit(" + escape(range.chr.toLowerCase()) + "), " +
				self.prefix + ".lit(" + escape(range.chr.toUpperCase()) + ")";
		} else assert(false, "Unknown range type");
	}).join(", ") + ")";
	return node.negated ? this.prefix + ".apply(" +
		this.prefix + ".seq(" +
			this.prefix + ".negcheck(" + res + "), " +
			this.prefix + ".chr" +
		")" +
	", function ($data) { return $data[1]; })": res;
};

generator.prototype.genAny = function (node) {
	assert(node.type === 'any', "genAny takes only any");
	return this.prefix + ".chr";
};

generator.prototype.genRef = function (node) {
	assert(node.type === 'ref', "genRef takes only ref");
	this.required[node.name] = true;
	return this.prefix + ".ref(" + node.name + ")";
};

generator.prototype.genCheck = function (node) {
	assert(node.type === 'check', "genCheck takes only check");
	assert(false, "Check not implemeted");
};

generator.prototype.genStrlit = function (node) {
	assert(node.type === 'strlit', "genStrlit takes only strlit");
	if (node.case_insens)
		return this.prefix + ".liti(" + escape(node.text) + ")";
	return this.prefix + ".lit(" + escape(node.text) + ")";
};

generator.prototype.checkRequires = function () {
	for (var i in this.requires)
		if (this.requires.hasOwnProperty(i) && !this.provides[i])
			assert(false, i + " required but never provided");
};

module.exports = generator;