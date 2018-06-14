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
    const keysInOrder = ["prefix", "hour", "minute", "ampm", "on", "day", "month", "date", "suffix"];

    var stitchedAudioBuffer = null;
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
    // TODO: Extract exportWAV from recorder.js
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    const rec = new Recorder(source);
    rec.record();
    source.start(0);
    await sleep(audioBuffer.duration * 1000);
    rec.stop();
    rec.exportWAV(blob => {
        Recorder.forceDownload(blob, "Marco_NPR_Timestamp.wav");
    });
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

function disableButtons() {
    document.getElementById("download_btn").disabled = true;
    document.getElementById("play_btn").disabled = true;
}

function enableButtons() {
    document.getElementById("download_btn").disabled = false;
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

// TODO: Extract only what I need from this.
// I already have the buffers I need for the file, so all of the recording
// code is useless. I don't need a worker since I have nothing else going on
// besides the download. Without the recording need I can instantly export the
// wave file rather than needing to play the full audio into the recorder.
// Things I need to extract, along with any other dependencies
//   * The encodeWAV function
//   * The interleave function
//   * The forceDownload function

// ###########################################################################
// # Contents of recorder.js: from https://github.com/mattdiamond/Recorderjs #
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
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Recorder = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
    "use strict";
    
    module.exports = require("./recorder").Recorder;
    
    },{"./recorder":2}],2:[function(require,module,exports){
    'use strict';
    
    var _createClass = (function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
            }
        }return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
        };
    })();
    
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.Recorder = undefined;
    
    var _inlineWorker = require('inline-worker');
    
    var _inlineWorker2 = _interopRequireDefault(_inlineWorker);
    
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
    }
    
    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }
    
    var Recorder = exports.Recorder = (function () {
        function Recorder(source, cfg) {
            var _this = this;
    
            _classCallCheck(this, Recorder);
    
            this.config = {
                bufferLen: 4096,
                numChannels: 2,
                mimeType: 'audio/wav'
            };
            this.recording = false;
            this.callbacks = {
                getBuffer: [],
                exportWAV: []
            };
    
            Object.assign(this.config, cfg);
            this.context = source.context;
            this.node = (this.context.createScriptProcessor || this.context.createJavaScriptNode).call(this.context, this.config.bufferLen, this.config.numChannels, this.config.numChannels);
    
            this.node.onaudioprocess = function (e) {
                if (!_this.recording) return;
    
                var buffer = [];
                for (var channel = 0; channel < _this.config.numChannels; channel++) {
                    buffer.push(e.inputBuffer.getChannelData(channel));
                }
                _this.worker.postMessage({
                    command: 'record',
                    buffer: buffer
                });
            };
    
            source.connect(this.node);
            this.node.connect(this.context.destination); //this should not be necessary
    
            var self = {};
            this.worker = new _inlineWorker2.default(function () {
                var recLength = 0,
                    recBuffers = [],
                    sampleRate = undefined,
                    numChannels = undefined;
    
                self.onmessage = function (e) {
                    switch (e.data.command) {
                        case 'init':
                            init(e.data.config);
                            break;
                        case 'record':
                            record(e.data.buffer);
                            break;
                        case 'exportWAV':
                            exportWAV(e.data.type);
                            break;
                        case 'getBuffer':
                            getBuffer();
                            break;
                        case 'clear':
                            clear();
                            break;
                    }
                };
    
                function init(config) {
                    sampleRate = config.sampleRate;
                    numChannels = config.numChannels;
                    initBuffers();
                }
    
                function record(inputBuffer) {
                    for (var channel = 0; channel < numChannels; channel++) {
                        recBuffers[channel].push(inputBuffer[channel]);
                    }
                    recLength += inputBuffer[0].length;
                }
    
                function exportWAV(type) {
                    var buffers = [];
                    for (var channel = 0; channel < numChannels; channel++) {
                        buffers.push(mergeBuffers(recBuffers[channel], recLength));
                    }
                    var interleaved = undefined;
                    if (numChannels === 2) {
                        interleaved = interleave(buffers[0], buffers[1]);
                    } else {
                        interleaved = buffers[0];
                    }
                    var dataview = encodeWAV(interleaved);
                    var audioBlob = new Blob([dataview], { type: type });
    
                    self.postMessage({ command: 'exportWAV', data: audioBlob });
                }
    
                function getBuffer() {
                    var buffers = [];
                    for (var channel = 0; channel < numChannels; channel++) {
                        buffers.push(mergeBuffers(recBuffers[channel], recLength));
                    }
                    self.postMessage({ command: 'getBuffer', data: buffers });
                }
    
                function clear() {
                    recLength = 0;
                    recBuffers = [];
                    initBuffers();
                }
    
                function initBuffers() {
                    for (var channel = 0; channel < numChannels; channel++) {
                        recBuffers[channel] = [];
                    }
                }
    
                function mergeBuffers(recBuffers, recLength) {
                    var result = new Float32Array(recLength);
                    var offset = 0;
                    for (var i = 0; i < recBuffers.length; i++) {
                        result.set(recBuffers[i], offset);
                        offset += recBuffers[i].length;
                    }
                    return result;
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
    
                function encodeWAV(samples) {
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
            }, self);
    
            this.worker.postMessage({
                command: 'init',
                config: {
                    sampleRate: this.context.sampleRate,
                    numChannels: this.config.numChannels
                }
            });
    
            this.worker.onmessage = function (e) {
                var cb = _this.callbacks[e.data.command].pop();
                if (typeof cb == 'function') {
                    cb(e.data.data);
                }
            };
        }
    
        _createClass(Recorder, [{
            key: 'record',
            value: function record() {
                this.recording = true;
            }
        }, {
            key: 'stop',
            value: function stop() {
                this.recording = false;
            }
        }, {
            key: 'clear',
            value: function clear() {
                this.worker.postMessage({ command: 'clear' });
            }
        }, {
            key: 'getBuffer',
            value: function getBuffer(cb) {
                cb = cb || this.config.callback;
                if (!cb) throw new Error('Callback not set');
    
                this.callbacks.getBuffer.push(cb);
    
                this.worker.postMessage({ command: 'getBuffer' });
            }
        }, {
            key: 'exportWAV',
            value: function exportWAV(cb, mimeType) {
                mimeType = mimeType || this.config.mimeType;
                cb = cb || this.config.callback;
                if (!cb) throw new Error('Callback not set');
    
                this.callbacks.exportWAV.push(cb);
    
                this.worker.postMessage({
                    command: 'exportWAV',
                    type: mimeType
                });
            }
        }], [{
            key: 'forceDownload',
            value: function forceDownload(blob, filename) {
                var url = (window.URL || window.webkitURL).createObjectURL(blob);
                var link = window.document.createElement('a');
                link.href = url;
                link.download = filename || 'output.wav';
                window.document.body.appendChild(link);
                link.click();
                window.document.body.removeChild(link);
            }
        }]);
    
        return Recorder;
    })();
    
    exports.default = Recorder;
    
    },{"inline-worker":3}],3:[function(require,module,exports){
    "use strict";
    
    module.exports = require("./inline-worker");
    },{"./inline-worker":4}],4:[function(require,module,exports){
    (function (global){
    "use strict";
    
    var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();
    
    var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };
    
    var WORKER_ENABLED = !!(global === global.window && global.URL && global.Blob && global.Worker);
    
    var InlineWorker = (function () {
      function InlineWorker(func, self) {
        var _this = this;
    
        _classCallCheck(this, InlineWorker);
    
        if (WORKER_ENABLED) {
          var functionBody = func.toString().trim().match(/^function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/)[1];
          var url = global.URL.createObjectURL(new global.Blob([functionBody], { type: "text/javascript" }));
    
          return new global.Worker(url);
        }
    
        this.self = self;
        this.self.postMessage = function (data) {
          setTimeout(function () {
            _this.onmessage({ data: data });
          }, 0);
        };
    
        setTimeout(function () {
          func.call(self);
        }, 0);
      }
    
      _createClass(InlineWorker, {
        postMessage: {
          value: function postMessage(data) {
            var _this = this;
    
            setTimeout(function () {
              _this.self.onmessage({ data: data });
            }, 0);
          }
        }
      });
    
      return InlineWorker;
    })();
    
    module.exports = InlineWorker;
    }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    },{}]},{},[1])(1)
    });