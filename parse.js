var $ = require("./base.js");
function grammar() {
    return $.apply($.seq($.apply($.eps, function() {
        return "grammar";
    }), $.some($.ref(rule)), $.ref(_), $.ref(eof)), function($data) {
        return {
            type: $data[0],
            rules: $data[1]
        };
    });
}
function rule() {
    return $.apply($.seq($.apply($.eps, function() {
        return "rule";
    }), $.ref(ident), $.maybe($.ref(argdeflist)), $.ref(_), $.lit("="), $.ref(expr0), $.ref(eos)), function($data) {
        return {
            type: $data[0],
            name: $data[1],
            arglist: $data[2],
            expr: $data[5]
        };
    });
}
function expr0() {
    return $.par($.apply($.seq($.apply($.eps, function() {
        return "choice";
    }), $.ref(inter1, $.ref(expr1), $.seq($.ref(_), $.lit("/")))), function($data) {
        return {
            type: $data[0],
            args: $data[1]
        };
    }), $.ref(expr1));
}
function expr1() {
    return $.par($.apply($.seq($.apply($.eps, function() {
        return "apply";
    }), $.ref(expr2), $.negcheck($.ref(numer)), $.ref(code_block)), function($data) {
        return {
            type: $data[0],
            expr: $data[1],
            code: $data[3]
        };
    }), $.ref(expr2));
}
function code_block() {
    return $.apply($.seq($.ref(_), $.lit("{"), $.str($.ref(code)), $.ref(_), $.lit("}")), function($data) {
        return $data[2];
    });
}
function code() {
    return $.any($.par($.ref(scomm), $.ref(mcommjs), $.ref(string), $.ref(code_block), $.apply($.seq($.negcheck($.par($.lit("}"))), $.chr), function($data) {
        return $data[1];
    })));
}
function expr2() {
    return $.par($.apply($.seq($.apply($.eps, function() {
        return "sequence";
    }), $.some($.ref(expr3))), function($data) {
        return {
            type: $data[0],
            args: $data[1]
        };
    }), $.apply($.seq($.apply($.eps, function() {
        return "eps";
    })), function($data) {
        return {
            type: $data[0]
        };
    }));
}
function expr3() {
    return $.par($.apply($.seq($.apply($.eps, function() {
        return "named";
    }), $.ref(ident), $.ref(_), $.lit(":"), $.ref(expr4)), function($data) {
        return {
            type: $data[0],
            name: $data[1],
            expr: $data[4]
        };
    }), $.apply($.seq($.ref(_), $.ref(expr3op), $.ref(expr4)), function($data) {
        return {
            type: $data[1],
            expr: $data[2]
        };
    }), $.ref(expr4));
}
function expr3op() {
    return $.par($.apply($.seq($.apply($.eps, function() {
        return "saved";
    }), $.lit("@")), function($data) {
        return $data[0];
    }), $.apply($.seq($.apply($.eps, function() {
        return "negcheck";
    }), $.lit("!")), function($data) {
        return $data[0];
    }), $.apply($.seq($.apply($.eps, function() {
        return "poscheck";
    }), $.lit("&")), function($data) {
        return $data[0];
    }));
}
function expr4() {
    return $.par($.apply($.seq($.apply($.eps, function() {
        return "stringify";
    }), $.ref(_), $.lit("$"), $.ref(expr5)), function($data) {
        return {
            type: $data[0],
            expr: $data[3]
        };
    }), $.ref(expr5));
}
function expr5() {
    return $.par($.apply($.seq($.ref(expr6), $.ref(_), $.ref(expr5op)), function($data) {
        return {
            expr: $data[0],
            type: $data[2]
        };
    }), $.apply($.seq($.ref(expr6), $.ref(numer)), function($data) {
        return (function(expr, qty) {
            return qty.expr = expr, qty;
        }).apply(null, [$data[0], $data[1]]);
    }), $.ref(expr6));
}
function expr5op() {
    return $.par($.apply($.seq($.apply($.eps, function() {
        return "kleene";
    }), $.lit("*")), function($data) {
        return $data[0];
    }), $.apply($.seq($.apply($.eps, function() {
        return "some";
    }), $.lit("+")), function($data) {
        return $data[0];
    }), $.apply($.seq($.apply($.eps, function() {
        return "maybe";
    }), $.lit("?")), function($data) {
        return $data[0];
    }));
}
function numer() {
    return $.apply($.seq($.ref(_), $.lit("{"), $.ref(numer_range), $.ref(_), $.lit("}")), function($data) {
        return $data[2];
    });
}
function numer_range() {
    return $.par($.apply($.seq($.apply($.eps, function() {
        return "exact";
    }), $.ref(number)), function($data) {
        return {
            type: $data[0],
            num: $data[1]
        };
    }), $.apply($.seq($.apply($.eps, function() {
        return "atleast";
    }), $.ref(number), $.ref(_), $.lit(",")), function($data) {
        return {
            type: $data[0],
            from: $data[1]
        };
    }), $.apply($.seq($.apply($.eps, function() {
        return "between";
    }), $.ref(number), $.ref(_), $.lit(","), $.ref(number)), function($data) {
        return {
            type: $data[0],
            from: $data[1],
            to: $data[4]
        };
    }));
}
function expr6() {
    return $.par($.ref(string), $.ref(char_class), $.ref(any_char), $.ref(rule_ref), $.ref(braced));
}
function char_class() {
    return $.apply($.seq($.apply($.eps, function() {
        return "class";
    }), $.ref(_), $.lit("["), $.maybe($.apply($.lit("^"), function() {
        return true;
    })), $.any($.ref(class_constr)), $.lit("]"), $.ref(ichar)), function($data) {
        return {
            type: $data[0],
            negated: $data[3],
            ranges: $data[4],
            case_insens: $data[6]
        };
    });
}
function class_constr() {
    return $.par($.apply($.seq($.apply($.eps, function() {
        return "range";
    }), $.ref(class_char), $.lit("-"), $.ref(class_char)), function($data) {
        return {
            type: $data[0],
            from: $data[1],
            to: $data[3]
        };
    }), $.apply($.seq($.apply($.eps, function() {
        return "single";
    }), $.ref(class_char)), function($data) {
        return {
            type: $data[0],
            chr: $data[1]
        };
    }));
}
function class_char() {
    return $.par($.ref(escape), $.apply($.seq($.negcheck($.par($.lit("]"))), $.chr), function($data) {
        return $data[1];
    }));
}
function any_char() {
    return $.apply($.seq($.apply($.eps, function() {
        return "any";
    }), $.ref(_), $.lit(".")), function($data) {
        return {
            type: $data[0]
        };
    });
}
function rule_ref() {
    return $.apply($.seq($.apply($.eps, function() {
        return "ref";
    }), $.ref(ident), $.maybe($.ref(arglist)), $.negcheck($.seq($.ref(_), $.lit("=")))), function($data) {
        return {
            type: $data[0],
            name: $data[1],
            arglist: $data[2]
        };
    });
}
function braced() {
    return $.apply($.seq($.ref(_), $.lit("("), $.ref(expr0), $.ref(_), $.lit(")")), function($data) {
        return $data[2];
    });
}
function argdeflist() {
    return $.apply($.seq($.lit("("), $.ref(inter, $.ref(ident), $.seq($.ref(_), $.lit(","))), $.ref(_), $.lit(")")), function($data) {
        return $data[1];
    });
}
function arglist() {
    return $.apply($.seq($.lit("("), $.ref(inter, $.ref(expr0), $.seq($.ref(_), $.lit(","))), $.ref(_), $.lit(")")), function($data) {
        return $data[1];
    });
}
function number() {
    return $.apply($.seq($.ref(_), $.some($.par($.range("0", "9")))), function($data) {
        return (function(n) {
            return parseInt(n, 10);
        }).apply(null, [$data[1]]);
    });
}
function string() {
    return $.apply($.seq($.apply($.eps, function() {
        return "strlit";
    }), $.ref(_), $.par($.ref(string_, $.lit("'")), $.ref(string_, $.lit("\""))), $.ref(ichar)), function($data) {
        return {
            type: $data[0],
            text: $data[2],
            case_insens: $data[3]
        };
    });
}
function string_(sep) {
    return $.apply($.seq(sep, $.any($.par($.ref(escape), $.apply($.seq($.negcheck(sep), $.apply($.seq($.negcheck($.par($.lit("\\"))), $.chr), function($data) {
        return $data[1];
    })), function($data) {
        return $data[1];
    }))), sep), function($data) {
        return (function(a) {
            return a.join("");
        }).apply(null, [$data[1]]);
    });
}
function escape() {
    return $.apply($.seq($.lit("\\"), $.par($.ref(hex_escape), $.ref(ucode_escape), $.ref(c_escape), $.chr)), function($data) {
        return $data[1];
    });
}
function hex_escape() {
    return $.apply($.seq($.lit("x"), $.str($.exact($.ref(hex), 2))), function($data) {
        return (function(a) {
            return String.fromCharCode(parseInt(a, 16));
        }).apply(null, [$data[1]]);
    });
}
function ucode_escape() {
    return $.apply($.seq($.lit("u"), $.str($.exact($.ref(hex), 4))), function($data) {
        return (function(a) {
            return String.fromCharCode(parseInt(a, 16));
        }).apply(null, [$data[1]]);
    });
}
function c_escape() {
    return $.apply($.seq($.par($.lit("b"), $.lit("f"), $.lit("n"), $.lit("r"), $.lit("t"), $.lit("v"))), function($data) {
        return (function(a) {
            return "\b\f\n\r\t\x0B"["bfnrtv".indexOf(a)];
        }).apply(null, [$data[0]]);
    });
}
function inter(a, b) {
    return $.apply($.seq(a, $.any($.apply($.seq(b, a), function($data) {
        return $data[1];
    }))), function($data) {
        return (function(a, b) {
            return b.unshift(a), b;
        }).apply(null, [$data[0], $data[1]]);
    });
}
function inter1(a, b) {
    return $.apply($.seq(a, $.some($.apply($.seq(b, a), function($data) {
        return $data[1];
    }))), function($data) {
        return (function(a, b) {
            return b.unshift(a), b;
        }).apply(null, [$data[0], $data[1]]);
    });
}
function hex() {
    return $.par($.par($.range("0", "9"), $.range("0", "9")), $.par($.range("A", "F"), $.range("a", "f")));
}
function ichar() {
    return $.maybe($.apply($.lit("i"), function() {
        return true;
    }));
}
function mcomm() {
    return $.seq($.lit("/*"), $.any($.par($.ref(mcomm), $.seq($.negcheck($.lit("*/")), $.chr))), $.lit("*/"));
}
function mcomm_nonl() {
    return $.seq($.lit("/*"), $.any($.par($.ref(mcomm_nonl), $.seq($.negcheck($.par($.lit("*/"), $.ref(nl))), $.chr))), $.lit("*/"));
}
function mcommjs() {
    return $.seq($.lit("/*"), $.any($.seq($.negcheck($.lit("*/")), $.chr)), $.lit("*/"));
}
function scomm() {
    return $.seq($.lit("//"), $.any($.seq($.apply($.seq($.negcheck($.par($.lit("\r"), $.lit("\n"))), $.chr), function($data) {
        return $data[1];
    }), $.chr)), $.par($.ref(nl), $.ref(eof)));
}
function ident() {
    return $.apply($.seq($.ref(_), $.str($.seq($.par($.range("a", "z"), $.range("A", "Z"), $.lit("_")), $.any($.par($.range("a", "z"), $.range("A", "Z"), $.range("0", "9"), $.lit("_")))))), function($data) {
        return $data[1];
    });
}
function _() {
    return $.any($.par($.ref(mcomm), $.ref(scomm), $.par($.lit(" "), $.lit("\t")), $.ref(nl)));
}
function _nonl() {
    return $.any($.par($.ref(mcomm_nonl), $.ref(scomm), $.par($.lit(" "), $.lit("\t"))));
}
function nl() {
    return $.par($.lit("\r"), $.lit("\n\r"), $.lit("\n"));
}
function eos() {
    return $.par($.seq($.ref(_nonl), $.ref(nl)), $.seq($.ref(_), $.par($.lit(";"), $.ref(eof))));
}
function eof() {
    return $.negcheck($.chr);
}
module.exports = grammar;
