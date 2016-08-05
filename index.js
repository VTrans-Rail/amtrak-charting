var fs = require('fs')
var Xray = require('x-ray');
var x = Xray();

// var html = 'http://74.242.208.76/scripts/archivefinder.pl?seltrain=56&selmonth=08&selyear=2016&selday=01'
var html = 'http://dixielandsoftware.net/cgi-bin/gettrain.pl?seltrain=56&selyear=2016&selmonth=08&selday=03'

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

  var csvString = 'Station, Scheduled Arrival, Scheduled Departure, Actual Arrival, Actual Departure, Dwell \n'
  data.shift() // removes unnecessary first entry
  for (var i = 0; i < data.length; i++) {
    // prep vars
    var timeStrings = []

    timeStrings[0] = data[i].scheduled.match(ArRegex); // scheduled arrival
    timeStrings[1] = data[i].scheduled.match(DpRegex); // scheduled departure
    timeStrings[2] = data[i].actual.match(ArRegex); // actual arrival
    timeStrings[3] = data[i].actual.match(DpRegex); // actual departure

    var times = []

    timeStrings.forEach(function setNum(a) { // process time strings to extract numbers, set PM
        if (a) { // if a is not null
          if (a[1].indexOf('P') > -1 && a[1] < 1200) { // if it is PM
            var timeNo = parseFloat(a[1]) + 1200 // turn string to number and add 1200 for military time
            times.push(timeNo)
          } else { // if it is AM
            var timeNo = parseFloat(a[1]) // just turn string to number
            times.push(timeNo)
          }
        } else { // if a it is null
          timeNo = ''
          times.push(timeNo)
        }
      }) // end of timeStrings

    if (times[2] && times[3]) { // if have both act Ar and Dp
      var dwell = times[3] - times[2]
    } else {
      var dwell = ''
    }

    // write vars to csvString
    csvString += data[i].station.replace(/,/g, "") + ', ' // take first value in data[]
    csvString += times.join(',') + ', ' // join together all the times[] values
    csvString += dwell // add dwell
    csvString += "\n"
  }

  fs.writeFile('out.csv', csvString)

})
