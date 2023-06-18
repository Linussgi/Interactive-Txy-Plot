const margin = { top: 20, right: 20, bottom: 30, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG element
var svg = d3.select("#chart-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("border", "2px solid")
    .style("margin-left", "auto")
    .style("margin-right", "auto")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Define x scale
var x = d3.scaleLinear()
    .domain([0, 1])
    .range([0, width]);

// Define y scale
var y = d3.scaleLinear()
    .domain([0, 1])
    .range([height, 0]);


// Initial co-ords display before drag event
d3.select("#coords-display")
    .text("Point coordinates: (0.500, 0.500)");

// Generate data 
var data = [];
var step = 0.0001;

for (var xVal = 0; xVal < 1; xVal += step) {
    var dataPoint = {
        comp: xVal,
        vapData: 0.5 * Math.pow(xVal, 2) + 0.25,
        liqData: 0.5 * Math.pow(xVal, 0.5) + 0.25
    };

    data.push(dataPoint);
}

// Add the gridlines
svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x)
        .tickSize(-height)
        .tickFormat("")
    )
    .selectAll(".tick line")
    .attr("stroke-width", 0.5); 


svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
    )
    .selectAll(".tick line")
    .attr("stroke-width", 0.5); 


// Define line functions
var vapLine = d3.line()
    .x(function (d) { return x(d.comp); })
    .y(function (d) { return y(d.vapData); });

var liqLine = d3.line()
    .x(function (d) { return x(d.comp); })
    .y(function (d) { return y(d.liqData); });

// Add first line to svg
svg.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")
    .style("stroke", "blue")
    .attr("stroke-width", 2) 
    .attr("d", vapLine);

// Add second line to svg
svg.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")
    .style("stroke", "red")
    .attr("stroke-width", 2)
    .attr("d", liqLine);

// Add x-axis
svg.append("g")
    .attr("transform", `translate(0, ${height})`) // y positioning is inverted in d3js
    .call(d3.axisBottom(x));

// Add y-axis
svg.append("g")
    .call(d3.axisLeft(y));

// Add draggable point -------------------------------------------------------------------------
var draggablePoint = svg.append("circle")
    .attr("cx", x(0.5)) // Initial x-coordinate of point
    .attr("cy", y(0.5)) // Initial y-coordinate of point
    .attr("r", 5) // Radius 
    .style("fill", "#92268F")
    .style("stroke", "black")
    .attr("stroke-width", 2)
    .call(d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded)
    );

// Drag behavior functions
function dragStarted() {
    d3.select(this).raise().classed("active", true);
}

function dragged(event, d) {
    var xPos = x.invert(event.x);
    var yPos = y.invert(event.y);
  
    xPos = Math.max(0, Math.min(xPos, 1));
    yPos = Math.max(0, Math.min(yPos, 1));
  
    d3.select(this)
      .attr("cx", x(xPos))
      .attr("cy", y(yPos));
  
    d3.select("#coords-display")
      .text(`Point Co-ordinates: (${xPos.toFixed(3)}, ${yPos.toFixed(3)})`);
    
    // Do lever arm stuff
    var [compVals, tVals] = locateEquiValues(yPos)

    if (xPos > compVals.liqComp) {
        var vapLineDist = xPos - compVals.liqComp;
    } else {
        var vapLineDist = 0;
    }

    if (compVals.vapComp > xPos) {
        var liqLineDist = compVals.vapComp - xPos;
    } else {
        var liqLineDist = 0;
    }

    // Composition calculation
    var vapFrac = Math.min(1, ((liqLineDist) / (compVals.vapComp - compVals.liqComp))) || 0;
    var liqFrac = Math.min(1, ((vapLineDist) / (compVals.vapComp - compVals.liqComp))) || 0;

    d3.select("#leverarm")
        .text(`Vapour Fraction: ${vapFrac.toFixed(3)}. Liquid Fraction: ${liqFrac.toFixed(3)}`);

    
    svg.selectAll(".drag-line").remove(); // Remove previous lines

    svg.append("line")
        .attr("class", "drag-line")
        .attr("x1", x(xPos))
        .attr("y1", y(yPos))
        .attr("x2", x(compVals.vapComp))
        .attr("y2", y(tVals.vapVal))
        .style("stroke", "blue") 
        .style("stroke-width", 2)
        .style("stroke-dasharray", "7,5");

    draggablePoint.raise();

    svg.append("line")
        .attr("class", "drag-line")
        .attr("x1", x(xPos))
        .attr("y1", y(yPos))
        .attr("x2", x(compVals.liqComp))
        .attr("y2", y(tVals.liqVal))
        .style("stroke", "red") 
        .style("stroke-width", 2)
        .style("stroke-dasharray", "7,5");
    
    svg.select(".vertical-line").remove();

    // Add vertical line
    svg.append("line")
        .attr("class", "vertical-line")
        .attr("x1", x(xPos))
        .attr("y1", y(yPos))
        .attr("x2", x(xPos))
        .attr("y2", height)
        .style("stroke", "#92268F")
        .style("stroke-width", 2)
        .style("stroke-dasharray", "7,5");

    draggablePoint.raise();
}
  
function dragEnded() {
    d3.select(this).classed("active", false);
}

// Find the composition values of vapour and liquid lines at yPos
function locateEquiValues(yCoord) {
    var vapVals = data.map(d => d.vapData)
    var liqVals = data.map(d => d.liqData)
    var compVals = data.map(d => d.comp)

    var minVapDiff = 2;
    var minLiqDiff = 2;

    for (var i = 0; i < vapVals.length; i++) {
        var currentVapDiff = Math.abs(yCoord - vapVals[i]);    
        var currentLiqDiff = Math.abs(yCoord - liqVals[i]);

        if (currentVapDiff < minVapDiff) {
            minVapDiff = currentVapDiff;
            var locatedVapIndex = i;
        }

        if (currentLiqDiff < minLiqDiff) {
            minLiqDiff = currentLiqDiff;
            var locatedLiqIndex = i;
        }
    }

    return [
        {
            vapComp: compVals[locatedVapIndex],
            liqComp: compVals[locatedLiqIndex]
        },
        {
            vapVal: vapVals[locatedVapIndex],
            liqVal: liqVals[locatedLiqIndex]
        }
    ]
}