function prepareGraphs(patientId, data) {
  $.ajax({url: '/analyze/' + patientId.toString(), beforeSend:  function(){ $('#status').delay(300).fadeIn();
  $('#preloader').delay(300).fadeIn('slow')}, complete: function() {$('#status').delay(300).fadeOut();
  $('#preloader').delay(300).fadeOut('slow')},
  success: function(result){
    console.log(result);
    timestamp = new Date(result.timestamp*1000);
    $( "#raw_value" ).html('<h1>' + Math.round(result.mean) + '</h1>')
    $( "#pred_time" ).html('<h6>' + timestamp.toLocaleDateString() + '</h6>')
    $( "#patientName" ).html('<h3> Patient ' + patientId + '</h3>')
    makeGraph(data)
  }});
}


function makeGraph(data){

  d3.select("svg").remove();

  // Config
  var dataset = "static/" + data + ".csv";
  var actualDataset = "static/" + data + "actual.csv";

  var width = parseInt(d3.select('#viz').style('width'), 10) - 55,
      height = parseInt(d3.select('#viz').style('height'), 10) - 45,
      padding = 30;

  var margin = {
      'top': 15,
      'right': 25,
      'bottom': 20,
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
      .orient("bottom")
      .ticks(d3.time.day, 5);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var PredictedLine = d3.svg.line()
      .x(function(d) {
        return x(d.time);
      })
      .y(function(d){ return y(d.pred); })

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


  d3.csv(dataset, type, function(error, data) {
    if (error) throw error;

    x.domain(d3.extent(data, function(d) {
      return d.time; }));
    y.domain(d3.extent(data, function(d) {
      return d.upper; }
    ));

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
        .attr("dy", ".71em")
        .style("text-anchor", "end")

    svg.append("path")
      .datum(data)
      .attr("class", "PredictedLine")
      .attr("d", PredictedLine);
  });

  var ActualLine = d3.svg.line()
      .x(function(ad) { return x(ad.time); })
      .y(function(ad) { return y(ad.actual); });

  d3.csv(actualDataset, type, function(error, data) {
    if (error) throw error;

    x.domain(d3.extent(data, function(ad) {
      return ad.time; }));
    y.domain(d3.extent(data, function(ad) {
      return ad.actual; }
    ));

    svg.append("path")
        .datum(data)
        .attr("class", "ActualLine")
        .attr("d", ActualLine);
  });


  function type(ad) {
    console.log(ad.time)
    ad.time = new Date(Math.round(ad.time) * 1000);
    ad.actual = +ad.actual
    console.log(ad)
    return ad;
  }
}
