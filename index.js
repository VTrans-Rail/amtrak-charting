var fs = require('fs')
var Xray = require('x-ray');
var moment = require('moment');
moment().format();
var x = Xray();

// start of CSV file
var csvHead = 'Train, Date, Station, Scheduled Arrival, Scheduled Departure, Actual Arrival, Actual Departure, Departure Delay, Dwell \n'
fs.writeFile('out.csv', csvHead)
var csvString = ''

// html string roots
var htmlRoot = 'http://statusmaps.com/cgi-bin/gettrain.pl?'
var seltrain = 'seltrain='
var selyear = '&selyear='
var selmonth = '&selmonth='
var selday = '&selday='

// dates and trains to scrape
var years = [2016];
var months = ['07'];
var days = [];
for (var i = 1; i < 32; i++) { // push int 1-31 into days[]
  if (i < 10) { // needs to be a string number padded with a zero
    days.push('0' + i)
  } else {
    days.push(i.toString())
  }
}
var trains = [55,56];

// loop through the date and train variables to scrape
years.forEach(function eachYear(year) {
  months.forEach(function eachMonth(month) {
    days.forEach(function eachDay(day) {
      trains.forEach(function eachTrain(train) {
        var html = htmlRoot + seltrain + train + selmonth + month + selyear + year + selday + day;
        check(html, train, day, month, year)
      })
    })
  })
})


function check(html, train, day, month, year) { // check if there is train data for that day
  x(html, 'h2')(function(err, data) {
    if (err) {
      console.error(err);
    } else if (data.includes("Sorry.  No status file was found")) { // page content if no train
      console.log("Nothing for train " + train + " on " + month + '-' + day + '-' + year);
      return
    } else {
      console.log("scraping train " + train + " on " + month + '-' + day + '-' + year);
      scrape(html, train, day, month, year)
    }
  })

}

function scrape(html, train, day, month, year) { // scrape the train data for the given day
  var data = []; // clear out data to start to avoid duplicates
  x(html, 'div#m1 tr', [{
    station: 'td:nth-of-type(1)',
    scheduled: 'td:nth-of-type(2)',
    actual: 'td:nth-of-type(3)'
  }])(function(err, data) {
    if (err) {
      return console.log(err);
    }

    var ArRegex = /ar\s+(\d+(a|p))/i;
    var DpRegex = /dp\s+(\d+(a|p))/i;


    data.shift() // removes unnecessary first entry
    for (var i = 0; i < data.length; i++) { // loop through every data entry

      // set request date

      var trainDay = moment(month + day + year, 'MMDDYYYY')

      // prep vars
      var timeStrings = []

      timeStrings[0] = data[i].scheduled.match(ArRegex); // scheduled arrival
      timeStrings[1] = data[i].scheduled.match(DpRegex); // scheduled departure
      timeStrings[2] = data[i].actual.match(ArRegex); // actual arrival
      timeStrings[3] = data[i].actual.match(DpRegex); // actual departure

      var times = []

      timeStrings.forEach(function setNum(a) { // process time strings to extract numbers, set PM
        var reqDate = moment(month + day + year, 'MMDDYYYY')
          if (a) { // if a is not null
            if (a[1].indexOf('P') > -1 && parseFloat(a[1]) < 1200) { // if it is PM
              var timeNo = parseFloat(a[1]) + 1200 // turn string to number and add 1200 for military time
              setTime(timeNo, reqDate)
            } else if (parseFloat(a[1]) < 1000) { // if it is AM with 3 digit number
              var timeNo = '0' + parseFloat(a[1]) // just turn string to number, pad with leading zero
              setTime(timeNo, reqDate)
            } else if (parseFloat(a[1]) > 999) {
              var timeNo = parseFloat(a[1]) // just turn string to number
              setTime(timeNo, reqDate)
            }
          } else { // if a it is null
            timeNo = ''
            times.push(timeNo)
          }
        }) // end of timeStrings

      function setTime(timeNo, reqDate) {
        var min = timeNo.toString().substr(2,3)
        var hr = timeNo.toString().substr(0,2)
        var time = reqDate.add(hr, 'h').add(min, 'm').format('HH:mm');
        times.push(time)
      }

      // calculate Dwell
      if (times[2] && times[3]) { // if have both act Ar and Dp
        var actArr = moment(times[2], 'HH:mm')
        var actDep = moment(times[3], 'HH:mm')
        var dwell = actDep.diff(actArr, 'm')
      } else {
        var dwell = ''
      }

      // calculate departure delay
      if (times[3] && times[1]) {
        var actDep = moment(times[3],'HH:mm');
        var schedDep = moment(times[1], 'HH:mm');
        var depDel = actDep.diff(schedDep, 'm')
      } else {
        var depDel = ''
      }

      // write vars to csvString
      csvString += train + ', ' + trainDay.format('MM-DD-YYYY') + ', '
      csvString += data[i].station.replace(/,/g, "") + ', ' // take first value in data[]
      csvString += times.join(',') + ', ' // join together all the times[] values
      csvString += depDel + ', '
      csvString += dwell // add dwell
      csvString += "\n"
    }

    console.log("Train " + train + " on " + month + "-" + day + " scraped.");


  })
  fs.appendFile('out.csv', csvString)
} // end scrape function
