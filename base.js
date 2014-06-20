var b = {};

// exact string match
b.lit = function (str) {
	return function (from) {
		return this.source.substr(from, str.length) !== str ? null : {val: str, next: from + str.length};
	};
};

// exact string match (case insensitive)
b.liti = function (str) {
	str = str.toLowerCase();
	return function (from) {
		return this.source.substr(from, str.length).toLowerCase() !== str ? null : {val: str, next: from + str.length};
	};
};

// sequence
b.seq = function (/* args */) {
	var args = Array.prototype.slice.call(arguments);
	return function (from) {
		var self = this, ret = [];
		return args.every(function (arg) {
			var res = arg.bind(self)(from);
			if (res) ret.push(res.val), from = res.next;
			return res;
		}) && {val: ret, next: from};
	};
};

// alternatives
b.par = function (/* args */) {
	var args = Array.prototype.slice.call(arguments);
	return function (from) {
		var self = this, ret;
		return args.some(function (arg) {
			var res = arg.bind(self)(from);
			if (res) { ret = res.val; from = res.next; }
			return res;
		}) && {val: ret, next: from};
	};
};

// a*
b.any = function (arg) {
	return function (from) {
		var f = arg.bind(this), res, ret = [];
		while (res = f(from))
			ret.push(res.val), from = res.next;
		return {val: ret, next: from};
	};
};

// empty string
b.eps = function (from) {
	return {val: null, next: from};
};

// one arbitrary character
b.chr = function (from) {
	return from < this.source.length ? {val: this.source[from], next: from + 1} : null;
};

// a+
b.some = function (arg) {
	return b.flat(b.seq(arg, b.any(arg)), function (a, c) {
		return c.unshift(a), c;
	});
};

// a?
b.maybe = function (arg) {
	return b.par(arg, b.eps);
};

// mutual recursion of rules
b.ref = function (rule /*, args */) {
	var args = Array.prototype.slice.call(arguments);
	args.shift();
	return function (from) {
		return rule.apply(null, args).call(this, from);
	};
};

// work with parser's return value
b.apply = function (p, f) {
	return function (from) {
		var res = p.bind(this)(from);
		if (!res) return res;
		res.val = f(res.val);
		return res;
	};
};

// same as `apply`, but array becomes a list of arguments
b.flat = function (p, f) {
	return b.apply(p, function (xs) {
		return f.apply(null, xs);
	});
};

// positive lookahead
b.poscheck = function (parser) {
	return function (from) {
		var res = parser.bind(this)(from);
		return res ? {val: res.val, next: from} : null;
	};
};

// positive lookahead
b.negcheck = function (parser) {
	return function (from) {
		var res = parser.bind(this)(from);
		return res ? null : {val: null, next: from};
	};
};

// run arbitrary check
b.check = function (p, f) {
	return function (from) {
		var res = p.bind(this)(from);
		return res && f(res.val) && res;
	};
};

// same as `check`, but array becomes a list of arguments
b.checkflat = function (p, f) {
	return b.check(p, function (xs) {
		return f.apply(null, xs);
	});
};

// get result as parsed string
b.str = function (p) {
	return function (from) {
		var ret = p.bind(this)(from);
		return ret && {val: this.source.substr(from, ret.next - from), next: ret.next};
	};
};

// check if character fits criteria
b.fits = function (f) {
	return function (from) {
		return from < this.source.length && f(this.source[from]) ? {val: this.source[from], next: from + 1} : null;
	};
};

function asc(c) {
	return c.charCodeAt(0);
}

// check for character range
b.range = function (a, d) {
	return b.fits(function (c) {
		return asc(a) <= asc(c) && asc(c) <= asc(d);
	});
};

// end of input
b.eof = function (from) {
	return from < this.source.length ? null : {val: null, next: from};
};

// check if first expression's match matches the second expression
b.but = function (p1, p2) {
	return function (from) {
		var ret = p1.bind(this)(from);
		if (!ret) return null;
		return b.parse(
			b.seq(p2, b.eof),
			this.source.substr(from, ret.next - from)
		) ? ret : null;
	};
};

// parse given string with given parser
b.parse = function (parser, source) {
	var state = {source: source};
	return parser.bind(state)(0);
};

module.exports = b;