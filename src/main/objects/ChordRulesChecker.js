.import "./Utils.js" as Utils
.import "./Errors.js" as Errors
.import "./Consts.js" as Consts
.import "./IntervalUtils.js" as IntervalUtils
.import "./HarmonicFunction.js" as HarmonicFunction
.import "./RulesCheckerUtils.js" as RulesCheckerUtils
.import "./Graph.js" as Graph

var DEBUG = false;

function ChordRulesChecker(isFixedBass, isFixedSoprano){
    RulesCheckerUtils.Evaluator.call(this, 3);
    this.isFixedBass = isFixedBass;
    this.isFixedSoprano = isFixedSoprano;

    this.hardRules = [
        new ConcurrentOctavesRule(), new ConcurrentFifthsRule(), new CrossingVoicesRule(),
        new OneDirectionRule(), new ForbiddenJumpRule(false, isFixedBass, isFixedSoprano),
        new CheckDelayCorrectnessRule(), new HiddenOctavesRule(), new FalseRelationRule(),
        new DominantRelationCheckConnectionRule(), new DominantSecondRelationCheckConnectionRule(),
        new DominantSubdominantCheckConnectionRule(), new SubdominantDominantCheckConnectionRule(),
        new SameFunctionCheckConnectionRule(), new SubdominantDominantCheckConnectionRule(),
        new IllegalDoubledThirdRule()
    ];
    this.softRules = [new ForbiddenSumJumpRule()];
}

/*
        RULES
 */

function SameFunctionRule(){
    RulesCheckerUtils.IRule.call(this);
    this.evaluate = function(connection){
        if(connection.prev.harmonicFunction.equals(connection.current.harmonicFunction))
            return 0;
        return -1;
    }
}

function SpecificFunctionConnectionRule(prevFunctionName, currentFunctionName){
    RulesCheckerUtils.IRule.call(this);
    this.currentFunctionName = currentFunctionName;
    this.prevFunctionName = prevFunctionName;
    this.evaluate = function(connection){
        if(connection.prev.harmonicFunction.functionName === this.prevFunctionName &&
            connection.current.harmonicFunction.functionName === this.currentFunctionName)
            return 0;
        return -1;
    }
}

function ConcurrentOctavesRule(){
    RulesCheckerUtils.IRule.call(this);

    this.evaluate = function(connection){
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var sfRule = new SameFunctionRule();
        if(sfRule.isNotBroken(connection)) return 0;
        for(var i = 0; i < 3; i++){
            for(var j = i + 1; j < 4; j++){
                if(IntervalUtils.isOctaveOrPrime(currentChord.notes[j],currentChord.notes[i]) &&
                    IntervalUtils.isOctaveOrPrime(prevChord.notes[j],prevChord.notes[i])){
                    if(DEBUG) Utils.log("concurrentOctaves "+i+" "+j, prevChord + " -> " + currentChord);
                    return -1;
                }
            }
        }
        return 0;
    }
}

function ConcurrentFifthsRule(){
    RulesCheckerUtils.IRule.call(this);

    this.evaluate = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var sfRule = new SameFunctionRule();
        if (sfRule.isNotBroken(connection)) return 0;
        for (var i = 0; i < 3; i++) {
            for (var j = i + 1; j < 4; j++) {
                if (IntervalUtils.isFive(currentChord.notes[j], currentChord.notes[i]) &&
                    IntervalUtils.isFive(prevChord.notes[j], prevChord.notes[i])) {
                    if (DEBUG) Utils.log("concurrentFifths " + i + " " + j, prevChord + " -> " + currentChord);
                    return -1;
                }
            }
        }
        return 0;
    }
}

function CrossingVoicesRule(){
    RulesCheckerUtils.IRule.call(this);

    this.evaluate = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        for(var i = 0; i < 3; i++){
            if(currentChord.notes[i].isUpperThan(prevChord.notes[i+1])){
                if(DEBUG) Utils.log("crossingVoices", prevChord + " -> " + currentChord);
                return -1
            }
        }
        for(var i = 3; i > 0; i--){
            if(currentChord.notes[i].isLowerThan(prevChord.notes[i-1])){
                if(DEBUG) Utils.log("crossingVoices", prevChord + " -> " + currentChord);
                return -1
            }
        }
        return 0;
    }
}

function OneDirectionRule(){
    RulesCheckerUtils.IRule.call(this);

    this.evaluate = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        if ((currentChord.bassNote.isUpperThan(prevChord.bassNote) && currentChord.tenorNote.isUpperThan(prevChord.tenorNote)
            && currentChord.altoNote.isUpperThan(prevChord.altoNote) && currentChord.sopranoNote.isUpperThan(prevChord.sopranoNote))
            || (currentChord.bassNote.isLowerThan(prevChord.bassNote) && currentChord.tenorNote.isLowerThan(prevChord.tenorNote)
                && currentChord.altoNote.isLowerThan(prevChord.altoNote) && currentChord.sopranoNote.isLowerThan(prevChord.sopranoNote))) {
            if (DEBUG) Utils.log("oneDirection", prevChord + " -> " +currentChord);
            return -1;
        }

        return 0;
    }
}

function IllegalDoubledThirdRule(){
    RulesCheckerUtils.IRule.call(this);
    this.evaluate = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var specificConnectionRule = new SpecificFunctionConnectionRule(Consts.FUNCTION_NAMES.DOMINANT, Consts.FUNCTION_NAMES.TONIC);
        if ((specificConnectionRule.isNotBroken(connection) ||
            Utils.containsBaseChordComponent(prevChord.harmonicFunction.extra, "7")) &&
            prevChord.harmonicFunction.isInDominantRelation(currentChord.harmonicFunction) &&
            Utils.containsChordComponent(prevChord.harmonicFunction.extra, "5<"))
            return 0;
        if(specificConnectionRule.isNotBroken(connection) && prevChord.harmonicFunction.isInSecondRelation(currentChord.harmonicFunction))
            return 0;

        return this.hasIllegalDoubled3Rule(currentChord)? -1 : 0
    };

    this.hasIllegalDoubled3Rule = function(chord){
        var terCounter = chord.countBaseComponents("3");
        if(chord.harmonicFunction.isNeapolitan())
            return terCounter !== 2;
        return terCounter > 1
    }
}

function ForbiddenJumpRule(notNeighbourChords, isFixedBass, isFixedSoprano){
    RulesCheckerUtils.IRule.call(this);
    this.notNeighbourChords = notNeighbourChords;
    this.isFixedBass = isFixedBass;
    this.isFixedSoprano = isFixedSoprano;

    this.evaluate = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        // if(!notNeighbourChords && prevChord.harmonicFunction.equals(currentChord.harmonicFunction)) return 0;

        for (var i = 0; i < 4; i++) {
            //TODO upewnić się jak ze skokami jest naprawdę, basu chyba ta zasada się nie tyczy
            if (IntervalUtils.pitchOffsetBetween(currentChord.notes[i], prevChord.notes[i]) > 9 && !(this.notNeighbourChords && i === 0)
                && !(i === 0 && IntervalUtils.pitchOffsetBetween(currentChord.notes[i], prevChord.notes[i]) === 12) &&!this.skipCheckingVoiceIncorrectJump(i)) {
                if (DEBUG) Utils.log("Forbidden jump in voice " + i, prevChord + "->" + currentChord);
                return -1;
            }
            if (IntervalUtils.isAlteredInterval(prevChord.notes[i], currentChord.notes[i])) {
                if (DEBUG) Utils.log("Altered Interval in voice " + i, prevChord + "->" + currentChord);
                return -1;
            }
        }
        return 0;
    }

    this.skipCheckingVoiceIncorrectJump = function(voiceNumber) {
        return (voiceNumber === 0 && this.fixedBass)
            || (voiceNumber === 3 && this.fixedSoprano)
    }
}

function ForbiddenSumJumpRule(){
    RulesCheckerUtils.IRule.call(this);

    this.evaluate = function(connection) {
        if(!Utils.isDefined(connection.prevPrev))
            return 0;
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var prevPrevChord = connection.prevPrev;

        var sfRule = new SameFunctionRule();
        if (sfRule.isNotBroken(new RulesCheckerUtils.Connection(connection.prevPrev, connection.prev)) &&
            sfRule.isNotBroken(new RulesCheckerUtils.Connection(connection.prev, connection.current))) return 0;
        var forbiddenJumpRule = new ForbiddenJumpRule();
        for (var i = 0; i < 4; i++) {
            if (((prevPrevChord.notes[i].isUpperThan(prevChord.notes[i]) && prevChord.notes[i].isUpperThan(currentChord.notes[i])) ||
                (prevPrevChord.notes[i].isLowerThan(prevChord.notes[i]) && prevChord.notes[i].isLowerThan(currentChord.notes[i])))
                && forbiddenJumpRule.isBroken(new RulesCheckerUtils.Connection(connection.current, connection.prevPrev), true)) {
                if (DEBUG) {
                    Utils.log("forbiddenSumJump in voice " + i, prevPrevChord + " -> " + prevChord + " -> " + currentChord);
                }
                return -1;
            }
        }
        return 0;
    }
}

function CheckDelayCorrectnessRule(){
    RulesCheckerUtils.IRule.call(this);

    this.evaluate = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var delay = prevChord.harmonicFunction.delay;
        if (delay.length === 0) return 0;
        var delayedVoices = [];
        for (var i = 0; i < delay.length; i++) {
            var prevComponent = delay[i][0];
            var currentComponent = delay[i][1];
            for (var j = 0; j < 4; j++) {
                if (prevChord.notes[j].chordComponentEquals(prevComponent.chordComponentString)) {
                    if (!currentChord.notes[j].chordComponentEquals(currentComponent.chordComponentString)) {
                        if (DEBUG) Utils.log("delay error" + i + " " + j, prevChord + " -> " + currentChord);
                        return -1;
                    } else delayedVoices.push(j);
                }
            }
        }
        for (var i = 0; i < 4; i++) {
            if (Utils.contains(delayedVoices, i)) continue;
            if (!prevChord.notes[i].equalPitches(currentChord.notes[i]) && i !== 0) {
                if (DEBUG) Utils.log("delay error" + i + " " + j, prevChord + " -> " + currentChord);
                return -1;
            }
        }
        return 0;
    }
}

function HiddenOctavesRule(){
    RulesCheckerUtils.IRule.call(this);

    this.evaluate = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var sameDirection = (prevChord.bassNote.isLowerThan(currentChord.bassNote) && prevChord.sopranoNote.isLowerThan(currentChord.sopranoNote) ||
            (prevChord.bassNote.isUpperThan(currentChord.bassNote) && prevChord.sopranoNote.isUpperThan(currentChord.sopranoNote)));
        if (sameDirection && Utils.abs(prevChord.sopranoNote.pitch - currentChord.sopranoNote.pitch) > 2 &&
            IntervalUtils.isOctaveOrPrime(currentChord.bassNote, currentChord.sopranoNote)) {
            if (DEBUG) Utils.log("hiddenOctaves", prevChord + " -> " + currentChord);
            return -1;
        }
        return 0;
    }
}

function FalseRelationRule(){
    RulesCheckerUtils.IRule.call(this);

    this.evaluate = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        // for (var i = 0; i < 4; i++) {
        //     if (IntervalUtils.isChromaticAlteration(prevChord.notes[i], currentChord.notes[i])) {
        //         return 0;
        //     }
        // }

        for (var i = 0; i < 4; i++) {
            for (var j = i + 1; j < 4; j++) {
                if (IntervalUtils.isChromaticAlteration(prevChord.notes[i], currentChord.notes[j])) {
                    if(!this.causedBySopranoOrBassSettings(prevChord, currentChord, i, j)) {
                        if (DEBUG) Utils.log("false relation between voices " + i + " " + j, prevChord + "->" + currentChord);
                        return -1;
                    }
                }
                if (IntervalUtils.isChromaticAlteration(prevChord.notes[j], currentChord.notes[i])) {
                    if(!this.causedBySopranoOrBassSettings(prevChord, currentChord, j, i)) {
                        if (DEBUG) Utils.log("false relation between voices " + j + " " + i, prevChord + "->" + currentChord);
                        return -1;
                    }
                }
            }
        }
        return 0;
    }

    this.causedBySopranoOrBassSettings = function(prevChord, currentChord, prevVoice, currentVoice){
        //for example D7 -> TVI -> (D) -> SII
        if(prevChord.countBaseComponents("3") === 2 && prevChord.notes[prevVoice].baseChordComponentEquals("3"))
            return true;
        //given bass, couldn't avoid false relation
        if(prevVoice === 0 || currentVoice === 0)
            return true;
        //given soprano, couldn't avoid false relation
        if(prevVoice === 3 || currentVoice === 3){
            if(Utils.isDefined(prevChord.harmonicFunction.position) && Utils.isDefined(currentChord.harmonicFunction.position))
                return true;
        }
        return false;
    }
}

function ICheckConnectionRule(){

    RulesCheckerUtils.IRule.call(this);

    this.evaluate = function(connection) {
        var translatedConnection = this.translateConnectionIncludingDeflections(connection);
        if(!Utils.isDefined(translatedConnection))
            return 0;
        return this.evaluateIncludingDeflections(translatedConnection);
    };

    this.translateConnectionIncludingDeflections = function(connection){
        var currentChord = connection.current.copy();
        var prevChord = connection.prev.copy();
        var currentFunctionTranslated = currentChord.harmonicFunction.copy();
        currentFunctionTranslated.key = currentChord.harmonicFunction.key;
        var prevFunctionTranslated = prevChord.harmonicFunction.copy();
        prevFunctionTranslated.key = prevChord.harmonicFunction.key;
        if(prevChord.harmonicFunction.key !== currentChord.harmonicFunction.key){
            if(Utils.isDefined(prevChord.harmonicFunction.key) && !prevChord.harmonicFunction.isRelatedBackwards) {
                currentFunctionTranslated.functionName = Consts.FUNCTION_NAMES.TONIC;
                currentFunctionTranslated.degree = 1;
            } else if(currentChord.harmonicFunction.isRelatedBackwards){
                prevFunctionTranslated.functionName = Consts.FUNCTION_NAMES.TONIC;
                prevFunctionTranslated.degree = 1;
            } else
                return undefined
        }
        currentChord.harmonicFunction = currentFunctionTranslated;
        prevChord.harmonicFunction = prevFunctionTranslated;

        return new RulesCheckerUtils.Connection(currentChord, prevChord)
    };

    this.evaluateIncludingDeflections = function(connection){
        return new Error("ICheckConnectionRule default method was called")
    };

    //returns voice number with given base component, otherwise returns -1
    this.voiceWithBaseComponent = function(chord, baseComponent){
        var voiceWithGivenComponent = -1;
        for (var i = 0; i < 4; i++) {
            if (chord.notes[i].baseChordComponentEquals(baseComponent)) {
                voiceWithGivenComponent = i;
                break;
            }
        }
        return voiceWithGivenComponent;
    };

    //returns voice number with given chord component, otherwise returns -1
    this.voiceWithComponent = function(chord, chordComponent){
        var voiceWithGivenComponent = -1;
        for (var i = 0; i < 4; i++) {
            if (chord.notes[i].chordComponentEquals(chordComponent)) {
                voiceWithGivenComponent = i;
                break;
            }
        }
        return voiceWithGivenComponent;
    };

}

function DominantRelationCheckConnectionRule(){

    ICheckConnectionRule.call(this);

    this.evaluateIncludingDeflections = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var specificConnectionRule = new SpecificFunctionConnectionRule(Consts.FUNCTION_NAMES.DOMINANT, Consts.FUNCTION_NAMES.TONIC);
        if ((specificConnectionRule.isNotBroken(connection) ||
            Utils.containsBaseChordComponent(prevChord.harmonicFunction.extra, "7")) &&
            prevChord.harmonicFunction.isInDominantRelation(currentChord.harmonicFunction)){
            if(this.brokenThirdMoveRule(prevChord, currentChord))
                return -1;
            if (Utils.containsBaseChordComponent(prevChord.harmonicFunction.extra, "7")) {
                if(this.brokenSeventhMoveRule(prevChord, currentChord))
                    return -1;
                if (Utils.containsBaseChordComponent(prevChord.harmonicFunction.extra, "9") && this.brokenNinthMoveRule(prevChord, currentChord))
                        return -1;
            }
            if (Utils.containsChordComponent(prevChord.harmonicFunction.extra, "5<")  && this.brokenUpFifthMoveRule(prevChord, currentChord))
                return -1;
            if ((Utils.containsChordComponent(prevChord.harmonicFunction.extra, "5>") || prevChord.harmonicFunction.getFifth().chordComponentString === "5>") &&
                this.brokenDownFifthMoveRule(prevChord, currentChord))
                return -1;
            if (prevChord.harmonicFunction.isChopin() && this.brokenChopinMoveRule(prevChord, currentChord))
                        return -1;
            return 0;
        }
        return 0;
    };

    this.brokenThirdMoveRule = function(prevChord, currentChord){
        var dominantVoiceWith3 = this.voiceWithBaseComponent(prevChord, "3");
        return dominantVoiceWith3 > -1 &&
            !prevChord.notes[dominantVoiceWith3].equalPitches(currentChord.notes[dominantVoiceWith3]) &&
            !Utils.containsBaseChordComponent(currentChord.harmonicFunction.omit, "1") &&
            !currentChord.notes[dominantVoiceWith3].baseChordComponentEquals("1") &&
            !currentChord.notes[dominantVoiceWith3].baseChordComponentEquals("7") &&
            !currentChord.harmonicFunction.containsDelayedChordComponent("1") &&
            !(prevChord.bassNote.baseChordComponentEquals("3") && currentChord.bassNote.baseChordComponentEquals("3"));
    };

    this.brokenSeventhMoveRule = function(prevChord, currentChord){
        var dominantVoiceWith3 = this.voiceWithBaseComponent(prevChord, "3");
        var dominantVoiceWith7 = this.voiceWithBaseComponent(prevChord, "7");
        if (dominantVoiceWith7 > -1 &&
            !prevChord.notes[dominantVoiceWith7].equalPitches(currentChord.notes[dominantVoiceWith7]) &&
            !currentChord.notes[dominantVoiceWith7].baseChordComponentEquals("3") &&
            !currentChord.harmonicFunction.containsDelayedBaseChordComponent("3")) {
            //rozwiazanie swobodne mozliwe
            if ((currentChord.harmonicFunction.revolution.chordComponentString === "3" ||
                currentChord.harmonicFunction.revolution.chordComponentString === "3>" ||
                (Utils.isDefined(currentChord.harmonicFunction.position) && (currentChord.harmonicFunction.position.chordComponentString === "3" ||
                    currentChord.harmonicFunction.position.chordComponentString === "3>"))) &&
                dominantVoiceWith7 < dominantVoiceWith3) {
                    if (!currentChord.notes[dominantVoiceWith7].baseChordComponentEquals("5")) return true;
            } else return true;
        }
        return false;
    };

    this.brokenNinthMoveRule = function(prevChord, currentChord){
        var dominantVoiceWith9 = this.voiceWithBaseComponent(prevChord, "9");
        return dominantVoiceWith9 > -1 &&
            !prevChord.notes[dominantVoiceWith9].equalPitches(currentChord.notes[dominantVoiceWith9]) &&
            !currentChord.notes[dominantVoiceWith9].baseChordComponentEquals("5") &&
            !currentChord.harmonicFunction.containsDelayedBaseChordComponent("5");
    };

    this.brokenUpFifthMoveRule = function(prevChord, currentChord){
        var dominantVoiceWithAlt5 = this.voiceWithComponent(prevChord, "5<");
        return dominantVoiceWithAlt5 > -1 &&
            !prevChord.notes[dominantVoiceWithAlt5].equalPitches(currentChord.notes[dominantVoiceWithAlt5]) &&
            !currentChord.notes[dominantVoiceWithAlt5].baseChordComponentEquals("3") &&
            !currentChord.harmonicFunction.containsDelayedBaseChordComponent("3");
    };

    this.brokenDownFifthMoveRule = function(prevChord, currentChord){
        var dominantVoiceWithAlt5 = this.voiceWithComponent(prevChord, "5>");
        return dominantVoiceWithAlt5 > -1 &&
            !prevChord.notes[dominantVoiceWithAlt5].equalPitches(currentChord.notes[dominantVoiceWithAlt5]) &&
            !currentChord.notes[dominantVoiceWithAlt5].baseChordComponentEquals("1") &&
            !currentChord.harmonicFunction.containsDelayedBaseChordComponent("1");
    };

    this.brokenChopinMoveRule = function(prevChord, currentChord){
        var dominantVoiceWith6 = this.voiceWithBaseComponent(prevChord, "6");
        return dominantVoiceWith6 > -1 &&
            !currentChord.notes[dominantVoiceWith6].chordComponentEquals("1") &&
            !currentChord.harmonicFunction.containsDelayedChordComponent("1");
    };
}

function DominantSecondRelationCheckConnectionRule() {

    ICheckConnectionRule.call(this);

    this.evaluateIncludingDeflections = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var specificConnectionRule = new SpecificFunctionConnectionRule(Consts.FUNCTION_NAMES.DOMINANT, Consts.FUNCTION_NAMES.TONIC);
        if (specificConnectionRule.isNotBroken(connection)
            && prevChord.harmonicFunction.isInSecondRelation(currentChord.harmonicFunction)) {
            if(this.brokenThirdMoveRule(prevChord, currentChord))
                return -1;
            if(this.brokenFifthMoveRule(prevChord, currentChord))
                return -1;
            if (Utils.containsChordComponent(prevChord.harmonicFunction.extra, "7") && this.brokenSeventhMoveRule(prevChord, currentChord))
                return -1;
            if (Utils.containsChordComponent(prevChord.harmonicFunction.extra, "5>") && this.brokenDownFifthMoveRule(prevChord, currentChord))
                return -1;
        }
        return 0;
    };

    this.brokenThirdMoveRule = function(prevChord, currentChord){
        var dominantVoiceWith3 = this.voiceWithBaseComponent(prevChord, "3");
        return dominantVoiceWith3 > -1 && !currentChord.notes[dominantVoiceWith3].baseChordComponentEquals("3") &&
            !currentChord.harmonicFunction.containsDelayedBaseChordComponent("3");
    };

    this.brokenFifthMoveRule = function(prevChord, currentChord){
        var dominantVoiceWith5 = this.voiceWithBaseComponent(prevChord, "5");
        return (dominantVoiceWith5 > -1 && !currentChord.notes[dominantVoiceWith5].baseChordComponentEquals("3") &&
            !currentChord.harmonicFunction.containsDelayedBaseChordComponent("3"));
    };

    this.brokenSeventhMoveRule = function(prevChord, currentChord){
        var dominantVoiceWith7 = this.voiceWithBaseComponent(prevChord, "7");
        return dominantVoiceWith7 > -1 && !currentChord.notes[dominantVoiceWith7].baseChordComponentEquals("5") &&
            !currentChord.harmonicFunction.containsDelayedBaseChordComponent("5");
    };

    this.brokenDownFifthMoveRule = function(prevChord, currentChord){
        var dominantVoiceWithAlt5 = this.voiceWithComponent(prevChord, "5>");
        return dominantVoiceWithAlt5 > -1 &&
            !prevChord.notes[dominantVoiceWithAlt5].equalPitches(currentChord.notes[dominantVoiceWithAlt5]) &&
            !currentChord.notes[dominantVoiceWithAlt5].baseChordComponentEquals("3") &&
            !currentChord.harmonicFunction.containsDelayedBaseChordComponent("3");
    }
}

function SubdominantDominantCheckConnectionRule() {
    ICheckConnectionRule.call(this);

    this.evaluateIncludingDeflections = function(connection) {
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var specificConnectionRule = new SpecificFunctionConnectionRule(Consts.FUNCTION_NAMES.SUBDOMINANT, Consts.FUNCTION_NAMES.DOMINANT);
        if (specificConnectionRule.isNotBroken(connection)
            && prevChord.harmonicFunction.isInSecondRelation(currentChord.harmonicFunction)) {
            if(this.brokenClosestMoveRule(prevChord, currentChord))
                return -1;
            if(this.brokenVoicesMoveOppositeDirectionRule(prevChord, currentChord))
                return -1;
        }
        return 0;
    };

    this.brokenVoicesMoveOppositeDirectionRule = function(prevChord, currentChord){
        if(currentChord.bassNote.chordComponentEquals("1") && prevChord.bassNote.chordComponentEquals("1")) {
            for(var i = 1; i < 4; i++) {
                if (prevChord.notes[i].pitch - currentChord.notes[i].pitch < 0) {
                    return true;
                }
            }
        }
        return false;
    };

    this.brokenClosestMoveRule = function(prevChord, currentChord){
        //todo maybe for all connections?
        var vb = new Consts.VoicesBoundary();
        for (var i = 1; i < 4; i++) {
            var higherPitch, lowerPitch;
            if (prevChord.notes[i].pitch > currentChord.notes[i].pitch) {
                higherPitch = prevChord.notes[i].pitch;
                lowerPitch = currentChord.notes[i].pitch;
            } else {
                higherPitch = currentChord.notes[i].pitch;
                lowerPitch = prevChord.notes[i].pitch;
            }

            for (var j = 1; j < 4; j++) {
                if (j !== i) {
                    for (var currentPitch = currentChord.notes[j].pitch; currentPitch < vb.sopranoMax; currentPitch += 12) {
                        if (currentPitch < higherPitch && currentPitch > lowerPitch) {
                            return true;
                        }
                    }
                    for (var currentPitch = currentChord.notes[j].pitch; currentPitch < vb.tenorMin; currentPitch -= 12) {
                        if (currentPitch < higherPitch && currentPitch > lowerPitch) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };
}

function DominantSubdominantCheckConnectionRule() {
    ICheckConnectionRule.call(this);

    this.evaluateIncludingDeflections = function(connection){
        var specificConnectionRule = new SpecificFunctionConnectionRule(Consts.FUNCTION_NAMES.DOMINANT, Consts.FUNCTION_NAMES.SUBDOMINANT);
        if (specificConnectionRule.isNotBroken(connection) &&
            connection.current.harmonicFunction.hasMajorMode())
            throw new Errors.RulesCheckerError("Forbidden connection: D->S");
        return 0;
    }
}

function SameFunctionCheckConnectionRule() {
    ICheckConnectionRule.call(this);

    this.evaluateIncludingDeflections = function(connection){
        var sf = new SameFunctionRule();
        if(sf.isNotBroken(connection)){
                if(this.brokenChangePitchesRule(connection.current, connection.prev))
                    return -1;
        }
        return 0;
    };

    this.brokenChangePitchesRule = function(currentChord, prevChord) {
        return prevChord.sopranoNote.equals(currentChord.sopranoNote) &&
            prevChord.altoNote.equals(currentChord.altoNote) &&
            prevChord.tenorNote.equals(currentChord.tenorNote) &&
            prevChord.bassNote.equalsInOneOctave(currentChord.bassNote);
    };

}

function SubdominantDominantCheckConnectionRule() {
    ICheckConnectionRule.call(this);

    this.evaluateIncludingDeflections = function(connection){
        var currentChord = connection.current;
        var prevChord = connection.prev;
        var specificConnectionRule = new SpecificFunctionConnectionRule(Consts.FUNCTION_NAMES.SUBDOMINANT, Consts.FUNCTION_NAMES.DOMINANT);
        if (specificConnectionRule.isNotBroken(connection)
            && prevChord.harmonicFunction.degree + 1 === currentChord.harmonicFunction.degree){
            if(this.brokenVoicesMoveOppositeDirectionRule(currentChord, prevChord))
                return -1;
            if(this.brokenClosestMoveRule(currentChord, prevChord))
                return -1;
        }
        return 0;
    };

    this.brokenClosestMoveRule = function(currentChord, prevChord){
        //todo maybe for all connections?
        var vb = new Consts.VoicesBoundary();
        for(var i=1; i<4; i++){
            var higherPitch, lowerPitch;
            if(prevChord.notes[i].pitch > currentChord.notes[i].pitch){
                higherPitch = prevChord.notes[i].pitch;
                lowerPitch = currentChord.notes[i].pitch;
            } else {
                higherPitch = currentChord.notes[i].pitch;
                lowerPitch = prevChord.notes[i].pitch;
            }

            for(var j=1; j<4; j++){
                if(j !== i){
                    for(var currentPitch=currentChord.notes[j].pitch; currentPitch<vb.sopranoMax; currentPitch += 12){
                        if(currentPitch < higherPitch && currentPitch > lowerPitch){
                            return true;
                        }
                    }
                    for(var currentPitch=currentChord.notes[j].pitch; currentPitch<vb.tenorMin; currentPitch -= 12){
                        if(currentPitch < higherPitch && currentPitch > lowerPitch){
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };

    this.brokenVoicesMoveOppositeDirectionRule = function(currentChord, prevChord){
        if(currentChord.bassNote.chordComponentEquals("1") && prevChord.bassNote.chordComponentEquals("1")) {
            for(var i = 1; i < 4; i++) {
                if (prevChord.notes[i].pitch - currentChord.notes[i].pitch < 0) {
                    return true;
                }
            }
        }
        return false;
    }
}

/*
        END OF RULES
 */