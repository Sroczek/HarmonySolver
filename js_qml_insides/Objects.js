function Exercise(key, meter, mode, system, measures, first_chord)
{
    this.mode = mode
    this.key = key
    this.meter = meter
    this.system = system
    this.measures = measures
    this.first_chord = first_chord
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
    this.degree = degree
    this.position = position
    this.revolution = revolution
    this.delay = delay //delayed components list
    this.extra = extra //extra components list
    this.omit = omit //omitted components list
    this.down = down //true or false

}

function Chord(sopranoNote, altoNote, tenorNote, bassNote, harmonicFunction) {
    this.sopranoNote = sopranoNote
    this.altoNote = altoNote
    this.tenorNote = tenorNote
    this.bassNote = bassNote
    this.harmonicFunction = harmonicFunction

}

function Note(pitch, baseNote) {
    this.pitch = pitch
    this.baseNote = baseNote

}

function Scale(baseNote) {
    this.baseNote = baseNote
}

function MajorScale(baseNote) {
    Scale.call(baseNote)
    this.pitches = [0, 2, 4, 5, 7, 9, 11]
}

var dur = new MajorScale(BASE_NOTES.C)
var n1 = new Note(48, BASE_NOTES.C)
var n2 = new Note(60, BASE_NOTES.C)
var n3 = new Note(64, BASE_NOTES.E)
var n4 = new Note(67, BASE_NOTES.G)

//var chord = new Chord(n4, n3, n2, n1, new HarmonicFunction(FUNCTION_NAMES.TONIC, 0, 0, 0, [], [], [], false))
//console.log(chord)
