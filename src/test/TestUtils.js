/*
Example usage:
    var x1 = new UnitTest(()=>{return assertNotEqualsPrimitives(5,1)}, "5!=1 Test")
    var x2 = new UnitTest(()=>{return assertTrue(false)}, "Wrong Test")
    var suite = new TestSuite("Example");
    suite.addTest(x1);
    suite.addTest(x2);
    suite.run()
 */
const LOG_STYLES = {
    "Reset" : "\x1b[0m",
    "Bright" : "\x1b[1m",
    "FgRed" : "\x1b[31m",
    "FgYellow" : "\x1b[33m",
    "FgCyan" : "\x1b[36m"
};

exports.assertEqualsObjects = function assertEqualsObjects(expected, actual, noLog){
    if (noLog !== true) {
        if (!expected.equals(actual)){
            console.log(LOG_STYLES.FgRed ,"\texpected: " + JSON.stringify(expected) + "\n\tactual: " + JSON.stringify(actual))
        }
    }
    return expected.equals(actual)
}

exports.assertNotEqualsObjects = function assertNotEqualsObjects(expected, actual, noLog){
    if (noLog !== true) {
        if (expected.equals(actual)){
            console.log(LOG_STYLES.FgRed ,"\texpected: " + JSON.stringify(expected) + "\n\tactual: " + JSON.stringify(actual))
        }
    }
    return !expected.equals(actual)
}

exports.assertEqualsPrimitives = function assertEqualsPrimitives(expected, actual, noLog){
    if (noLog !== true) {
        if (expected !== actual){
            console.log(LOG_STYLES.FgRed ,"\texpected: " + JSON.stringify(expected) + "\n\tactual: " + JSON.stringify(actual))
        }
    }
    return expected === actual
}

exports.assertNotEqualsPrimitives = function assertNotEqualsPrimitives(expected, actual, noLog){
    if (noLog !== true) {
        if (expected === actual){
            console.log(LOG_STYLES.FgRed ,"\texpected: " + JSON.stringify(expected) + "\n\tactual: " + JSON.stringify(actual))
        }
    }
    return !(expected === actual)
}

// message - expected error message, fun - function reference, args - arguments of fun as list
exports.assertThrows = function assertThrows(source, message, fun, args){
    try {
        fun(...args);
        return false;
    } catch(error){
        return source === error.source && message === error.message;
    }
}

exports.assertFalse = function assertFalse(condition, noLog){
    if (noLog !== true) {
        if (condition){
            console.log(LOG_STYLES.FgRed ,"\texpected: false" + "\n\tactual: " + JSON.stringify(condition))
        }
    }
    return !condition
}

exports.assertTrue = function assertTrue(condition, noLog){
    if (noLog !== true) {
        if (!condition){
            console.log(LOG_STYLES.FgRed ,"\texpected: true" + "\n\tactual: " + JSON.stringify(condition))
        }
    }
    return condition
}

exports.fail = function fail(message){
    throw new Error("Test failed: " + message)
}

exports.assertDefined = function assertDefined(object, noLog){
    if (noLog !== true) {
        if (object === undefined){
            console.log(LOG_STYLES.FgRed ,"\texpected: defined" + "\n\tactual: undefined")
        }
    }
    return object !== undefined
}

exports.assertUndefined = function assertUndefined(object, noLog){
    if (noLog !== true) {
        if (object !== undefined){
            console.log(LOG_STYLES.FgRed ,"\texpected: undefined" + "\n\tactual: defined " + JSON.stringify(object))
        }
    }
    return object === undefined
}

//fun should be arg-free function returning boolean (passed or not)
exports.UnitTest = function UnitTest(fun, name){
    this.fun = fun;
    this.name = name;

    this.run = function () {
        return fun();
    }
}

exports.TestSuite = function TestSuite(name){
    this.tests = []; // [Test]
    this.name = name;

    this.addTest = function(test){
        this.tests.push(test)
    };

    this.run = function () {
        var passed = 0, failed = 0;
        for (var i = 0; i < this.tests.length; i++) {
            var currentTest = this.tests[i].run();
            if (currentTest) {
                passed += 1;
                console.log(LOG_STYLES.FgCyan ,"\"" + this.tests[i].name + "\"" + " passed.")
            } else {
                failed += 1;
                console.log(LOG_STYLES.FgRed ,"\"" + this.tests[i].name + "\"" + " failed.")
            }
        }
        console.log();
        if(failed === 0) console.log(LOG_STYLES.FgYellow, "\tAll tests passed.");
        else {
            console.log(LOG_STYLES.FgYellow, "\tPassed: " + passed + "/" + (passed+failed) + " tests.");
        }
        if(failed > 0) console.log(LOG_STYLES.Bright, LOG_STYLES.FgRed ,"\tTESTSUITE \"" + this.name + "\" NOT PASSED");
        else console.log(LOG_STYLES.Bright, LOG_STYLES.FgCyan, "\tTESTSUITE \"" + this.name + "\" PASSED")
    }
};
