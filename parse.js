var b = require('../prim/base.js');
function grammar() {
    return b.flat(b.seq(b.some(b.ref(rule)), b.ref(_), b.ref(eof)), function(a, $0, $1) {
        return {
            type: "grammar",
            rules: a
        };
    });
}
function rule() {
    return b.flat(b.seq(b.ref(ident), b.ref(_), b.lit("="), b.ref(expr0), b.ref(eos)), function(a, $0, $1, b, $2) {
        return {
            type: "rule",
            name: a,
            expr: b
        };
    });
}
function expr0() {
    return b.par(b.flat(b.seq(b.ref(expr1), b.some(b.flat(b.seq(b.ref(_), b.lit("/"), b.ref(expr1)), function($0, $1, a) {
        return a;
    }))), function(a, b) {
        return {
            type: "choice",
            args: ( b.unshift(a), b)
        };
    }), b.ref(expr1));
}
function expr1() {
    return b.par(b.flat(b.seq(b.ref(expr2), b.negcheck(b.ref(numer)), b.ref(code_block)), function(a, $0, b) {
        return {
            type: "apply",
            expr: a,
            code: b
        };
    }), b.ref(expr2));
}
function code_block() {
    return b.flat(b.seq(b.ref(_), b.lit("{"), b.str(b.ref(code)), b.ref(_), b.lit("}")), function($0, $1, a, $2, $3) {
        return a;
    });
}
function code() {
    return b.any(b.par(b.ref(scomm), b.ref(mcommjs), b.ref(string), b.ref(code_block), b.apply(b.seq(b.negcheck(b.par(b.lit("}"))), b.chr), function($data) {
        return $data[1];
    })));
}
function expr2() {
    return b.par(b.apply(b.some(b.ref(expr3)), function(a) {
        return {
            type: "sequence",
            args: a
        };;
    }), b.apply(b.eps, function(data) {
        return {
            type: "eps"
        };
    }));
}
function expr3() {
    return b.par(b.flat(b.seq(b.ref(ident), b.ref(_), b.lit(":"), b.ref(expr4)), function(a, $0, $1, b) {
        return {
            type: "named",
            name: a,
            expr: b
        };
    }), b.flat(b.seq(b.ref(_), b.lit("@"), b.ref(expr4)), function($0, $1, a) {
        return {
            type: "saved",
            expr: a
        };
    }), b.flat(b.seq(b.ref(_), b.par(b.lit("!"), b.lit("&")), b.ref(expr4)), function($0, a, b) {
        return {
            type: ({
                "!": "negcheck",
                "&": "poscheck"
            })[a],
            expr: b
        };
    }), b.ref(expr4));
}
function expr4() {
    return b.par(b.flat(b.seq(b.ref(_), b.lit("$"), b.ref(expr5)), function($0, $1, b) {
        return {
            type: "stringify",
            expr: b
        };
    }), b.ref(expr5));
}
function expr5() {
    return b.par(b.flat(b.seq(b.ref(expr6), b.ref(_), b.par(b.lit("*"), b.lit("+"), b.lit("?"))), function(a, $0, b) {
        return {
            type: ({
                "*": "kleene",
                "+": "some",
                "?": "maybe"
            })[b],
            expr: a
        };
    }), b.flat(b.seq(b.ref(expr6), b.ref(numer)), function(a, b) {
        return {
            type: "several",
            expr: a,
            quantity: b
        };
    }), b.ref(expr6));
}
function numer() {
    return b.flat(b.seq(b.ref(_), b.lit("{"), b.ref(numer_range), b.ref(_), b.lit("}")), function($0, $1, a, $2, $3) {
        return a;
    });
}
function numer_range() {
    return b.par(b.apply(b.ref(number), function(a) {
        return {
            type: "exact",
            num: a
        };;
    }), b.flat(b.seq(b.ref(number), b.ref(_), b.lit(",")), function(from, $0, $1) {
        return {
            type: "atleast",
            from: a
        };
    }), b.flat(b.seq(b.ref(number), b.ref(_), b.lit(","), b.ref(number)), function(a, $0, $1, b) {
        return {
            type: "between",
            from: a,
            to: b
        };
    }));
}
function expr6() {
    return b.par(b.ref(string), b.ref(char_class), b.ref(any_char), b.ref(rule_ref), b.ref(check), b.ref(braced));
}
function char_class() {
    return b.flat(b.seq(b.ref(_), b.lit("["), b.maybe(b.lit("^")), b.any(b.ref(class_constr)), b.lit("]"), b.maybe(b.lit("i"))), function($0, $1, b, a, $2, c) {
        return {
            type: "class",
            ranges: a,
            negated: b === "^",
            case_insens: c === "i"
        };
    });
}
function class_constr() {
    return b.par(b.flat(b.seq(b.ref(class_char), b.lit("-"), b.ref(class_char)), function(a, $0, b) {
        return {
            type: "range",
            from: a,
            to: b
        };
    }), b.apply(b.ref(class_char), function(a) {
        return {
            type: "single",
            chr: a
        };;
    }));
}
function class_char() {
    return b.par(b.ref(escape), b.apply(b.seq(b.negcheck(b.par(b.lit("]"))), b.chr), function($data) {
        return $data[1];
    }));
}
function any_char() {
    return b.apply(b.seq(b.ref(_), b.lit(".")), function($data) {
        return (function(data) {
            return {
                type: "any"
            };
        })($data[0], $data[1]);
    });
}
function rule_ref() {
    return b.flat(b.seq(b.ref(ident), b.negcheck(b.seq(b.ref(_), b.lit("=")))), function(a, $0) {
        return {
            type: "ref",
            name: a
        };
    });
}
function check() {
    return b.flat(b.seq(b.ref(_), b.lit("&{"), b.str(b.ref(code)), b.ref(_), b.lit("}")), function($0, $1, a, $2, $3) {
        return {
            type: "check",
            code: a
        };
    });
}
function braced() {
    return b.flat(b.seq(b.ref(_), b.lit("("), b.ref(expr0), b.ref(_), b.lit(")")), function($0, $1, a, $2, $3) {
        return a;
    });
}
function number() {
    return b.flat(b.seq(b.ref(_), b.some(b.par(b.range("0", "9")))), function($0, a) {
        return parseInt(a, 10);
    });
}
function string() {
    return b.flat(b.seq(b.ref(_), b.par(b.ref(string_q), b.ref(string_qq)), b.maybe(b.lit("i"))), function($0, a, b) {
        return {
            type: "strlit",
            text: a,
            case_insens: b === "i"
        };
    });
}
function string_q() {
    return b.flat(b.seq(b.lit("'"), b.any(b.par(b.ref(escape), b.apply(b.seq(b.negcheck(b.par(b.lit("'"), b.lit("\\"))), b.chr), function($data) {
        return $data[1];
    }))), b.lit("'")), function($0, a, $1) {
        return a.join("");
    });
}
function string_qq() {
    return b.flat(b.seq(b.lit("\""), b.any(b.par(b.ref(escape), b.apply(b.seq(b.negcheck(b.par(b.lit("\""), b.lit("\\"))), b.chr), function($data) {
        return $data[1];
    }))), b.lit("\"")), function($0, a, $1) {
        return a.join("");
    });
}
function escape() {
    return b.flat(b.seq(b.lit("\\"), b.par(b.ref(hex_escape), b.ref(unicode_escape), b.ref(c_escape), b.chr)), function($0, a) {
        return a;
    });
}
function hex_escape() {
    return b.flat(b.seq(b.lit("x"), b.str(b.seq(b.ref(hex), b.ref(hex)))), function($0, a) {
        return String.fromCharCode(parseInt(a, 16));
    });
}
function unicode_escape() {
    return b.flat(b.seq(b.lit("u"), b.str(b.seq(b.ref(hex), b.ref(hex), b.ref(hex), b.ref(hex)))), function($0, a) {
        return String.fromCharCode(parseInt(a, 16));
    });
}
function c_escape() {
    return b.apply(b.par(b.lit("b"), b.lit("f"), b.lit("n"), b.lit("r"), b.lit("t"), b.lit("v")), function(a) {
        return "\b\f\n\r\t\x0B"["bfnrtv".indexOf(a)];;
    });
}
function hex() {
    return b.par(b.range("0", "9"), b.range("a", "f"), b.range("A", "F"));
}
function mcomm() {
    return b.seq(b.lit("/*"), b.any(b.par(b.ref(mcomm), b.apply(b.seq(b.negcheck(b.lit("*/")), b.chr), function($data) {
        return $data[1];
    }))), b.lit("*/"));
}
function mcomm_nonl() {
    return b.seq(b.lit("/*"), b.any(b.par(b.ref(mcomm_nonl), b.apply(b.seq(b.negcheck(b.par(b.lit("*/"), b.ref(nl))), b.chr), function($data) {
        return $data[1];
    }))), b.lit("*/"));
}
function mcommjs() {
    return b.seq(b.lit("/*"), b.any(b.apply(b.seq(b.negcheck(b.lit("*/")), b.chr), function($data) {
        return $data[1];
    })), b.lit("*/"));
}
function scomm() {
    return b.seq(b.lit("//"), b.any(b.seq(b.apply(b.seq(b.negcheck(b.par(b.lit("\r"), b.lit("\n"))), b.chr), function($data) {
        return $data[1];
    }), b.chr)), b.par(b.ref(nl), b.ref(eof)));
}
function ident() {
    return b.flat(b.seq(b.ref(_), b.str(b.seq(b.par(b.range("a", "z"), b.range("A", "Z"), b.lit("_")), b.any(b.par(b.range("a", "z"), b.range("A", "Z"), b.range("0", "9"), b.lit("_")))))), function($0, a) {
        return a;
    });
}
function _() {
    return b.any(b.par(b.ref(mcomm), b.ref(scomm), b.par(b.lit(" "), b.lit("\t")), b.ref(nl)));
}
function _nonl() {
    return b.any(b.par(b.ref(mcomm_nonl), b.ref(scomm), b.par(b.lit(" "), b.lit("\t"))));
}
function nl() {
    return b.par(b.lit("\r"), b.lit("\n\r"), b.lit("\n"));
}
function eos() {
    return b.par(b.seq(b.ref(_nonl), b.ref(nl)), b.seq(b.ref(_), b.par(b.lit(";"), b.ref(eof))));
}
function eof() {
    return b.negcheck(b.chr);
}
module.exports = grammar;