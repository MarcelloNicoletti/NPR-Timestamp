function onClickDownload_Btn() {
    document.getElementById("download_btn").disabled = true;

    const fileNames = getFileNames();
    var audioSources = sendRequests(fileNames);

    document.getElementById("download_btn").disabled = false;
}

function sendRequests(fileNames) {
    var audioSources = {};
    // ordered by expected filesize
    sendRequestForFile("suffix", fileNames.suffixFile, audioSources);
    sendRequestForFile("prefix", fileNames.prefixFile, audioSources);
    sendRequestForFile("month", fileNames.monthFile, audioSources);
    sendRequestForFile("day", fileNames.dayFile, audioSources);
    sendRequestForFile("hour", fileNames.hourFile, audioSources);
    sendRequestForFile("minute", fileNames.minuteFile, audioSources);
    sendRequestForFile("date", fileNames.dateFile, audioSources);
    sendRequestForFile("ampm", fileNames.ampmFile, audioSources);
    sendRequestForFile("on", fileNames.onFile, audioSources);

    return audioSources;
}

function sendRequestForFile(index, filename, audioSources) {
    var request = new XMLHttpRequest();
    request.open('GET', filename, true);
    request.responseType = 'arraybuffer';

    request.onload = function() {
        if (request.readyState === 4) {
            if (request.status === 200) {
                createSoundWithBuffer(index, audioSources, request.response);
            }
        }
    }

    request.send();
}

function createSoundWithBuffer(index, audioSources, rawBuffer) {
    var context = new AudioContext();

    var audioSource = context.createBufferSource();
    audioSource.connect(context.destination);

    context.decodeAudioData(rawBuffer, function(res) {
        audioSource.buffer = res;
        audioSources[index] = audioSource;
    });
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
    }
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
