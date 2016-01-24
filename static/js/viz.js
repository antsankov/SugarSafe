function se95(p, n) {
    return Math.sqrt(p*(1-p)/n)*1.96;
};

function prepareGraphs(patientId, data) {
  $.ajax({url: '/analyze/' + patientId.toString(), beforeSend:  function(){ $('#status').delay(300).fadeIn();
  $('#preloader').delay(300).fadeIn('slow')}, complete: function() {$('#status').delay(300).fadeOut();
  $('#preloader').delay(300).fadeOut('slow')},
  success: function(result){
    $( "#raw_value" ).html('<h1>' + Math.round(result.mean) + '</h1>')
    $( "#patientName" ).html('<h3> Patient: ' + patientId + '</h3>')
    makeGraph(data)
  }});
}


function makeGraph(data){

  d3.select("svg").remove();

  // Config
  var dataset = "static/" + data + ".csv";
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

  var x = d3.time.scale()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var ActualLine = d3.svg.line()
      .x(function(d) { return x(d.time); })
      .y(function(d) { return y(d.actual); });

  // var PredictedLine = d3.svg.line()
  //     .x(function(d) {
  //       return x(d.time);
  //     })
  //     .y(function(d){ return y(d.pred); })

  var area = d3.svg.area()
      .interpolate("monotone")
      .x(function(d) { return x(d.time); })
      .y0(function(d) { return y(d.lower); })
      .y1(function(d) { return y(d.upper); });

  var svg = d3.select("#viz").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  d3.csv("static/data_correct.csv", type, function(error, data) {
    if (error) throw error;

    x.domain(d3.extent(data, function(d) {
      return d.time; }));
    y.domain(d3.extent(data, function(d) {
      return d.actual; }
    ));

    // svg.append("svg:circle")
    //     .datum(data)
    //     .attr("stroke", "black")
    //     .attr("fill", function(d) { return "black" })
    //     .attr("cx", function(d) { return d.time })
    //     .attr("cy", function(d) { return d.actual })
    //     .attr("r", function(d) { return 3 });

    svg.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("actual");

    svg.append("path")
        .datum(data)
        .attr("class", "ActualLine")
        .attr("d", ActualLine);

    // svg.append("path")
    //   .datum(data)
    //   .attr("class", "PredictedLine")
    //   .attr("d", PredictedLine);
  });

  function type(d) {
    console.log(d)
    d.time = new Date(d.x * 1000);
    d.actual = +d.actual
    d.pred = +d.pred
    d.upper = +d.upper
    d.lower = +d.lower
    return d;
  }
}
