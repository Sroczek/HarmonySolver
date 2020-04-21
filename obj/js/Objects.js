function Exercise(key, meter, mode, system, measures, first_chord)
{
    this.mode = mode
    this.key = key
    this.meter = meter
    this.system = system
    this.measures = measures
    this.first_chord = first_chord
}

function ExerciseSolution(exercise, rating, chords){
    this.exercise = exercise;
    this.rating = rating;
    this.chords = chords;

    //najprawdopodobniej nie tu
    this.drawAtScore = function (cursor){

        curScore.appendMeasures(this.exercise.measures.length - 1);
        
        cursor.rewind(0)
        for(var i=0; i<this.chords.length; i++){
            this.chords[i].drawAtScore(cursor);
        }
    }
}

var VOICES = {
    SOPRANO: 0,
    ALTO: 1,
    TENOR: 2,
    BASS: 3
}

var FUNCTION_NAMES = {
    TONIC: "T",
    SUBDOMINANT: "S",
    DOMINANT: "D"
}

var BASE_NOTES = {
    C: 0,
    D: 1,
    E: 2,
    F: 3,
    G: 4,
    A: 5,
    B: 6
}

var possible_keys_major = ['C', 'C#', 'Db',
    'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A',
    'Bb', 'B', 'Cb']

var possible_keys_minor = ['c', 'c#', 'db',
    'd', 'eb', 'e', 'f', 'f#', 'gb', 'g', 'ab', 'a',
    'bb', 'b', 'cb']

var possible_systems = ['close', 'open', '-']

function contains(list, obj){

    for (var i = 0; i< list.length; i++){
        if (list[i] === obj){
            return true
        }
    }
    return false
}

function HarmonicFunction(functionName, degree, position, revolution, delay, extra, omit, down) {
    this.functionName = functionName
    this.degree = degree !== undefined?degree:""
    this.position = position
    this.revolution = revolution
    this.delay = delay //delayed components list
    this.extra = extra !== undefined?extra:"" //extra components list
    this.omit = omit //omitted components list
    this.down = down //true or false

    this.getSymbol = function(){
        return this.down?this.functionName+"down"+this.extra:this.functionName+this.extra
    }
    this.equals = function(other){
        return this.functionName === other.functionName && this.degree === other.degree && this.down === other.down
    }
}

function Chord(sopranoNote, altoNote, tenorNote, bassNote, harmonicFunction) {
    this.sopranoNote = sopranoNote
    this.altoNote = altoNote
    this.tenorNote = tenorNote
    this.bassNote = bassNote
    this.harmonicFunction = harmonicFunction
    this.notes = [bassNote, tenorNote, altoNote, sopranoNote]
    this.duration = undefined

    this.toString = function(){
        var chordStr = "CHORD: \n";
        chordStr += this.sopranoNote.toString() + "\n";
        chordStr += this.altoNote.toString() + "\n";
        chordStr += this.tenorNote.toString() + "\n";
        chordStr += this.bassNote.toString() + "\n";
        return chordStr;
    }
}

function Note(pitch, baseNote, chordComponent) {
    this.pitch = pitch
    this.baseNote = baseNote
    this.chordComponent = chordComponent

    this.toString = function(){
        return this.pitch + " " + this.baseNote + " " + this.chordComponent;
    }

}

function Scale(baseNote) {
    this.baseNote = baseNote
}

function MajorScale(baseNote, tonicPitch) {
    Scale.call(this.baseNote)
    this.tonicPitch = tonicPitch
    this.pitches = [0, 2, 4, 5, 7, 9, 11]
}

function MajorScale(key){
    Scale.call(this, keyStrBase[key])
    this.tonicPitch = keyStrPitch[key]
    this.pitches = [0, 2, 4, 5, 7, 9, 11]
}


/////////////////////////////////////////////
//             CONSTS.js

var keyStrPitch = {
    'C'  : 60,
    'C#' : 61,
    'Db' : 61,
    'D'  : 62, 
    'Eb' : 63,
    'E'  : 64,
    'F'  : 65, 
    'F#' : 66, 
    'Gb' : 66, 
    'G'  : 67, 
    'Ab' : 68, 
    'A'  : 69,
    'Bb' : 70,
    'B'  : 71, 
    'Cb' : 71
}

var keyStrBase = { 
    'C'  : BASE_NOTES.C,
    'C#' : BASE_NOTES.C,
    'Db' : BASE_NOTES.D,
    'D'  : BASE_NOTES.D, 
    'Eb' : BASE_NOTES.E,
    'E'  : BASE_NOTES.E,
    'F'  : BASE_NOTES.F, 
    'F#' : BASE_NOTES.F, 
    'Gb' : BASE_NOTES.G, 
    'G'  : BASE_NOTES.G, 
    'Ab' : BASE_NOTES.A, 
    'A'  : BASE_NOTES.A,
    'Bb' : BASE_NOTES.B,
    'B'  : BASE_NOTES.B, 
    'Cb' : BASE_NOTES.C
}

function VoicesBoundary(){
    this.sopranoMax = 81;
    this.sopranoMin = 60;
    this.altoMax = 74;
    this.altoMin = 53;
    this.tenorMax = 69;
    this.tenorMin = 48;
    this.bassMax = 62;
    this.bassMin = 41;
}

////////////////////////////////////////////
//           ChordGenerator.js

var basicDurChord = [0,4,7];
var basicDur6Chord = [0, 4, 7, 9];
var basicDur7Chord = [0, 4, 7, 10];


function ChordGenerator(key){
    this.key = key;

    function getPossiblePitchValuesFromInterval(note, minPitch, maxPitch){

        while(note - minPitch >= 12 ){
                note = note - 12;
        }
    
        while(note - minPitch < 0){
                note = note + 12;
        }
    
        var possiblePitch = [];
        while(maxPitch - note >= 0){
                possiblePitch.push(note);
                note = note + 12;
        }
    
        return possiblePitch;
    }

    this.generate = function(harmonicFunction){

        var scale = new MajorScale(this.key);

        var basicNote = scale.tonicPitch;

        switch(harmonicFunction.functionName){
            case 'T':
                basicNote += scale.pitches[0];
                break;
            case 'S':
                basicNote += scale.pitches[4];
                break;
            case 'D':
                basicNote += scale.pitches[5];
                break;
        };

        var chordScheme = basicDurChord;
        var schemas = [ [1, 1, 3, 5], [1, 1, 5, 3], [1, 3, 1, 5], [1, 3, 5, 1], [1, 5, 1, 3], [1, 5, 3, 1], [1,3,5,5], [1,5,3,5], [1,5,5,3] ];
        
        console.log("EXTRA" + harmonicFunction.extra);
        switch(harmonicFunction.extra[0]){
            case 6:
                console.log("ADDED 6");
                chordScheme = basicDur6Chord;
                schemas = [ [1, 3, 5, 6], [1, 3, 6, 5], [1, 5, 3, 6], [1, 5, 6, 3],  [1, 6, 3, 5], [1, 6, 5, 3]];
                break;
            case 7:
                console.log("ADDED 7");
                chordScheme = basicDur7Chord;
                schemas = [ [1, 3, 5, 7], [1, 3, 7, 5], [1, 5, 3, 7], [1, 5, 7, 3],  [1, 7, 3, 5], [1, 7, 5, 3]];
                break;
        }

        var pryma = basicNote + chordScheme[0];
        var tercja = basicNote + chordScheme[1];
        var kwinta = basicNote + chordScheme[2];
        var added = basicNote + chordScheme[3];

        var chords = [];

        for(var i=0; i< schemas.length; i++){
            var schema_mapped = schemas[i].map(
                function(x){
                    if(x == 1)
                            return pryma;
                    if(x == 3)
                            return tercja;
                    if(x == 5)
                            return kwinta;
                    if(x == 6)
                            return added;
                    if(x == 7)
                            return added;
                }
            );
            
            var vb = new VoicesBoundary()
            var bass = getPossiblePitchValuesFromInterval(schema_mapped[0], vb.bassMin, vb.bassMax);
            var tenor = getPossiblePitchValuesFromInterval(schema_mapped[1], vb.tenorMin, vb.tenorMax);
            var alto = getPossiblePitchValuesFromInterval(schema_mapped[2], vb.altoMin, vb.altoMax);
            var soprano = getPossiblePitchValuesFromInterval(schema_mapped[3], vb.sopranoMin, vb.sopranoMax);
        
            for(var n =0; n< bass.length; n++){
                //console.log(n);
                for(var j=0; j< tenor.length; j++){
                        //console.log(j);
                        if(tenor[j] >= bass[n]){
                            for(var k =0; k< alto.length; k++){
                                    //console.log(k);
                                    if(alto[k] >= tenor[j] && alto[k] - tenor[j] < 12){
                                        for(var m=0; m<soprano.length; m++){
                                                //console.log(m);
                                                if(soprano[m] >= alto[k] && soprano[m] - alto[k] < 12){

                                                    var d1 = {"T": 0, "S": 3, "D" : 4 }; 
                                                    // console.log("----------------------------")
                                                    var bassNote = new Note(bass[n], (scale.baseNote + d1[harmonicFunction.functionName] + schemas[i][0]-1) % 7, schemas[i][0]);
                                                    var tenorNote = new Note(tenor[j], (scale.baseNote + d1[harmonicFunction.functionName] + schemas[i][1]-1) % 7, schemas[i][1] );
                                                    var altoNote = new Note(alto[k], (scale.baseNote + d1[harmonicFunction.functionName] + schemas[i][2]-1) % 7, schemas[i][2] );
                                                    var sopranoNote = new Note(soprano[m], (scale.baseNote + d1[harmonicFunction.functionName] + schemas[i][3]-1) % 7,schemas[i][3] );
                                                    // console.log(bassNote.toString());
                                                    // console.log(tenorNote.toString());
                                                    // console.log(altoNote.toString());
                                                    // console.log(sopranoNote.toString());
                                                    chords.push(new Chord(sopranoNote, altoNote, tenorNote, bassNote, harmonicFunction));
                                                }
                                        }
                                    }
                            }
                        }
                }
            }
        }
    
        return chords;

    }
}
