import QtQuick 2.2
import MuseScore 3.0
import FileIO 3.0
import QtQuick.Dialogs 1.2
import QtQuick.Controls 1.4

//import "./qml_components"
import "./objects/harmonic/Solver2.js" as Solver
import "./objects/harmonic/Parser.js" as Parser
import "./objects/bass/FiguredBass.js" as FiguredBass
import "./objects/model/Note.js" as Note
import "./objects/commons/Consts.js" as Consts
import "./objects/bass/BassTranslator.js" as Translator
import "./objects/soprano/SopranoExercise.js" as SopranoExercise
import "./objects/model/HarmonicFunction.js" as HarmonicFunction
import "./objects/soprano/SopranoSolver.js" as Soprano
import "./objects/conf/PluginConfiguration.js" as PluginConfiguration
import "./objects/conf/PluginConfigurationUtils.js" as PluginConfigurationUtils
import "./objects/commons/Errors.js" as Errors
import "./objects/utils/Utils.js" as Utils

MuseScore {
    menuPath: "Plugins.HarmonySolver"
    description: "This plugin solves harmonics exercises"
    version: "1.0"
    requiresScore: false
    pluginType: "dock"
    dockArea: "right"

    property var exercise: ({})
    property var exerciseLoaded: false
    property var configuration: ({})

    id: window
    width: 550
    height: 550
    onRun: {
      configuration = PluginConfigurationUtils.readConfiguration(outConfFile, filePath)
    }

    function savePluginConfiguration(){
        PluginConfigurationUtils.saveConfiguration(outConfFile, filePath, configuration)
    }

    FileIO{
      id: outConfFile
      onError: Utils.warn(msg + "  Filename = " + outConfFile.source)
    }

    function getBaseNote(museScoreBaseNote) {
        var result
        switch (museScoreBaseNote) {
        case 0:
            result = Consts.BASE_NOTES.F
            break
        case 1:
            result = Consts.BASE_NOTES.C
            break
        case 2:
            result = Consts.BASE_NOTES.G
            break
        case 3:
            result = Consts.BASE_NOTES.D
            break
        case 4:
            result = Consts.BASE_NOTES.A
            break
        case 5:
            result = Consts.BASE_NOTES.E
            break
        case 6:
            result = Consts.BASE_NOTES.B
            break
        }
        return result
    }

    function isAlterationSymbol(character) {
        return (character === '#' || character === 'b' || character ==='h')
    }


    function read_figured_bass() {
        var cursor = curScore.newCursor()
        cursor.rewind(0)
        var elements = []
        var bassNote, key, mode
        var durations = []
        var has3component = false
        var lastBaseNote, lastPitch
        var meter = [cursor.measure.timesigActual.numerator, cursor.measure.timesigActual.denominator]
        var delays = []
        do {
            var symbols = []
            durations.push(
                        [cursor.element.duration.numerator, cursor.element.duration.denominator])
            if (typeof cursor.element.parent.annotations[0] !== "undefined") {
                var readSymbols = cursor.element.parent.annotations[0].text
                Utils.log("readSymbols:", readSymbols)
                for (var i = 0; i < readSymbols.length; i++) {
                    var component = "", alteration = undefined
                    while (i < readSymbols.length && readSymbols[i] !== "\n") {
                        if (readSymbols[i] !== " " && readSymbols[i] !== "\t") {
                            component += readSymbols[i]
                        }
                        i++
                    }
                    Utils.log("component: " + component)

                    if ((component.length === 1 && isAlterationSymbol(component[0])) ||
                        (component.length === 2 && isAlterationSymbol(component[0]) && component[0] === component[1])) {
                        if (has3component) {
                            throw new Errors.FiguredBassInputError("Cannot twice define 3", symbols)
                        } else {
                            symbols.push(new FiguredBass.BassSymbol(3, component[0]))
                            has3component = true
                        }
                    } else {
                        //delays
                        if (component.includes('-')) {
                            var splittedSymbols = component.split('-')
                            var firstSymbol = splittedSymbols[0]
                            var secondSymbol = splittedSymbols[1]
//todo do osobnej funkcji

                            if (isAlterationSymbol(secondSymbol[0])) {
                                if (secondSymbol[0] === secondSymbol[1]){
                                    if (parseInt(secondSymbol[2]) !== 8) {
                                        symbols.push(new FiguredBass.BassSymbol(parseInt(secondSymbol[2]), secondSymbol[0]))
                                    }
                                } else {
                                    if (parseInt(secondSymbol[1]) !== 8) {
                                        symbols.push(new FiguredBass.BassSymbol(parseInt(secondSymbol[1]), secondSymbol[0]))
                                    }
                                }
                            } else if (isAlterationSymbol(secondSymbol[secondSymbol.length - 1])) {
                                if (parseInt(secondSymbol[0]) !== 8) {
                                    symbols.push(new FiguredBass.BassSymbol(parseInt(secondSymbol[0]),
                                                                            secondSymbol[secondSymbol.length - 1]))
                                }
                            } else {
                                if (parseInt(secondSymbol) !== 8) {
                                    symbols.push(new FiguredBass.BassSymbol(parseInt(secondSymbol), undefined))
                                }
                            }
                            delays.push([firstSymbol, secondSymbol])

                        } else {
                            if (isAlterationSymbol(component[0])) {
                                if (component[0] === component[1]){
                                    if (parseInt(component[2]) !== 8) {
                                        symbols.push(new FiguredBass.BassSymbol(parseInt(component[2]), component[0]))
                                    }
                                } else {
                                    if (parseInt(component[1]) !== 8) {
                                        symbols.push(new FiguredBass.BassSymbol(parseInt(component[1]), component[0]))
                                    }
                                }
                            } else if (isAlterationSymbol(component[component.length - 1])) {
                                if (parseInt(component[0]) !== 8) {
                                    symbols.push(new FiguredBass.BassSymbol(parseInt(component[0]),
                                                                            component[component.length - 1]))
                                }
                            } else {
                                if (parseInt(component) !== 8) {
                                    symbols.push(new FiguredBass.BassSymbol(parseInt(component), undefined))
                                }
                            }
                        }
                    }

                        Utils.log("symbols:", symbols)
                }
            }
            lastBaseNote = getBaseNote(Utils.mod((cursor.element.notes[0].tpc + 1), 7))
            lastPitch = cursor.element.notes[0].pitch
            bassNote = new Note.Note(lastPitch, lastBaseNote, 0)
            elements.push(new FiguredBass.FiguredBassElement(bassNote, symbols, delays))
            has3component = false

            if (delays.length !== 0) {
                Utils.log("durations", durations)
                durations[durations.length - 1][1]*=2
                durations.push(durations[durations.length - 1])
                Utils.log("durations", durations)
            }

            delays = []
        } while (cursor.next())
        lastPitch = Utils.mod(lastPitch, 12)
        var majorKey = Consts.majorKeyBySignature(curScore.keysig)
        var minorKey = Consts.minorKeyBySignature(curScore.keysig)
        if (Utils.mod(Consts.keyStrPitch[majorKey], 12) === lastPitch
                && Consts.keyStrBase[majorKey] === lastBaseNote) {
            key = majorKey
            mode = "major"
        } else {
            if (Utils.mod(Consts.keyStrPitch[minorKey], 12) === lastPitch
                    && Consts.keyStrBase[minorKey] === lastBaseNote) {
                key = minorKey
                mode = "minor"
            } else {
                throw new Errors.FiguredBassInputError("Wrong last note. Bass line should end on Tonic.")
            }
        }
        return new FiguredBass.FiguredBassExercise(mode, key, meter, elements,
                                                   durations)
    }

    function get_solution_date() {
        var date = new Date()
        var ret = "_"
        ret += date.getFullYear(
                    ) + "_" + (date.getMonth() + 1) + "_" + date.getDate() + "_"
        ret += date.getHours() + "_" + date.getMinutes(
                    ) + "_" + date.getSeconds()
        Utils.log("Solution date - " + ret)
        return ret
    }

    function prepare_score_for_solution(filePath, solution, solution_date, setDurations, taskType) {
        var resources_path = "";

        if(configuration.enableChordSymbolsPrinting){
            resources_path = "/resources/template scores/";
        }
        else{
            resources_path = "/resources/lightweight_template_scores/";
        }

        readScore(filePath + resources_path + solution.exercise.key + "_"
                  + solution.exercise.mode + ".mscz")
        writeScore(curScore,
                   filePath + "/solutions/harmonic functions exercise/solution" + taskType + solution_date,
                   "mscz")
        closeScore(curScore)
        readScore(filePath + "/solutions/harmonic functions exercise/solution" + taskType
                  + solution_date + ".mscz")
        if (setDurations) {
            solution.setDurations()
        }
    }

    function fill_score_with_solution(solution, durations) {
        var cursor = curScore.newCursor()
        cursor.rewind(0)
        var ts = newElement(Element.TIMESIG)
        ts.timesig = fraction(solution.exercise.meter[0],
                              solution.exercise.meter[1])
        cursor.add(ts)

        if(durations !== undefined){
            var countMeasures = function(durations){
                var sum = 0;
                for(var i=0; i<durations.length;i++){
                    Utils.log(durations[i][0]/durations[i][1])
                    sum += durations[i][0]/durations[i][1];
                }
                return Math.round(sum/(solution.exercise.meter[0]/solution.exercise.meter[1]));
            }

            var sum = countMeasures(durations);
            curScore.appendMeasures(sum - curScore.nmeasures)
        }
        else{
            curScore.appendMeasures(solution.exercise.measures.length - curScore.nmeasures)
        }

        cursor.rewind(0)
        var lastSegment = false
        for (var i = 0; i < solution.chords.length; i++) {
            var curChord = solution.chords[i]
            var prevChord = i === 0 ? undefined : solution.chords[i-1];
            var nextChord = i === solution.chords.length - 1 ? undefined : solution.chords[i+1];
            Utils.log("curChord:",curChord)
            if (durations !== undefined) {
                var dur = durations[i]
            }
            if (i === solution.chords.length - 1)
                lastSegment = true

            function selectSoprano(cursor) {
                cursor.track = 0
            }
            function selectAlto(cursor) {
                cursor.track = 1
            }
            function selectTenor(cursor) {
                cursor.track = 4
            }
            function selectBass(cursor) {
                cursor.track = 5
            }
            if (durations !== undefined) {
                cursor.setDuration(dur[0], dur[1])
            } else {
                cursor.setDuration(curChord.duration[0], curChord.duration[1])
            }
            selectSoprano(cursor)
            cursor.addNote(curChord.sopranoNote.pitch, false)
            if (!lastSegment)
                cursor.prev()

            if (durations !== undefined) {
                cursor.setDuration(dur[0], dur[1])
            } else {
                cursor.setDuration(curChord.duration[0], curChord.duration[1])
            }
            addComponentToScore(cursor, curChord.sopranoNote.chordComponent.toXmlString())
            selectAlto(cursor)
            cursor.addNote(curChord.altoNote.pitch, false)
            if (!lastSegment)
                cursor.prev()

            if (durations !== undefined) {
                cursor.setDuration(dur[0], dur[1])
            } else {
                cursor.setDuration(curChord.duration[0], curChord.duration[1])
            }
            addComponentToScore(cursor, curChord.altoNote.chordComponent.toXmlString())
            selectTenor(cursor)
            cursor.addNote(curChord.tenorNote.pitch, false)
            if (!lastSegment)
                cursor.prev()

            if (durations !== undefined) {
                cursor.setDuration(dur[0], dur[1])
            } else {
                cursor.setDuration(curChord.duration[0], curChord.duration[1])
            }
            addComponentToScore(cursor, curChord.tenorNote.chordComponent.toXmlString())
            selectBass(cursor)

            if(configuration.enableChordSymbolsPrinting){
                var text = newElement(Element.HARMONY)
                text.text = curChord.harmonicFunction.getSimpleChordName();


                if(prevChord !== undefined && nextChord !== undefined){
                    if(curChord.harmonicFunction.key !== undefined){
                        if(prevChord.harmonicFunction.key !== curChord.harmonicFunction.key){
                            text.text = text.text[0] + "lb" + text.text.slice(1);
                        }
                        if(nextChord.harmonicFunction.key !== curChord.harmonicFunction.key){
                            text.text = text.text + "rb";
                        }
                    }
                }

                if(prevChord !== undefined)
                    if(prevChord.harmonicFunction.isDelayRoot()) text.text = "";
                text.offsetY = 7;
                text.placement = Placement.BELOW;
            }
            cursor.add(text);
            cursor.addNote(curChord.bassNote.pitch, false)
        }

        //sth was not working when I added this in upper "for loop"
        cursor.rewind(0)
        for (var i = 0; i < solution.chords.length; i++) {
            addComponentToScore(cursor,
                                solution.chords[i].bassNote.chordComponent.toXmlString())
            selectSoprano(cursor)
//            console.log(cursor.element)
            cursor.element.notes[0].tpc = Utils.convertToTpc(solution.chords[i].sopranoNote)
            selectAlto(cursor)
            cursor.element.notes[0].tpc = Utils.convertToTpc(solution.chords[i].altoNote)
            selectTenor(cursor)
            cursor.element.notes[0].tpc = Utils.convertToTpc(solution.chords[i].tenorNote)
            selectBass(cursor)
            cursor.element.notes[0].tpc = Utils.convertToTpc(solution.chords[i].bassNote)
            cursor.next()
        }
    }

    function sopranoHarmonization(functionsList, punishmentRatios) {

        var mode = tab3.item.getSelectedMode()
        //should be read from input
        var cursor = curScore.newCursor()
        cursor.rewind(0)
        var sopranoNote, key
        var durations = []
        var lastBaseNote, lastPitch
        var notes = []
        var measure_notes = []
        var meter = [cursor.measure.timesigActual.numerator, cursor.measure.timesigActual.denominator]
        var measureDurationTick = (division * (4 / meter[1])) * meter[0]
        var measures = []
        do {
            if(cursor.tick % measureDurationTick === 0 && cursor.tick !== 0){
                measures.push(new Note.Measure(measure_notes))
                measure_notes = []
            }

            durations.push(
                        [cursor.element.duration.numerator, cursor.element.duration.denominator])
            lastBaseNote = getBaseNote(Utils.mod(cursor.element.notes[0].tpc + 1, 7))
            lastPitch = cursor.element.notes[0].pitch
            sopranoNote = new Note.Note(lastPitch, lastBaseNote, 0, [cursor.element.duration.numerator, cursor.element.duration.denominator])
            //console.log("new Note.Note(" + lastPitch + ", " + lastBaseNote +", 0,
            //[" + cursor.element.duration.numerator + ", " + cursor.element.duration.denominator + "])"   )
            notes.push(sopranoNote)
            measure_notes.push(sopranoNote)
        } while (cursor.next())
        measures.push(new Note.Measure(measure_notes))
        var key
        if (mode === "major")
            key = Consts.majorKeyBySignature(curScore.keysig)
        else
            key = Consts.minorKeyBySignature(curScore.keysig)
        var sopranoExercise = new SopranoExercise.SopranoExercise(mode, key,
                                                                  meter, notes,
                                                                  durations, measures,
                                                                  functionsList)

        var solver = new Soprano.SopranoSolver(sopranoExercise, punishmentRatios)
        //todo make solution aggregate SopranoHarmonizationExercise maybe - to fill score using measures
        var solution = solver.solve()
//        console.log("SOLUTION:")
//        console.log(solution.chords);

        if(solution.success) {
            var solution_date = get_solution_date()

            prepare_score_for_solution(filePath, solution, solution_date, false, "_soprano")

            fill_score_with_solution(solution, sopranoExercise.durations)

            writeScore(curScore,
                       filePath + "/solutions/harmonic functions exercise/solution" + solution_date,
                       "mscz")

            Utils.log("sopranoExercise:",sopranoExercise)
        }
        else{
            console.log("cannot find solution");
        }

    }

    function addComponentToScore(cursor, componentValue) {
        if(!configuration.enableChordComponentsPrinting)
            return
        var component = newElement(Element.FINGERING)
        component.text = componentValue
        curScore.startCmd()
        cursor.add(component)
        curScore.endCmd()
    }

    function figuredBassSolve() {

        try {
            var ex = read_figured_bass()
            var translator = new Translator.BassTranslator()
            Utils.log("ex",JSON.stringify(ex))

            var exerciseAndBassline = translator.createExerciseFromFiguredBass(ex)
            Utils.log("Translated exercise",JSON.stringify(exerciseAndBassline[0]))
            var solver = new Solver.Solver(exerciseAndBassline[0], exerciseAndBassline[1], undefined,
                !configuration.enableCorrector, !configuration.enablePrechecker)

            var solution = solver.solve()
            var solution_date = get_solution_date()
            Utils.log("Solution:", JSON.stringify(solution))

            prepare_score_for_solution(filePath, solution, solution_date, false, "_bass")

            fill_score_with_solution(solution, ex.durations)

            writeScore(curScore,
                       filePath + "/solutions/harmonic functions exercise/solution" + solution_date,
                       "mscz")
        } catch (error) {
            showError(error)
        }
    }

    function isFiguredBassScore() {
        var cursor = curScore.newCursor()
        cursor.rewind(0)
        var vb = new Consts.VoicesBoundary()
        var elementCounter = 0
        var tracks = [1,4,5]
        for(var i = 0; i < tracks.length; i++){
            cursor.track = tracks[i]
            if(cursor.element !== null){
                  throw new Errors.FiguredBassInputError(
                        "Score should contain only one voice: bass!"
                        )
            }
        }
        cursor.track = 0
        do{
            elementCounter++
            if(!Utils.isDefined(cursor.element.noteType)){
                  throw new Errors.FiguredBassInputError(
                        "Forbidden element at "+elementCounter+" position from beginning",
                        "Score should contain only notes (no rests etc.)"
                        )
            }
            var currentPitch = cursor.element.notes[0].pitch
            if(currentPitch > vb.bassMax || currentPitch < vb.bassMin){
                  throw new Errors.FiguredBassInputError(
                        "Bass note not in voice scale at "+elementCounter+" position from beginning"
                        )
            }
            if(cursor.element.notes.length > 1){
                  throw new Errors.FiguredBassInputError(
                        "Forbidden element at "+elementCounter+" position from beginning",
                        "Score should contain only one voice"
                        )
            }
            if (typeof cursor.element.parent.annotations[0] !== "undefined") {
                var readSymbols = cursor.element.parent.annotations[0].text
                if (!Parser.check_figured_bass_symbols(readSymbols))
                    throw new Errors.FiguredBassInputError("Wrong symbols "+readSymbols,"At "+elementCounter+" position from beginning") 
            }
        } while(cursor.next())
    }

    function isSopranoScore() {
                var cursor = curScore.newCursor()
                cursor.rewind(0)
                var vb = new Consts.VoicesBoundary()
                var elementCounter = 0
                var tracks = [1,4,5]
                for(var i = 0; i < tracks.length; i++){
                cursor.track = tracks[i]
                    if(cursor.element !== null){
                        throw new Errors.SopranoInputError(
                              "Score should contain only one voice: soprano!"
                        )
                    }
                }
                cursor.track = 0
                do{
                    elementCounter++
                    if(!Utils.isDefined(cursor.element.noteType)){
                          throw new Errors.SopranoInputError(
                                "Forbidden element at "+elementCounter+" position from beginning",
                                "Score should contain only notes (no rests etc.)"
                                )
                    }
                    if(cursor.element.notes.length > 1){
                          throw new Errors.SopranoInputError(
                                "Forbidden element at "+elementCounter+" position from beginning",
                                "Score should contain only one voice"
                                )
                    }
                    var currentPitch = cursor.element.notes[0].pitch
                    if(currentPitch > vb.sopranoMax || currentPitch < vb.sopranoMin){
                          throw new Errors.SopranoInputError(
                                "Soprano note not in voice scale at "+elementCounter+" position from beginning"
                                )
                    }
                } while(cursor.next())
    }

    function getPossibleChordsList() {
        var mode = tab3.item.getSelectedMode()
        var x = undefined    
        var T = new HarmonicFunction.HarmonicFunction("T",x,x,x,x,x,x,x,x,mode)
        var S = new HarmonicFunction.HarmonicFunction("S",x,x,x,x,x,x,x,x,mode)

        var D = new HarmonicFunction.HarmonicFunction("D")
   
        var D7 = new HarmonicFunction.HarmonicFunction("D",x,x,x,x,["7"])
        var S6 = new HarmonicFunction.HarmonicFunction("S",x,x,x,x,["6"],x,x,x,mode)

        var neapolitan = new HarmonicFunction.HarmonicFunction("S",2,undefined,"3",[],[],[],true,undefined,Consts.MODE.MINOR)
            
        //side chords
        var Sii = new HarmonicFunction.HarmonicFunction("S",2,x,x,x,x,x,x,x,mode)
        var Diii = new HarmonicFunction.HarmonicFunction("D",3,x,x,x,x,x,x,x,mode)
        var Tiii = new HarmonicFunction.HarmonicFunction("T",3,x,x,x,x,x,x,x,mode)
        var Tvi = new HarmonicFunction.HarmonicFunction("T",6,x,x,x,x,x,x,x,mode)
        var Svi = new HarmonicFunction.HarmonicFunction("S",6,x,x,x,x,x,x,x,mode)
        var Dvii = new HarmonicFunction.HarmonicFunction("D",7,x,x,x,x,x,x,x,mode)    

        //secondary dominants
        var key
        if (mode === Consts.MODE.MAJOR)
            key = Consts.majorKeyBySignature(curScore.keysig)
        else
            key = Consts.minorKeyBySignature(curScore.keysig)
        var Dtoii = D7.copy()
        Dtoii.key = Parser.calculateKey(key, Sii)
        var Dtoiii = D7.copy()
        Dtoiii.key = Parser.calculateKey(key, Diii)
        var Dtoiv = D7.copy()
        Dtoiv.key = Parser.calculateKey(key, S)
        var Dtov = D7.copy()
        Dtov.key = Parser.calculateKey(key, D)
        var Dtovi = D7.copy()
        Dtovi.key = Parser.calculateKey(key, Tvi)
        var Dtovii = D7.copy()
        Dtovii.key = Parser.calculateKey(key, Dvii)

        var chordsList = []
        chordsList.push(T)
        chordsList.push(S)
        chordsList.push(D)

        if (tab3.item.getCheckboxState("D7")) {
            chordsList.push(D7)
        }
        if (tab3.item.getCheckboxState("S6")) {
            chordsList.push(S6)
        }

        if (tab3.item.getCheckboxState("degree2")) {
            chordsList.push(Sii)
            if (tab3.item.getCheckboxState("secondaryD")){
                  chordsList.push(Dtoii)
            }
        }
        if (tab3.item.getCheckboxState("degree3")) {
            chordsList.push(Diii)
            chordsList.push(Tiii)
            if (tab3.item.getCheckboxState("secondaryD")){
                  chordsList.push(Dtoiii)
            }
        }
        if (tab3.item.getCheckboxState("degree6")) {
            chordsList.push(Tvi)
            chordsList.push(Svi)
            if (tab3.item.getCheckboxState("secondaryD")){
                  chordsList.push(Dtovi)
            }
        }
        if (tab3.item.getCheckboxState("degree7")) {
            chordsList.push(Dvii)
            if (tab3.item.getCheckboxState("secondaryD")){
                  chordsList.push(Dtovii)
            }
        }
        if (tab3.item.getCheckboxState("secondaryD")){
            chordsList.push(Dtoiv)
            chordsList.push(Dtov)
        }
        var revolutionChords = []
        if (tab3.item.getCheckboxState("revolution3")){
            for (var i = 0; i < chordsList.length; i++){  
                var tmpHarmonicFunction = chordsList[i].copy()
                tmpHarmonicFunction.revolution = tmpHarmonicFunction.getThird()
                revolutionChords.push(tmpHarmonicFunction)
            }
        }
        if (tab3.item.getCheckboxState("revolution5")){
            for (var i = 0; i < chordsList.length; i++){
                var tmpHarmonicFunction = chordsList[i].copy()
                tmpHarmonicFunction.revolution = tmpHarmonicFunction.getFifth()
                revolutionChords.push(tmpHarmonicFunction)
            }
        }
        
        if (tab3.item.getCheckboxState("neapolitan")) {
            chordsList.push(neapolitan)
        }

        return chordsList.concat(revolutionChords)
    }

    FileIO {
        id: myFileAbc
        onError: Utils.warn(msg + "  Filename = " + myFileAbc.source)
    }


    FileDialog {
        id: fileDialog
        title: qsTr("Please choose a file")
        onAccepted: {
            var filename = fileDialog.fileUrl
            if (filename) {
                myFileAbc.source = filename
                var input_text = String(myFileAbc.read())
                tab1.item.setText(input_text)
            }
        }
    }
    
    function showError(error) {
      while (error.message.length < 120) {
            error.message += " "
      }
      errorDialog.text = error.source !== undefined ? error.source + "\n" : ""
      errorDialog.text +=  error.message + "\n"
      if (error.details !== undefined) {
        if (error.details.length >= 1500) {
            errorDialog.text += error.details.substring(0,1500) + "..."
        } else {
            errorDialog.text += error.details
        }
      }

      if (error.stack !== undefined) {
        if (error.stack.length >= 1500) {
            errorDialog.text += "\n Stack: \n" + error.stack.substring(0,1500) + "..."
        } else {
            errorDialog.text += "\n Stack: \n" + error.stack
        }
      }

      errorDialog.open()
    }
    

    MessageDialog {
        id: errorDialog
        width: 600
        height: 400
        title: "HarmonySolver - Error"
        text: ""
        icon: StandardIcon.Critical
    }

    MessageDialog {
        id: parseSuccessDialog
        width: 300
        height: 400
        title: "Parse status"
        text: "Parsing exercise was successful. Input is correct."
        icon: StandardIcon.Information
        standardButtons: StandardButton.Ok
    }

    MessageDialog {
        id: emptyExerciseDialog
        width: 300
        height: 400
        title: "Exercise is empty"
        text: "Empty exercise box. \nPlease type in or import one before solving."
        icon: StandardIcon.Warning
        standardButtons: StandardButton.Ok
    }

    Rectangle {

        TabView {
            id: tabView
            width: 550
            height: 550

            Tab {
                title: "Harmonics"
                id: tab1
                active: true

                Rectangle {
                    id: tabRectangle1

                    function setText(text) {
                        abcText.text = text
                    }

                    Label {
                        id: textLabel
                        wrapMode: Text.WordWrap
                        text: qsTr("Provide task below:")
                        font.pointSize: 12
                        anchors.left: tabRectangle1.left
                        anchors.top: tabRectangle1.top
                        anchors.leftMargin: 10
                        anchors.topMargin: 10
                    }

                    TextArea {
                        id: abcText
                        font.pointSize: 10
                        anchors.top: textLabel.bottom
                        anchors.left: tabRectangle1.left
                        anchors.right: tabRectangle1.right
                        anchors.bottom: buttonOpenFile.top
                        anchors.topMargin: 10
                        anchors.bottomMargin: 10
                        anchors.leftMargin: 10
                        anchors.rightMargin: 10
                        width: parent.width
                        height: 400
                        wrapMode: TextEdit.WrapAnywhere
                        textFormat: TextEdit.PlainText
                    }

                    Button {
                        id: buttonOpenFile
                        text: qsTr("Import file")
                        anchors.bottom: tabRectangle1.bottom
                        anchors.left: tabRectangle1.left
                        anchors.topMargin: 10
                        anchors.bottomMargin: 10
                        anchors.leftMargin: 10
                        onClicked: {
                            fileDialog.open()
                        }
                        tooltip: "Import file with harmonic functions exercise."
                    }

                    Button {
                        id: buttonParse
                        text: qsTr("Check input")
                        anchors.bottom: tabRectangle1.bottom
                        anchors.left: buttonOpenFile.right
                        anchors.topMargin: 10
                        anchors.bottomMargin: 10
                        anchors.leftMargin: 10
                        onClicked: {
                            var input_text = abcText.text
                            if (input_text === undefined || input_text === "") {
                              emptyExerciseDialog.open()
                            } else {
                                try{
                                    exercise = Parser.parse(input_text)
                                    parseSuccessDialog.open()
                                } catch (error) {
                                    showError(error)
                                }
                            }
                        }
                        tooltip: "Check if input is correct"
                    }

                    Button {
                        id: buttonRun
                        text: qsTr("Solve")
                        //enabled: exerciseLoaded
                        anchors.bottom: tabRectangle1.bottom
                        anchors.right: tabRectangle1.right
                        anchors.topMargin: 10
                        anchors.bottomMargin: 10
                        anchors.rightMargin: 10
                        anchors.leftMargin: 10
                        onClicked: {
                                //parsing
                            exerciseLoaded = false
                            var input_text = abcText.text
                            if (input_text === undefined || input_text === "") {
                              emptyExerciseDialog.open()
                            } else {
                                try{
                                    exercise = Parser.parse(input_text)
                                    exerciseLoaded = true
                                } catch (error) {
                                    showError(error)
                                }
                            }

                            //solving
                            if (exerciseLoaded) {
                                try {
                                    exercise = Parser.parse(input_text)
                                    var solver = new Solver.Solver(exercise,undefined,undefined,
                                        !configuration.enableCorrector,!configuration.enablePrechecker)
                                    var solution = solver.solve()
                                    var solution_date = get_solution_date()

                                    prepare_score_for_solution(filePath, solution,
                                                               solution_date, true, "_hfunc")

                                    fill_score_with_solution(solution)

                                    writeScore(curScore,
                                               filePath + "/solutions/harmonic functions exercise/solution"
                                               + solution_date, "mscz")
                                } catch (error) {
                                    showError(error)
                                }
                            }
                        }
                    }
                }
            }
            Tab {
                title: "Bass"

                Rectangle {
                    id: tabRectangle2

                    Button {
                        id: buttonRunFiguredBass
                        text: qsTr("Solve")
                        anchors.bottomMargin: 10
                        anchors.rightMargin: 10
                        anchors.right: tabRectangle2.right
                        anchors.bottom: tabRectangle2.bottom
                        onClicked: {
                            try {
                                isFiguredBassScore()
                                figuredBassSolve()
                            } catch (error) {
                                showError(error)
                            }
                        }
                    }

                }
            }
            Tab {

                title: "Soprano"
                id: tab3

                Rectangle {
                    id: tabRectangle3

                    function getCheckboxState(function_name) {
                        if (function_name === "D7") {
                            return d7Checkbox.checkedState === Qt.Checked
                        }
                        if (function_name === "S6") {
                            return s6Checkbox.checkedState === Qt.Checked
                        }
                        if (function_name === "neapolitan") {
                            return neapolitanCheckbox.checkedState === Qt.Checked
                        }
                        if (function_name === "degree2") {
                            return degree2Checkbox.checkedState === Qt.Checked
                        }
                        if (function_name === "degree3") {
                            return degree3Checkbox.checkedState === Qt.Checked
                        }
                        if (function_name === "degree6") {
                            return degree6Checkbox.checkedState === Qt.Checked
                        }
                        if (function_name === "degree7") {
                            return degree7Checkbox.checkedState === Qt.Checked
                        }
                        if (function_name === "secondaryD") {
                            return secondaryDCheckbox.checkedState === Qt.Checked
                        }
                        if (function_name === "revolution3") {
                            return revolution3Checkbox.checkedState === Qt.Checked
                        }
                        if (function_name === "revolution5") {
                            return revolution5Checkbox.checkedState === Qt.Checked
                        }
                    }

                    function getSelectedMode(){
                        if (useMinorCheckbox.checked) {
                            return Consts.MODE.MINOR;
                        } else {
                            return Consts.MODE.MAJOR;
                        }
                    }

                    /*Label {
                        id: textLabelSoprano
                        wrapMode: Text.WordWrap
                        text: qsTr("Select all harmonic functions you want to use:")
                        anchors.left: tabRectangle3.left
                        anchors.top: tabRectangle3.top
                        anchors.leftMargin: 20
                        anchors.topMargin: 20
                        font.pointSize: 12
                    }*/
                    Row{
                        id: harmonicFunctionRow
                        anchors.left: tabRectangle3.left
                        anchors.leftMargin: 10
                        anchors.top: tabRectangle3.top
                        anchors.topMargin: 10
                        anchors.right: tabRectangle3.right
                        spacing: 16
                   

                        Column {
                            id: triadColumn
                             Text {
                                  id: triadTextLabel
                                  text: qsTr("Triad")
                            }
                            CheckBox {
                                checked: true
                                enabled: false
                                text: qsTr("T")
                            }
                            CheckBox {
                                checked: true
                                enabled: false
                                text: qsTr("S")
                            }
                            CheckBox {
                                checked: true
                                enabled: false
                                text: qsTr("D")
                            }
                        }

                        Column {
                            id: extraChordsColumn
                            Text {
                                  id: extraChordsTextLabel
                                  text: qsTr("Extra Chords")
                            }
                            CheckBox {
                                id: s6Checkbox
                                checked: false
                                text: qsTr("S6")
                            }
                            CheckBox {
                                id: d7Checkbox
                                checked: false
                                text: qsTr("D7")
                            }
                            CheckBox {
                                id: neapolitanCheckbox
                                checked: false
                                text: qsTr("neapolitan chord")
                            }
                            CheckBox {
                                id: secondaryDCheckbox
                                checked: false
                                text: qsTr("secondary dominants")
                            }
                        }

                        Column {
                            id: sideChordsColumn
                            Text {
                                id: sideChordsTextLabelt
                                text: qsTr("Side Chords")
                            }
                            CheckBox {
                                id: degree2Checkbox
                                checked: false
                                text: qsTr("II")

                            }
                            CheckBox {
                                id: degree3Checkbox
                                checked: false
                                text: qsTr("III")
                            }
                            CheckBox {
                                id: degree6Checkbox
                                checked: false
                                text: qsTr("VI")
                            }
                            CheckBox {
                                id: degree7Checkbox
                                checked: false
                                text: qsTr("VII")
                            }
                        }

                        Column {
                            id: revolutionColumn
                            Text {
                                id: revolutionTextLabelt
                                text: qsTr("Revolutions")
                            }
                            CheckBox {
                                id: revolution3Checkbox
                                checked: false
                                text: qsTr("3")
                            }
                            CheckBox {
                                id: revolution5Checkbox
                                checked: false
                                text: qsTr("5")
                            }
                        }

                        Column {
                            id: scaleColumn
                            ExclusiveGroup { id: scaleGroup }
                            Text {
                                id: scaleTextLabelt
                                text: qsTr("Scale")
                            }
                            RadioButton {
                                id: useMajorCheckbox
                                checked: true
                                text: qsTr("major")
                                exclusiveGroup: scaleGroup
                            }
                            RadioButton {
                                id: useMinorCheckbox
                                text: qsTr("minor")
                                exclusiveGroup: scaleGroup
                            }
                        }
                    }
                    Row{
                        id: ruleRaw
                        anchors.left: tabRectangle3.left
                        anchors.leftMargin: 10
                        anchors.top: harmonicFunctionRow.bottom
                        anchors.topMargin: 30
                        anchors.right: tabRectangle3.right
                        spacing: 30
                        
                        Column {
                              spacing: 10
                              Column {

                                    Text {
                                          text: qsTr("Consecutive Octaves")
                                    }
                                    Slider {
                                          id: consecutiveOctavesSlider
                                          maximumValue: 100
                                          minimumValue: 0
                                          stepSize: 1.0

                                    }
                                    Text {
                                          text: qsTr(consecutiveOctavesSlider.value+" %")
                                    }
                              }
                              Column {      
                                    Text {
                                          text: qsTr("Consecutive Fifths")
                                    }
                                    Slider {
                                          id: consecutiveFifthsSlider
                                          maximumValue: 100
                                          minimumValue: 0
                                          stepSize: 1.0
                                    }
                                    Text {
                                          text: qsTr(consecutiveFifthsSlider.value+" %")
                                    }
                              }
                              Column {      
                                    Text {
                                          text: qsTr("Crossing Voices")
                                    }
                                    Slider {
                                          id: crossingVoicesSlider
                                          maximumValue: 100
                                          minimumValue: 0
                                          stepSize: 1.0
                                    }
                                    Text {
                                          text: qsTr(crossingVoicesSlider.value+" %")
                                    }
                              }
                              Column {      
                                    Text {
                                          text: qsTr("One Direction")
                                    }
                                    Slider {
                                          id: oneDirectionSlider
                                          maximumValue: 100
                                          minimumValue: 0
                                          stepSize: 1.0
                                          }
                                    Text {
                                          text: qsTr(oneDirectionSlider.value+" %")
                                    }
                              }    
                              Column {  
                                    Text {
                                          text: qsTr("Forbidden jump")
                                    }
                                    Slider {
                                          id: forbiddenJumpSlider
                                          maximumValue: 100
                                          minimumValue: 0
                                          stepSize: 1.0
                                    }
                                    Text {
                                          text: qsTr(forbiddenJumpSlider.value+" %")
                                    }
                              }      
                        }
                        Column {
                              spacing: 10
                              Column {
                                    Text {
                                          text: qsTr("Hidden Octaves")
                                    }
                                    Slider {
                                          id: hiddenOctavesSlider
                                          maximumValue: 100
                                          minimumValue: 0
                                          stepSize: 1.0
                                    }
                                    Text {
                                          text: qsTr(hiddenOctavesSlider.value+" %")
                                    }
                              }
                              Column {
                                    Text {
                                          text: qsTr("False Relation")
                                    }
                                    Slider {
                                          id: falseRelationSlider
                                          maximumValue: 100
                                          minimumValue: 0
                                          stepSize: 1.0
                                    }
                                    Text {
                                          text: qsTr(falseRelationSlider.value+" %")
                                    }
                              }
                              Column {
                                    Text {
                                          text: qsTr("Repeated function")
                                    }
                                    Slider {
                                          id: sameFunctionCheckConnectionSlider
                                          maximumValue: 100
                                          minimumValue: 0
                                          stepSize: 1.0
                                    }      
                                    Text {
                                          text: qsTr(sameFunctionCheckConnectionSlider.value+" %")
                                    }
                              }
                              Column {      
                                    Text {
                                          text: qsTr("Illegal Doubled Third")
                                    }
                                    Slider {
                                          id: illegalDoubledThirdSlider
                                          maximumValue: 100
                                          minimumValue: 0
                                          stepSize: 1.0
                                    }
                                    Text {
                                          text: qsTr(illegalDoubledThirdSlider.value+" %")
                                    }
                              }
                        }
                        
                    }
                    
                    function getRatioFromSlider(x){
                        return (100 - x.value) / 100
                    }
                    
                    function getPunishmentRatios(){
                        var punishmentRatios = {};
                        punishmentRatios[Consts.CHORD_RULES.ConcurrentOctaves] = getRatioFromSlider(consecutiveOctavesSlider)
                        punishmentRatios[Consts.CHORD_RULES.ConcurrentFifths] = getRatioFromSlider(consecutiveFifthsSlider)
                        punishmentRatios[Consts.CHORD_RULES.CrossingVoices] = getRatioFromSlider(crossingVoicesSlider)
                        punishmentRatios[Consts.CHORD_RULES.OneDirection] = getRatioFromSlider(oneDirectionSlider)
                        punishmentRatios[Consts.CHORD_RULES.ForbiddenJump] = getRatioFromSlider(forbiddenJumpSlider)
                        punishmentRatios[Consts.CHORD_RULES.HiddenOctaves] = getRatioFromSlider(hiddenOctavesSlider)
                        punishmentRatios[Consts.CHORD_RULES.FalseRelation] = getRatioFromSlider(falseRelationSlider)
                        punishmentRatios[Consts.CHORD_RULES.SameFunctionCheckConnection] = getRatioFromSlider(sameFunctionCheckConnectionSlider)
                        punishmentRatios[Consts.CHORD_RULES.IllegalDoubledThird] = getRatioFromSlider(illegalDoubledThirdSlider)

                        return punishmentRatios
                    }     

                    Button {

                        id: buttorSoprano
                        text: qsTr("Solve")
                        anchors.bottom: tabRectangle3.bottom
                        anchors.right: tabRectangle3.right
                        anchors.topMargin: 10
                        anchors.bottomMargin: 10
                        anchors.rightMargin: 10
                        onClicked: {
                            try{
                                isSopranoScore()
                                var func_list = getPossibleChordsList()
                                var punishments = getPunishmentRatios()
                                sopranoHarmonization(func_list, punishments)
                            } catch (error) {
                                showError(error)
                           }
                        }
                    }
                }
            }
            Tab {

                title: "Settings"
                id: tab4

                function showConfiguration(){
                    savePathTextArea.text = configuration.solutionPath
                }

                Rectangle{
                    id: tabRectangle4

                    Label {
                        id: savedPathLabel
                        anchors.top: tabRectangle4.top
                        anchors.left: tabRectangle4.left
                        anchors.topMargin: 10
                        anchors.leftMargin: 15
                        text: qsTr("Solutions save path")
                    }

                    TextField {
                        id: savedPathTextField
                        anchors.top: savedPathLabel.bottom
                        anchors.left: tabRectangle4.left
                        anchors.leftMargin: 10
                        width: 200
                        height: 25
                        readOnly: true
                        text: configuration.solutionPath
                    }

                    FileDialog {
                        id: selectSolutionPathDirDialog
                        title: "Please choose a directory"
                        folder: filePath
                        selectFolder: true
                        onAccepted: {
                            var path = selectSolutionPathDirDialog.fileUrl.toString().slice(8)
                            savedPathTextField.text = path
                            configuration.solutionPath = path
                            savePluginConfiguration()
                        }
                    }

                    Button{
                        id: selectSolutionPath
                        anchors.left: savedPathTextField.right
                        anchors.top: savedPathTextField.top
                        anchors.leftMargin: 10
                        text: qsTr("Select")
                        onClicked: {
                            selectSolutionPathDirDialog.open()
                        }
                    }


                    Column {
                        id: exerciseOptionsColumn
                        anchors.top: savedPathTextField.bottom
                        anchors.left: tabRectangle4.left
                        anchors.leftMargin: 10
                        anchors.topMargin: 20
                        spacing: 10
                        CheckBox {
                            id: printCheckbox
                            checked: configuration.enableChordSymbolsPrinting
                            text: qsTr("print chord symbols")
                            tooltip: "Enable printing chord sybols under the chords in score"
                            onCheckedChanged: function() {
                                    if (this.checkedState === Qt.Checked){
                                          configuration.enableChordSymbolsPrinting = true
                                          savePluginConfiguration()
                                          return Qt.Unchecked
                                    }else{
                                          configuration.enableChordSymbolsPrinting = false
                                          savePluginConfiguration()
                                          return Qt.Checked
                                    }
                            }
                        }
                        CheckBox {
                             id: printComponentsCheckbox
                             checked: configuration.enableChordComponentsPrinting
                             text: qsTr("print chord components")
                             tooltip: "Enable printing chord components next to every note"
                             onCheckedChanged: function() {
                                    if (this.checkedState === Qt.Checked){
                                          configuration.enableChordComponentsPrinting = true
                                          savePluginConfiguration()
                                          return Qt.Unchecked
                                    }else{
                                          configuration.enableChordComponentsPrinting = false
                                          savePluginConfiguration()
                                          return Qt.Checked
                                    }
                            }
                        }
                        CheckBox {
                            id: precheckCheckbox
                            checked: configuration.enablePrechecker
                            text: qsTr("precheck for unavoidable errors")
                            tooltip: "Enables additional step of solving - preckeck.\n" + 
                            "During precheck plugin checks connections between all chords.\n" + 
                            "If there is some problem, plugin will wand you about that giving chords position,\n" + 
                            "their parameters and rules, that were broken during checking that connection.\n" +
                            "This option may increase solving time by around 5 seconds."
                            onCheckedChanged: function() {
                                    if (this.checkedState === Qt.Checked){
                                          configuration.enablePrechecker = true
                                          savePluginConfiguration()
                                          return Qt.Unchecked
                                    }else{
                                          configuration.enablePrechecker = false
                                          savePluginConfiguration()
                                          return Qt.Checked
                                    }
                            }
                        }
                        CheckBox {
                             id: correctCheckbox
                             checked: configuration.enableCorrector
                             text: qsTr("correct given exercise")
                             tooltip: "Enable exercise correction.\nExample:\n" +
                             "TODO EXAMPLE"
                             onCheckedChanged: function() {
                                    if (this.checkedState === Qt.Checked){
                                          configuration.enableCorrector = true
                                          savePluginConfiguration()
                                          return Qt.Unchecked
                                    }else{
                                          configuration.enableCorrector = false
                                          savePluginConfiguration()
                                          return Qt.Checked
                                    }
                            }
                        }
                    }

                    //istnieje ale nie musi
                    Button {
                        id: saveConfigurationButton
                        text: qsTr("Save Configuration")
                        anchors.bottom: tabRectangle4.bottom
                        anchors.left: tabRectangle4.left
                        anchors.bottomMargin: 10
                        anchors.leftMargin: 10
                        onClicked: {
                            savePluginConfiguration()
                        }
                    }

                }
            }
        }
    }
}
