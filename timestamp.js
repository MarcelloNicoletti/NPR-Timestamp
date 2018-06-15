const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

var LastStitchedAudioBuffer = undefined;
var LastFileNames = undefined;

async function onClickDownload_Btn() {
    const ind = disableButtonsAndAddIndicator("Downloading...");
    const stitchedAudioBuffer = await getStitchedAudioBuffer();
    await exportBufferToFile(stitchedAudioBuffer);
    enableButtonsAndRemoveIndicator(ind);
}

async function onClickPlay_Btn() {
    const ind = disableButtonsAndAddIndicator("Downloading...");
    const stitchedAudioBuffer = await getStitchedAudioBuffer();
    ind.textContent = "Playing...";
    await playAudioBuffer(stitchedAudioBuffer);
    enableButtonsAndRemoveIndicator(ind);
}

async function getStitchedAudioBuffer() {
    const keysInOrder = ["prefix", "hour", "minute", "ampm", "on", "day", "month", "date", "suffix"];

    var stitchedAudioBuffer = undefined;
    const fileNames = getFileNames();
    if (areSameFiles(fileNames, LastFileNames)) {
        stitchedAudioBuffer = LastStitchedAudioBuffer;
    } else {
        const audioBuffers = await requestAllFilesAndDecode(fileNames);
        stitchedAudioBuffer = stitchAudioBuffers(audioBuffers, keysInOrder);
    }

    LastFileNames = fileNames;
    LastStitchedAudioBuffer = stitchedAudioBuffer;

    return stitchedAudioBuffer;
}

async function exportBufferToFile(audioBuffer) {
    const audioBlob = convertToWav(audioBuffer);
    forceDownload(audioBlob, "Marco_NPR_Politics_Timestamp.wav");
}

async function playAudioBuffer(audioBuffer) {
    var source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start(0);
    await sleep(audioBuffer.duration * 1000);
}

function stitchAudioBuffers(audioBuffers, orderedSoundKeys) {
    var workingBuffer = audioBuffers[orderedSoundKeys[0]];
    for (var i = 1; i < orderedSoundKeys.length; i++) {
        var nextBuffer = audioBuffers[orderedSoundKeys[i]];
        workingBuffer = concatenateAudioBuffers(workingBuffer, nextBuffer);
    }

    return workingBuffer;
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

async function requestAllFilesAndDecode(fileNames) {
    const requestPromises = [];
    requestPromises.push(requestFileAndDecode("suffix", fileNames.suffixFile));
    requestPromises.push(requestFileAndDecode("prefix", fileNames.prefixFile));
    requestPromises.push(requestFileAndDecode("month", fileNames.monthFile));
    requestPromises.push(requestFileAndDecode("day", fileNames.dayFile));
    requestPromises.push(requestFileAndDecode("hour", fileNames.hourFile));
    requestPromises.push(requestFileAndDecode("minute", fileNames.minuteFile));
    requestPromises.push(requestFileAndDecode("date", fileNames.dateFile));
    requestPromises.push(requestFileAndDecode("ampm", fileNames.ampmFile));
    requestPromises.push(requestFileAndDecode("on", fileNames.onFile));

    const wrappedBuffers = await Promise.all(requestPromises)
        .catch(err => console.error("There was an error:" + err));

    const audioBuffers = {};
    for (index in wrappedBuffers) {
        const wrappedBuffer = wrappedBuffers[index];
        Object.assign(audioBuffers, wrappedBuffer);
    }

    return audioBuffers;
}

async function requestFileAndDecode(index, filename) {
    return makeRequest('GET', filename)
        .then(response => decodeFile(index, response));
}

function decodeFile(index, response) {
    const obj = {}
    return new Promise(function (resolve, reject) {
        audioCtx.decodeAudioData(response, decoded => {
            obj[index] = decoded;
            resolve(obj);
        });
    })
}

function makeRequest (method, url) {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function disableButtonsAndAddIndicator(indication) {
    document.getElementById("download_btn").disabled = true;
    document.getElementById("play_btn").disabled = true;
    const indicator = document.createElement("p");
    indicator.className = "indicator";
    indicator.textContent = indication;
    document.body.appendChild(indicator);
    return indicator;
}

function enableButtonsAndRemoveIndicator(indecatorElement) {
    document.getElementById("download_btn").disabled = false;
    document.getElementById("play_btn").disabled = false;

    document.body.removeChild(indecatorElement);
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

// ###########################################################################
// # The following is extracted  from recorder.js by Matt Diamond.           #
// # That repo is found here https://github.com/mattdiamond/Recorderjs       #
// ###########################################################################
// # Licence for recorder.js from Matt Diamond (MIT)                         #
// ###########################################################################
// # Copyright © 2013 Matt Diamond                                           #
// # Permission is hereby granted, free of charge, to any person obtaining a #
// # copy of this software and associated documentation files (the           #
// # "Software"), to deal in the Software without restriction, including     #
// # without limitation the rights to use, copy, modify, merge, publish,     #
// # distribute, sublicense, and/or sell copies of the Software, and to      #
// # permit persons to whom the Software is furnished to do so, subject to   #
// # the following conditions:                                               #
// #                                                                         #
// # The above copyright notice and this permission notice shall be included #
// # in all copies or substantial portions of the Software.                  #
// #                                                                         #
// # THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS #
// # OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF              #
// # MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  #
// # IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY    #
// # CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,    #
// # TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE       #
// # SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                  #
// ###########################################################################

function convertToWav(audioBuffer) {
    var buffers = [];
    const type = "audio/wav";
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    for (var channel = 0; channel < numChannels; channel++) {
        buffers.push(audioBuffer.getChannelData(channel));
    }
    var interleaved = undefined;
    if (numChannels === 2) {
        interleaved = interleave(buffers[0], buffers[1]);
    } else {
        interleaved = buffers[0];
    }
    var dataview = encodeWAV(interleaved, numChannels, sampleRate);
    var audioBlob = new Blob([dataview], { type: type });

    return audioBlob;
}

function interleave(inputL, inputR) {
    var length = inputL.length + inputR.length;
    var result = new Float32Array(length);

    var index = 0,
        inputIndex = 0;

    while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }
    return result;
}

function floatTo16BitPCM(output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view, offset, string) {
    for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function encodeWAV(samples, numChannels, sampleRate) {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numChannels * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
}

function forceDownload(blob, filename) {
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = window.document.createElement('a');
    link.href = url;
    link.download = filename || 'output.wav';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
}
