function contains(list, obj) {

    for (var i = 0; i < list.length; i++) {
        if (list[i] === obj) {
            return true
        }
    }
    return false

}

function abs(a) {
    return a >= 0 ? a : -a;
}

function log(message, longMessage){
    var lineAndSource = ((new Error).stack.split("\n")[1].split("/")).reverse()[0]
    console.log("[" + lineAndSource + "] " + message + (longMessage === undefined ? "" : "\n" + longMessage + "\n"))
}

function error(message, longMessage){
    var lineAndSource = ((new Error).stack.split("\n")[1].split("/")).reverse()[0]
    console.error("[" + lineAndSource + "] " + message + (longMessage === undefined ? "" : "\n" + longMessage + "\n"))
}

function warn(message, longMessage){
    var lineAndSource = ((new Error).stack.split("\n")[1].split("/")).reverse()[0]
    console.warn("[" + lineAndSource + "] " + message + (longMessage === undefined ? "" : "\n" + longMessage + "\n"))
}

function info(message, longMessage){
    var lineAndSource = ((new Error).stack.split("\n")[1].split("/")).reverse()[0]
    console.info("[" + lineAndSource + "] " + message + (longMessage === undefined ? "" : "\n" + longMessage + "\n"))
}