function se95(p, n) {
    return Math.sqrt(p*(1-p)/n)*1.96;
};

function prepareGraphs(patientId, data) {
  $.ajax({url: '/analyze/' + patientId.toString(), beforeSend:  function(){ $('#status').delay(300).fadeIn(); 
  $('#preloader').delay(300).fadeIn('slow')}, complete: function() {$('#status').delay(300).fadeOut(); 
  $('#preloader').delay(300).fadeOut('slow')},
  success: function(result){
    $( "#raw_value" ).html('<h1>' + Math.round(result.mean) + '</h1>')
    $( "#patientName" ).html('<h3> Patient ' + patientId + '</h3>')
    makeGraph(data)
  }});

}
function makeGraph(data){

  d3.select("svg").remove();
  // Settings
  var width = parseInt(d3.select('#viz').style('width'), 10) - 75,
      height = parseInt(d3.select('#viz').style('height'), 10) - 45,
      padding = 30;

  var margin = {
      'top': 10,
      'right': 35,
      'bottom': 25,
      'left': 40
  };

  margin.hor = margin.left + margin.right;
  margin.ver = margin.top + margin.bottom;

  // Config
  var dataset = "static/" + data + ".csv",
      parseDate = d3.time.format("%Y/%m").parse,
      electionDate = "",  // "2014/11"
      interpolation = "linear";

  var coalitionLeft = ["A", "B", "F", "Ø"],
      coalitionLeftColor = "#D7191C", // red
      coalitionRight = ["V", "O", "K", "I", "C"],
      coalitionRightColor = "#2B83BA", // blue
      displaySingleCoalition = true;
      // false, "left", "right"

  var useCoalitionLabels = true,
      yAxisTitle = "mg/dL",
      cutoff = 50;

  if (useCoalitionLabels === true) { margin.right = 50; }
  // for the labels; 40 + 10 for each array.length > 4

  var x = d3.time.scale()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .ticks(7)
      .tickSubdivide(2);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickFormat(d3.format(".0%"));

  var lineLeft = d3.svg.area()
      .interpolate(interpolation)
      .x(function(d) { return x(d["date"]); })
      .y(function(d) { return y(d["left"]); });

  var lineRight = d3.svg.area()
      .interpolate(interpolation)
      .x(function(d) { return x(d["date"]); })
      .y(function(d) { return y(d["right"]); });

  var confidenceAreaLeft = d3.svg.area()
      .interpolate(interpolation)
      .x(function(d) { return x(d["date"]); })
      .y0(function(d) {
          return y(d["left"] - d["confidenceRight"]); })
      .y1(function(d) {
          return y(d["left"] + d["confidenceRight"]); });

  // var confidenceAreaRight = d3.svg.area()
  //     .interpolate(interpolation)
  //     .x(function(d) { return x(d["date"]); })
  //     .y0(function(d) {
  //         return y(d["right"] - d["confidenceRight"]); })
  //     .y1(function(d) {
  //         return y(d["right"] + d["confidenceRight"]); });

  var svg = d3.select("#viz").append("svg")
      .attr({
          "width": width + margin.left + margin.right,
          "height": height + margin.top + margin.bottom
      })
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.csv(dataset, function(error, data) {
      data.forEach(function(d) {
          d.date = parseDate(d.date);
          d.respondents = parseFloat(d.respondents);

          coalitionSum = function(d, coalition) {
              var votes = parseFloat(0);
              for (var i = 0; i < coalition.length; i++) {
                  votes += parseFloat(d[coalition[i]])
              }
              // Return percentage in decimal format
              return votes>1 ? votes/100 : votes;
          };
          d["left"] = coalitionSum(d, coalitionLeft),
          d["right"] = coalitionSum(d, coalitionRight),
          d["total"] = d["left"] + d["right"],
          d["confidenceLeft"] = se95(d["left"], d["respondents"]),
          d["confidenceRight"] = se95(d["right"], d["respondents"]);
      });

      if (electionDate === "") {
          x.domain(d3.extent(data, function(d) {
              return d.date; }));
      } else {
          x.domain([
              d3.min(data, function(d) { return d.date; }),
              parseDate(electionDate)
          ]);
      }
      y.domain([
          d3.min(data, function(d) {
              var min = Math.min(d["right"], d["left"]);
              return min - se95(min, d["respondents"]);
          }),
          d3.max(data, function(d) {
              var max = Math.max(d["right"], d["left"]);
              return max + se95(max, d["respondents"]);
          })
      ]);

      svg.datum(data);

      // X axis
      svg.append("g")
          .attr({
              "class": "x axis",
              "transform": "translate(0," + height + ")"
          })
          .call(xAxis);

      // Y axis
      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
          .append("text")
          .attr({
              "transform": "rotate(-90)",
              "y": 6,
              "dy": ".71em"
          })
          .style("text-anchor", "end")
          .text(yAxisTitle);

      // Confidence area
      if (displaySingleCoalition !== "right") {
          svg.append("path")
              .attr({
                  "class": "area confidence",
                  "fill": coalitionLeftColor,
                  "d": confidenceAreaLeft
              });
      }
      // if (displaySingleCoalition !== "left") {
      //     svg.append("path")
      //         .attr({
      //             "class": "area confidence",
      //             "fill": coalitionRightColor,
      //             "d": confidenceAreaRight
      //         });
      // }

      // Lines
      if (displaySingleCoalition !== "right") {
          svg.append("path")
              .attr({
                  "class": "line",
                  "d": lineLeft,
                  "stroke": coalitionLeftColor
              });
      }
      if (displaySingleCoalition !== "left") {
          svg.append("path")
              .attr({
                  "class": "line",
                  "d": lineRight,
                  "stroke": coalitionRightColor
              });
      }

      // Dots
      var dots = svg.selectAll("circle")
          .data(data)
          .enter();

      if (displaySingleCoalition !== "right") {
          var dotsLeft = dots.append("circle")
              .attr({
                  "class": "dot",
                  "fill" : "white",
                  "r": 3,
                  "cx": lineLeft.x(),
                  "cy": lineLeft.y(),
                  "stroke": coalitionLeftColor
              });
      }
      if (displaySingleCoalition !== "left") {
          var dotsRight = dots.append("circle")
              .attr({
                  "class": "dot",
                  "fill" : coalitionRightColor,
                  "r": 3,
                  "cx": lineRight.x(),
                  "cy": lineRight.y(),
                  "stroke": coalitionRightColor
              });
      }

      // Divider
      svg.append("line")
          .attr("class", "divider")
          .attr({
              "x1": x.range()[0],
              "x2": x.range()[1],
              "y1": y(cutoff),
              "y2": y(cutoff)
          });

      // Graph label
      if (useCoalitionLabels === true) {
          if (displaySingleCoalition !== "right") {
              svg.append("text")
                  .data(data)
                  .attr("transform", function(d) {
                      return "translate(" + x(data[data.length-1]["date"]) + "," + y(data[data.length-1]["left"]) + ")"; })
                  .attr({
                      "x": 10,
                      "dy": ".35em",
                      "class": "label",
                      "id": "coalitionLeft"
                  })
                  .text(coalitionLeft.join(""));
          }
          if (displaySingleCoalition !== "left") {
              svg.append("text")
                  .data(data)
                  .attr("transform", function(d) {
                      return "translate(" + x(data[data.length-1]["date"]) + "," + y(data[data.length-1]["right"]) + ")"; })
                  .attr({
                      "x": 10,
                      "dy": ".35em",
                      "class": "label",
                      "id": "coalitionRight"
                  })
                  .text(coalitionRight.join(""));
          }
      }
  });
}
