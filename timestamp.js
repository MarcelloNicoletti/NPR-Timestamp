const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

var LastStitchedAudioBuffer = null;
var LastFileNames = null;

async function onClickDownload_Btn() {
    disableButtons();
    const stitchedAudioBuffer = await getStitchedAudioBuffer();
    await exportBufferToFile(stitchedAudioBuffer);
    enableButtons();
}

async function onClickPlay_Btn() {
    disableButtons();
    const stitchedAudioBuffer = await getStitchedAudioBuffer();
    await playAudioBuffer(stitchedAudioBuffer);
    enableButtons();
}

async function getStitchedAudioBuffer() {
    var stitchedAudioBuffer = null;
    const keysInOrder = ["prefix", "hour", "minute", "ampm", "on", "day", "month", "date", "suffix"];

    const fileNames = getFileNames();
    if (areSameFiles(fileNames, LastFileNames)) {
        stitchedAudioBuffer = LastStitchedAudioBuffer;
    } else {
        const audioBuffers = requestAllFilesAndDecode(fileNames);
        stitchedAudioBuffer = await stichAduioBuffers(audioBuffers, keysInOrder);
    }

    LastFileNames = fileNames;
    LastStitchedAudioBuffer = stitchedAudioBuffer;

    return stitchedAudioBuffer;
}

async function exportBufferToFile(audioBuffer) {
    // TODO: Export as WAVE file
}

async function playAudioBuffer(audioBuffer) {
    var source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start(0);
    await sleep(audioBuffer.duration * 1000);
}

async function stichAduioBuffers(audioBuffers, orderedSoundKeys) {
    var workingBuffer = await waitForBufferAndGetIt(audioBuffers, orderedSoundKeys[0]);
    for (var i = 1; i < orderedSoundKeys.length; i++) {
        var nextBuffer = await waitForBufferAndGetIt(audioBuffers, orderedSoundKeys[i]);
        workingBuffer = concatenateAudioBuffers(workingBuffer, nextBuffer);
    }

    return workingBuffer;
}

async function waitForBufferAndGetIt(audioBuffers, key) {
    while (!audioBuffers[key]) {
        await sleep(10);
    }
    return audioBuffers[key];
}

function concatenateAudioBuffers(buffer1, buffer2) {
    var numberOfChannels = Math.min(buffer1.numberOfChannels, buffer2.numberOfChannels);
    var tmp = audioCtx.createBuffer(numberOfChannels, (buffer1.length + buffer2.length), buffer1.sampleRate);
    for (var i = 0; i < numberOfChannels; i++) {
        var channel = tmp.getChannelData(i);
        channel.set(buffer1.getChannelData(i), 0);
        channel.set(buffer2.getChannelData(i), buffer1.length);
    }
    return tmp;
}

function requestAllFilesAndDecode(fileNames) {
    var audioBuffers = {};
    // ordered by expected filesize
    requestFileAndDecode("suffix", fileNames.suffixFile, audioBuffers);
    requestFileAndDecode("prefix", fileNames.prefixFile, audioBuffers);
    requestFileAndDecode("month", fileNames.monthFile, audioBuffers);
    requestFileAndDecode("day", fileNames.dayFile, audioBuffers);
    requestFileAndDecode("hour", fileNames.hourFile, audioBuffers);
    requestFileAndDecode("minute", fileNames.minuteFile, audioBuffers);
    requestFileAndDecode("date", fileNames.dateFile, audioBuffers);
    requestFileAndDecode("ampm", fileNames.ampmFile, audioBuffers);
    requestFileAndDecode("on", fileNames.onFile, audioBuffers);

    return audioBuffers;
}

function requestFileAndDecode(index, filename, audioBuffers) {
    var request = new XMLHttpRequest();
    request.open('GET', filename, true);
    request.responseType = 'arraybuffer';

    request.onload = function () {
        if (request.readyState === 4) {
            if (request.status === 200) {
                audioCtx.decodeAudioData(request.response,
                    decoded => audioBuffers[index] = decoded);
            }
        }
    }

    request.send();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function disableButtons() {
    document.getElementById("download_btn").disabled = true;
    document.getElementById("play_btn").disabled = true;
}

function enableButtons() {
    // document.getElementById("download_btn").disabled = false;
    document.getElementById("play_btn").disabled = false;
}

function getFileNames() {
    const hour = getHourNumber();
    const minute = getMinuteNumber();
    const ampm = getAmPmString();
    const day = getDayNumber();
    const month = getMonthNumber();
    const date = getDateNumber();
    return {
        prefixFile: "resources/prefix.mp3",
        suffixFile: "resources/suffix.mp3",
        onFile: "resources/on.mp3",
        hourFile: "resources/hour_" + hour + ".mp3",
        minuteFile: "resources/minute_" + minute + ".mp3",
        dayFile: "resources/day_" + day + ".mp3",
        monthFile: "resources/month_" + month + ".mp3",
        dateFile: "resources/date_" + date + ".mp3",
        ampmFile: "resources/" + ampm + ".mp3"
    };
}

function areSameFiles(fileNames1, fileNames2) {
    if (!fileNames1 || !fileNames2) return false;
    return (fileNames1.suffixFile === fileNames2.suffixFile) &&
        (fileNames1.prefixFile === fileNames2.prefixFile) &&
        (fileNames1.monthFile === fileNames2.monthFile) &&
        (fileNames1.dayFile === fileNames2.dayFile) &&
        (fileNames1.hourFile === fileNames2.hourFile) &&
        (fileNames1.minuteFile === fileNames2.minuteFile) &&
        (fileNames1.dateFile === fileNames2.dateFile) &&
        (fileNames1.ampmFile === fileNames2.ampmFile) &&
        (fileNames1.onFile === fileNames2.onFile);
}

function getHourNumber() {
    var value = document.getElementById("ts_hour").value;
    if (!value) {
        var hours = new Date().getHours() % 12;
        if (hours === 0) hours = 12;
        document.getElementById("ts_hour").value = hours;
        value = hours;
    }
    return parseInt(value);
}

function getMinuteNumber() {
    var value = document.getElementById("ts_minute").value;
    if (!value) {
        var minutes = new Date().getMinutes() % 60;
        document.getElementById("ts_minute").value = minutes;
        value = minutes;
    }
    return parseInt(value);
}

function getAmPmString() {
    var value = document.getElementById("ts_ampm").value;
    if (!value) {
        var hours = new Date().getHours();
        document.getElementById("ts_ampm").value = (hours > 12) ? "pm" : "am";
        value = (hours > 12) ? "pm" : "am";
    }
    return value;
}

function getDayNumber() {
    var value = document.getElementById("ts_day").selectedIndex;
    if (!value || value === 0) {
        var day = new Date().getDay() + 1;
        document.getElementById("ts_day").selectedIndex = day;
        value = day;
    }
    return parseInt(value);
}

function getMonthNumber() {
    var value = document.getElementById("ts_month").selectedIndex;
    if (!value || value === 0) {
        var month = new Date().getMonth() + 1;
        document.getElementById("ts_month").selectedIndex = month;
        value = month;
    }
    return parseInt(value);
}

function getDateNumber() {
    var value = document.getElementById("ts_date").value;
    if (!value) {
        var date = new Date().getDate();
        document.getElementById("ts_date").value = date;
        value = date;
    }
    return parseInt(value);
}
