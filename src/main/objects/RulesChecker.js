.import "./Utils.js" as Utils
.import "./Errors.js" as Errors

var DEBUG = false;

function concurrentOctaves(prevChord, currentChord){
    if(prevChord.harmonicFunction.equals(currentChord.harmonicFunction)) return 0;
    for(var i = 0; i < 3; i++){
        for(var j = i + 1; j < 4; j++){
            if(Utils.mod((prevChord.notes[j].pitch-prevChord.notes[i].pitch), 12) === 0){
                if(Utils.mod((currentChord.notes[j].pitch-currentChord.notes[i].pitch), 12) === 0){
                    if(DEBUG) {
                        Utils.log("concurrentOctaves "+i+" "+j, prevChord + " -> " + currentChord );
                    }
                    return -1;
                }
            }
        }
    }
    return 0;
}

//TODO zmienic na gamowlasciwie
function concurrentFifths(prevChord, currentChord){
    if(prevChord.harmonicFunction.equals(currentChord.harmonicFunction)) return 0;
    for(var i = 0; i < 3; i++){
        for(var j = i + 1; j < 4; j++){
            if(Utils.mod((prevChord.notes[j].pitch-prevChord.notes[i].pitch), 12) === 7){
                if(Utils.mod(currentChord.notes[j].pitch-currentChord.notes[i].pitch, 12) === 7){
                    if(DEBUG) {
                        Utils.log("concurrentFifths "+i+" "+j, prevChord + " -> " + currentChord);
                    }

                    return -1;
                }
            }
        }
    }
    return 0;
}

function crossingVoices(prevChord, currentChord){
    for(var i = 0; i < 3; i++){
        if(currentChord.notes[i].pitch>prevChord.notes[i+1].pitch){
            if(DEBUG) {
                Utils.log("crossingVoices",prevChord + " -> " + currentChord);
            }
            return -1
        }
    }
    for(var i = 3; i > 0; i--){
        if(currentChord.notes[i].pitch<prevChord.notes[i-1].pitch){
            if(DEBUG){
                Utils.log("crossingVoices", prevChord + " -> " + currentChord);
            }
            return -1
        }
    }
    return 0;
}

//TODO sprawdzić, czy w obrębie tej samej funkcji może być spełnione
function oneDirection(prevChord, currentChord){
    if((currentChord.bassNote.pitch>prevChord.bassNote.pitch && currentChord.tenorNote.pitch>prevChord.tenorNote.pitch
        && currentChord.altoNote.pitch>prevChord.altoNote.pitch && currentChord.bassNote.pitch>prevChord.bassNote.pitch)
        ||(currentChord.bassNote.pitch<prevChord.bassNote.pitch && currentChord.tenorNote.pitch<prevChord.tenorNote.pitch
            && currentChord.altoNote.pitch<prevChord.altoNote.pitch && currentChord.bassNote.pitch<prevChord.bassNote.pitch)){
        if(DEBUG){
            Utils.log("oneDirection", prevChord + " -> " + currentChord);
        }
        return -1;
    }

    return 0;
}

//TODO wychylenie modulacyjne - ok, np zmiana tercji z malej na wielka | problem z tą samą funkcją - dziwne skoki w basic
function forbiddenJump(prevChord, currentChord, notNeighbourChords){
    if(!notNeighbourChords && prevChord.harmonicFunction.equals(currentChord.harmonicFunction)) return 0;
    function getBaseDistance(first, second ){
        var i = 0
        while(first!==second) {
            first = Utils.mod((first+1), 7)
            i++
        }
        return i
    }

    function checkAlteration(halfToneDist, baseDist){
        if(halfToneDist > 12){
            if(Utils.mod(halfToneDist, 12) === 0) halfToneDist = 12
            else halfToneDist = Utils.mod(halfToneDist, 12)
        }
        var alteredIntervals = {1:0, 3:1, 5:2, 6:3, 8:4, 10:5, 12:6}
        return alteredIntervals[halfToneDist] === baseDist
    }

    function isAltered(firstNote, secondNote){
        var halfToneDist = firstNote.pitch-secondNote.pitch
        var firstBase = firstNote.baseNote
        var secondBase = secondNote.baseNote
        var baseDistance = -1
        if(halfToneDist>0){
            baseDistance = getBaseDistance(secondBase, firstBase)
        } else{
            baseDistance = getBaseDistance(firstBase, secondBase)
            if(halfToneDist === 0 && baseDistance !== 1) baseDistance = 1;
            halfToneDist = -halfToneDist
        }
        return checkAlteration(halfToneDist, baseDistance)
    }
    for(var i = 0; i < 4; i++){
        //TODO upewnić się jak ze skokami jest naprawdę, basu chyba ta zasada się nie tyczy
        if(Utils.abs(currentChord.notes[i].pitch-prevChord.notes[i].pitch)>12) return -1;
        if(isAltered(prevChord.notes[i],currentChord.notes[i])) return -1;
    }
    return 0;
}

//TODO wychylenie modulacyjne - ok, np zmiana tercji z malej na wielka, zmiana trybu
function forbiddenSumJump(prevPrevChord, prevChord, currentChord){
    if(prevPrevChord.harmonicFunction.equals(prevChord.harmonicFunction) && prevChord.harmonicFunction.equals(currentChord.harmonicFunction)) return 0;
    for(var i = 0; i < 4; i++){
        if(((prevPrevChord.notes[i].pitch>prevChord.notes[i].pitch && prevChord.notes[i].pitch>currentChord.notes[i].pitch) ||
            (prevPrevChord.notes[i].pitch<prevChord.notes[i].pitch && prevChord.notes[i].pitch<currentChord.notes[i].pitch))
            && forbiddenJump(prevPrevChord, currentChord, true) === -1){
            if(DEBUG) {
                Utils.log("forbiddenSumJump", prevPrevChord + " -> " + prevChord + " -> " + currentChord);
            }
            return -1;
        }
    }
    return 0;
}

function checkIllegalDoubled3(chord){
    var terCounter = 0;
    for(var i = 0; i < chord.notes.length; i++){
        if(chord.notes[i].chordComponent.baseComponent === '3'){
            terCounter ++
        }
    }
    //neapolitan chord handler
    if(chord.harmonicFunction.degree === 2 && chord.harmonicFunction.down
        && chord.harmonicFunction.functionName === 'S' && chord.harmonicFunction.mode === 'minor'){
         return chord.bassNote.chordComponent.baseComponent !== '3' || terCounter !== 2
    }
    return terCounter > 1
}

function checkConnection(prevChord, currentChord){
    var couldHaveDouble3 = false;
    if(prevChord.harmonicFunction.functionName === "D" && currentChord.harmonicFunction.functionName === "T"){
        if(Utils.contains([-4,3], currentChord.harmonicFunction.degree - prevChord.harmonicFunction.degree)) {
            var dominantVoiceWith3 = -1;
            for (var i = 0; i < 4; i++) {
                if (prevChord.notes[i].chordComponent.baseComponent === "3") {
                    dominantVoiceWith3 = i;
                    break;
                }
            }
            if (dominantVoiceWith3 > -1 && currentChord.notes[dominantVoiceWith3].chordComponent.baseComponent !== "1") return -1;

            if (Utils.contains(prevChord.harmonicFunction.extra, "7")) {
                var dominantVoiceWith7 = -1;
                for (var i = 0; i < 4; i++) {
                    if (prevChord.notes[i].chordComponent === "7") {
                        dominantVoiceWith7 = i;
                        break;
                    }
                }
                if (dominantVoiceWith7 > -1 && currentChord.notes[dominantVoiceWith7].chordComponent.baseComponent !== "3") return -1;
            }
        }

        if(currentChord.harmonicFunction.degree === 6 && prevChord.harmonicFunction.degree === 5) {
            couldHaveDouble3 = true;
            var dominantVoiceWith3 = -1;
            for (var i = 0; i < 4; i++) {
                if (prevChord.notes[i].chordComponent.baseComponent === "3") {
                    dominantVoiceWith3 = i;
                    break;
                }
            }
            if (dominantVoiceWith3 > -1 && currentChord.notes[dominantVoiceWith3].chordComponent.baseComponent !== "3") return -1;

            var dominantVoiceWith5 = -1;
            for (var i = 0; i < 4; i++) {
                if (prevChord.notes[i].chordComponent.baseComponent === "5") {
                    dominantVoiceWith5 = i;
                    break;
                }
            }
            if (dominantVoiceWith5 > -1 && currentChord.notes[dominantVoiceWith5].chordComponent.baseComponent !== "3") return -1;

            if (Utils.contains(prevChord.harmonicFunction.extra, "7")) {
                var dominantVoiceWith7 = -1;
                for (var i = 0; i < 4; i++) {
                    if (prevChord.notes[i].chordComponent.baseComponent === "7") {
                        dominantVoiceWith7 = i;
                        break;
                    }
                }
                if (dominantVoiceWith7 > -1 && currentChord.notes[dominantVoiceWith7].chordComponent.baseComponent !== "5") return -1;
            }
        }
    }
    if(prevChord.harmonicFunction.functionName === "D" && currentChord.harmonicFunction.functionName === "S")
        throw new Errors.RulesCheckerError("Forbidden connection: S->D");

    if(!couldHaveDouble3 && checkIllegalDoubled3(currentChord)) return -1;
    return 0;
}

function checkDelayCorrectness(prevChord, currentChord){
    var delay = prevChord.harmonicFunction.delay;
    if(delay.length === 0) return 0;
    var delayedVoices = [];
    for(var i=0; i<delay.length; i++){
        var prevComponent = delay[i][0];
        var currentComponent = delay[i][1];
        for(var j=0; j<4; j++){
            if(prevChord.notes[j].chordComponent === prevComponent) {
                if(currentChord.notes[j].chordComponent !== currentComponent){
                    if(DEBUG) {
                        console.log("delay error"+i+" "+j);
                        console.log(prevChord + " -> " + currentChord);
                    }
                    return -1;
                }
                else delayedVoices.push(j);
            }
        }
    }
    for(var i=0; i<4; i++){
        if(Utils.contains(delayedVoices, i)) continue;
        if(!prevChord.notes[i].equals(currentChord.notes[i]) && i !== 0) {
            if(DEBUG) {
                console.log("delay error"+i+" "+j);
                console.log(prevChord + " -> " + currentChord);
            }
            return -1;
        }
    }
    return 0;
}

function hiddenOctaves(prevChord, currentChord){
    var sameDirection = (prevChord.bassNote < currentChord.bassNote && prevChord.sopranoNote < currentChord.sopranoNote) ||
        (prevChord.bassNote > currentChord.bassNote && prevChord.sopranoNote > currentChord.sopranoNote);
    if(sameDirection && Utils.abs(prevChord.sopranoNote.pitch-currentChord.sopranoNote.pitch)>2 &&
        (currentChord.bassNote.pitch-currentChord.sopranoNote.pitch)%12===0){
        if(DEBUG) {
            console.log("hiddenOctaves");
            console.log(prevChord + " -> " + currentChord);
        }
        return -1;
    }
    return 0;
}

function falseRelation(prevChord, currentChord){
    for(var i=0; i<4; i++){
        for(var j=i; j<4; j++){
            if(Utils.abs(prevChord.notes[i].pitch-currentChord.notes[j].pitch) === 1 &&
                prevChord.notes[i].baseNote === currentChord.notes[j].baseNote) return -1;
        }
    }
    return 0;
}

function checkRules(prevPrevChord, prevChord, currentChord, rules, checkSumJumpRule){
    var result = 0;
    if(prevChord !== undefined){
        for (var i = 0; i < rules.length; i++) {
            var currentResult = rules[i](prevChord, currentChord);
            if (currentResult === -1) return -1;
            result += currentResult
        }
        if (prevPrevChord !== undefined && checkSumJumpRule) {
            var currentResult = forbiddenSumJump(prevPrevChord, prevChord, currentChord);
            if (currentResult === -1) return -1;
            result += currentResult;
        }
    }
    else{
        if(checkIllegalDoubled3(currentChord)) return -1;
    }
    return result
}

function checkAllRules(prevPrevChord, prevChord, currentChord){
    var chosenRules = [falseRelation, hiddenOctaves, checkDelayCorrectness, concurrentOctaves, concurrentFifths, crossingVoices, oneDirection, forbiddenJump, checkConnection];
    var result = checkRules(prevPrevChord ,prevChord, currentChord, chosenRules, true);
    return result
}