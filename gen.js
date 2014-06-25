var expradt = {
	"grammar"   : {"rules": "exprarr"},
	"rule"      : {"name": "val", "arglist": "val", "expr": "expr"},
	"choice"    : {"args": "exprarr"},
	"apply"     : {"expr": "expr", "code": "val"},
	"sequence"  : {"args": "exprarr"},
	"eps"       : {},
	"named"     : {"name": "val", "expr": "expr"},
	"saved"     : {"expr": "expr"},
	"negcheck"  : {"expr": "expr"},
	"poscheck"  : {"expr": "expr"},
	"stringify" : {"expr": "expr"},
	"kleene"    : {"expr": "expr"},
	"some"      : {"expr": "expr"},
	"maybe"     : {"expr": "expr"},
	"several"   : {"expr": "expr"},
	"exact"     : {"expr": "expr", "num": "val"},
	"atleast"   : {"expr": "expr", "from": "val"},
	"between"   : {"expr": "expr", "from": "val", "to": "val"},
	"class"     : {"negated": "val", "ranges": "exprarr", "case_insens": "val"},
	"single"    : {"chr": "val"},
	"range"     : {"from": "val", "to": "val"},
	"any"       : {},
	"ref"       : {"name": "val", "arglist": "exprarr"},
	"arg"       : {"name": "val"},
	"strlit"    : {"text": "val", "case_insens": "val"}
};

function walker(ast, visitors) {
	var path = [];
	return (function visit(ast) {
		path.push(ast.type);
		if (!ast || !ast.type) throw "Wrong visit on " + JSON.stringify(path);
		var res = visitors[ast.type](ast, visit);
		path.pop();
		return res;
	})(ast);
}

function def_visitor_gen(adt) {
	return function (type) {
		return function (ast, visit) {
			var res = {type: type}, args = adt[type];
			for (var arg in args) if (args.hasOwnProperty(arg)) {
				if (adt[type][arg] === "expr") {
					res[arg] = visit(ast[arg]);
				} else if (adt[type][arg] === "exprarr") {
					res[arg] = ast[arg] && ast[arg].map(visit);
				} else {
					res[arg] = ast[arg];
				}
			}
			return res;
		};
	};
}

function exprwalker(adt) {
	var def_visitor = def_visitor_gen(adt);
	return function (ast, visitors) {
		var all_visitors = {};
		for (var type in adt) if (adt.hasOwnProperty(type)) {
			if (!visitors.hasOwnProperty(type)) {
				all_visitors[type] = def_visitor(type);
				continue;
			}
			all_visitors[type] = visitors[type].bind({
				def_visitor: def_visitor
			});
		}
		return walker(ast, all_visitors);
	};
}

var walk = exprwalker(expradt);

function tolower(str) {
	return str.toLowerCase();
}

function toupper(str) {
	return str.toUpperCase();
}

function desugar_class(ast) {
	var case_insens = false;
	return walk(ast, {
		"class": function (ast, visit) {
			case_insens = ast.case_insens;
			var args = ast.ranges.map(visit);
			if (!ast.negated) return {type: "choice", args: args};
			return {
				type: "sequence",
				args: [
					{type: "negcheck", expr: {type: "choice", args: args}},
					{type: "saved", expr: {type: "any"}}
				]
			};
		},
		"single": function (ast, visit) {
			return {type: "strlit", text: ast.chr, case_insens: case_insens};
		},
		"range": function (ast, visit) {
			var def = this.def_visitor("range")(ast, visit);
			var r = [ast.from, ast.to];
			if (!case_insens || r.map(toupper) == r.map(tolower)) return def;
			return {
				type: "choice",
				args: [
					{type: "range", from: toupper(ast.from), to: toupper(ast.to)},
					{type: "range", from: tolower(ast.from), to: tolower(ast.to)}
				]
			};
		}
	});
}

var _ = {
	pluck: function (arr, key) {
		return arr.map(function (item) {
			return item[key];
		});
	},
	contains: function (arr, value) {
		return arr.some(function (item) {
			return item == value;
		});
	}
};

function clear(arg) {
	return arg.type == "named" || arg.type == "saved" ? arg.expr : arg;
}

function normalize(ast) {
	function gen_names(args) {
		var names = [];
		args.forEach(function (arg, index) {
			if (arg.type == "named") names.push(arg.name);
		});
		return names;
	}
	function gen_subset(ast, assoc, cond_arr) {
		var ss = [], c = 0;
		ast.args.forEach(function (arg, index) {
			if (arg.type != "named" && arg.type != "saved") return;
			++c;
			if (assoc) ss.push(arg.name + ": $data[" + index + "]");
			else ss.push("$data[" + index + "]");
		});
		return cond_arr && c > 1 ? "[" + ss.join(", ") + "]" : ss.join(", ");
	}
	function filter_seq(seq, visit) {
		return {
			type: "sequence",
			args: seq.args.map(clear).map(visit)
		};
	}
	return walk(ast, {
		"stringify": function (ast, visit) {
			if (ast.expr.type != "strlit")
				return this.def_visitor("stringify")(ast, visit);
			return {
				type: "apply", 
				expr: {type: "eps"}, 
				code: "function () { return " + JSON.stringify(ast.expr.text) + "; }" 
			};
		},
		"apply": function (ast, visit) {
			if (ast.expr.type == "eps") {
				return {
					type: "apply",
					expr: visit(ast.expr),
					code: "function () { " + ast.code + " }"
				};
			} else if (ast.expr.type == "named") {
				return {
					type: "apply",
					expr: visit(ast.expr.expr),
					code: "function (" + ast.expr.name + ") { " + ast.code + "}"
				};
			} else if (ast.expr.type == "sequence") {
				var types = _.pluck(ast.expr.args, "type");
				if (_.contains(types, "saved")) throw "Cannot bind action to a sequence with saved parts";
				if (!_.contains(types, "named")) {
					return {
						type: "apply",
						expr: visit(ast.expr),
						code: "function () { " + ast.code + " }"
					};
				}
				var names = gen_names(ast.expr.args);
				return {
					type: "apply",
					expr: filter_seq(ast.expr, visit),
					code: "function ($data) { " +
						"return (function (" + names.join(", ") + ") { " +
							ast.code + " " +
						"}).apply(null, [" + gen_subset(ast.expr) + "]); " +
					"}"
				};
			} else throw "Cannot apply to " + ast.expr.type;
		},
		"sequence": function(ast, visit) {
			var types = _.pluck(ast.args, "type");
			var hasSaved = _.contains(types, "saved"),
			    hasNamed = _.contains(types, "named")
			if (hasSaved && hasNamed)
				throw "Saved and named parts shouldn't be in the same sequence";
			if (!hasSaved && !hasNamed) {
				if (ast.args.length != 1)
					return this.def_visitor("sequence")(ast, visit);
				return visit(ast.args[0]);
			}
			if (hasSaved) {
				var code = gen_subset(ast, null, true);
				return {
					type: "apply",
					expr: filter_seq(ast, visit),
					code: "function ($data) { return " + code + "; }"
				};
			} else {
				return {
					type: "apply",
					expr: filter_seq(ast, visit),
					code: "function ($data) { " +
						"return {" + gen_subset(ast, true) + "}; " +
					"}"
				};
			}
		}
	});
};

function find_args(ast) {
	var provided = {}, required = {}, argcount = {}, args, main_rule;
	var res = walk(ast, {
		"rule": function (ast, visit) {
			if (provided[ast.name]) throw "Multiple provides";
			if (!main_rule) main_rule = ast.name;
			provided[ast.name] = true;
			ast.arglist = ast.arglist || [];
			argcount[ast.name] = ast.arglist.length;
			args = {};
			ast.arglist.forEach(function (arg) { args[arg] = true; });
			return this.def_visitor("rule")(ast, visit);
		},
		"ref": function (ast, visit) {
			if (args[ast.name]) {
				if (ast.arglist) throw "Argument cannot be used as a function";
				return {type: "arg", name: ast.name};
			}
			required[ast.name] = true;
			ast.arglist = ast.arglist || [];
			var len = ast.arglist.length;
			if (!argcount.hasOwnProperty(ast.name)) {
				argcount[ast.name] = len;
			} else if (argcount[ast.name] !== len) {
				throw "Wrong number of arguments";
			}
			return this.def_visitor("ref")(ast, visit);
		}
	});
	for (var rule in required)
		if (required.hasOwnProperty(rule) && !provided[rule])
			throw rule + " required but never provided";
	return {ast: res, main_rule: main_rule};
}

function gen_code(info, base_path) {
	var prefix = "$";
	function gen_call(name, args) {
		return prefix + "." + name + (args ? "(" + args.join(",") + ")" : "");
	}
	function gen_list(name) {
		return function (ast, visit) {
			return gen_call(name, ast.args.map(visit));
		};
	}
	function gen_expr(name) {
		return function (ast, visit) {
			return gen_call(name, [visit(ast.expr)]);
		};
	}
	function error(text) {
		return function (ast, visit) {
			throw text;
		};
	}
	function escape(text) {
		return JSON.stringify(text);
	}
	var res = "var " + prefix + " = require(" + escape(base_path) + ");\n";
	res += walk(info.ast, {
		"grammar"   : function (ast, visit) {
			return ast.rules.map(visit).join("");
		},
		"rule"      : function (ast, visit) {
			return "function " + ast.name + "(" + ast.arglist.join(", ") + ") {\n" + 
				"return " + visit(ast.expr) + ";\n" + 
			"}";
		},
		"apply"     : function (ast, visit) {
			return gen_call("apply", [visit(ast.expr), ast.code]);
		},
		"eps"       : function (ast, visit) {
			return gen_call("eps");
		},
		"exact"     : function (ast, visit) {
			return gen_call("exact", [visit(ast.expr), ast.num]);
		},
		"atleast"   : function (ast, visit) {
			return gen_call("atleast", [visit(ast.expr), ast.from]);
		},
		"between"   : function (ast, visit) {
			return gen_call("between", [visit(ast.expr), ast.from, ast.to]);
		},
		"range"     : function (ast, visit) {
			return gen_call("range", [escape(ast.from), escape(ast.to)]);
		},
		"any"       : function (ast, visit) {
			return gen_call("chr");
		},
		"ref"       : function (ast, visit) {
			return gen_call("ref", [ast.name].concat(ast.arglist.map(visit)));
		},
		"arg"       : function (ast, visit) {
			return ast.name;
		},
		"strlit"    : function (ast, visit) {
			return gen_call(ast.case_insens ? "liti" : "lit", [escape(ast.text)]);
		},
		"choice"    : gen_list("par"),
		"sequence"  : gen_list("seq"),
		"negcheck"  : gen_expr("negcheck"),
		"poscheck"  : gen_expr("poscheck"),
		"stringify" : gen_expr("str"),
		"kleene"    : gen_expr("any"),
		"some"      : gen_expr("some"),
		"maybe"     : gen_expr("maybe"),
		"several"   : error("CLASS"),
		"class"     : error("SEVERAL")
	});
	res += "module.exports = " + info.main_rule + ";\n";
	return res;
}

function generate(ast, base_path) {
	return gen_code(find_args(normalize(desugar_class(ast))), base_path);
}

module.exports = {
	desugar_class: desugar_class,
	normalize: normalize,
	find_args: find_args,
	gen_code: gen_code,
	generate: generate
};