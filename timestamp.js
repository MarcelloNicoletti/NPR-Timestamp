function onClickDownload_Btn() {
    var hour = getHourString();
    var minute = getMinuteString();
    var ampm = getAmPmString();
    var day = getDayString();
    var month = getMonthString();
    var date = getDateString();

    console.log("Downloading...");
    console.log(hour);
    console.log(minute);
    console.log(ampm);
    console.log(day);
    console.log(month);
    console.log(date);
}

function getHourString() {
    var value = document.getElementById("ts_hour").value;
    if (!value) {
        var hours = new Date().getHours() % 12;
        if (hours == 0) hours = 12;
        document.getElementById("ts_hour").value = hours;
        value = hours;
    }
    return value.toString();
}

function getMinuteString() {
    var value = document.getElementById("ts_minute").value;
    if (!value) {
        var minutes = new Date().getMinutes() % 60;
        document.getElementById("ts_minute").value = minutes;
        value = minutes;
    }
    return value.toString();
}

function getAmPmString() {
    var value = document.getElementById("ts_ampm").value;
    if (!value) {
        var hours = new Date().getHours();
        document.getElementById("ts_ampm").value = (hours > 12) ? "pm" : "am";
        value = (hours > 12) ? "pm" : "am";
    }
    return value.toString();
}

function getDayString() {
    var value = document.getElementById("ts_day").selectedIndex;
    if (!value || value == 0) {
        var day = new Date().getDay() + 1;
        document.getElementById("ts_day").selectedIndex = day;
        value = day;
    }
    return document.getElementById("ts_day").value;
}

function getMonthString() {
    var value = document.getElementById("ts_month").selectedIndex;
    if (!value || value == 0) {
        var month = new Date().getMonth() + 1;
        document.getElementById("ts_month").selectedIndex = month;
        value = month;
    }
    return value.toString();
}

function getDateString() {
    var value = document.getElementById("ts_date").value;
    if (!value) {
        var date = new Date().getDate();
        document.getElementById("ts_date").value = date;
        value = date;
    }
    return value.toString();
}
