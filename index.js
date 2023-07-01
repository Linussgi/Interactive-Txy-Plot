const margin = {top: 20, right: 50, bottom: 70, left: 80};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const tempBase = 300
const tempLimit = 650
const tempRange = tempLimit - tempBase

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
    .domain([tempBase, tempLimit])
    .range([height, 0]);


// Initial data display before drag event
d3.select("#coords-display")
    .text("Point coordinates: (0.500, 0.500)");

    d3.select("#leverarm")
    .text("Vpour Fraction: 0.452, Liquid Fraction: 0.548");

// Generate data 
var data = [];
var step = 0.0001;

for (var xVal = 0; xVal < 1; xVal += step) {
    var dataPoint = {
        // composition, vapour curve, liquid curve
        comp: xVal,

        liqData: 0.5 * tempRange *Math.pow(xVal, 2) + 0.25 * tempRange + tempBase,
        vapData: 0.5 * tempRange *Math.pow(xVal, 0.5) + 0.25 * tempRange + tempBase
    };

    data.push(dataPoint);
}

console.log(data.map(d => d.liqData))

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
    .y(function (d) { return y(d.liqData); });

var liqLine = d3.line()
    .x(function (d) { return x(d.comp); })
    .y(function (d) { return y(d.vapData); });

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
    .attr("transform", `translate(0, ${height})`) // y positioning is inverted in d3
    .call(d3.axisBottom(x))
    .style("font-size", "16px");

// Add y-axis
svg.append("g")
    .call(d3.axisLeft(y))
    .style("font-size", "16px");

// Append x-axis label
svg.append("text")
   .attr("class", "x-axis-label")
   .attr("x", width / 2)
   .attr("y", height + margin.top + 30) 
   .attr("text-anchor", "middle")
   .style("font-size", "20px")
   .text("Composition Fraction");

// Append y-axis label
svg.append("text")
   .attr("class", "y-axis-label")
   .attr("transform", "rotate(-90)")
   .attr("x", -height / 2)
   .attr("y", -margin.left + 30) 
   .attr("text-anchor", "middle")
   .style("font-size", "20px")
   .text("Temperature (K)");


// Add draggable point -------------------------------------------------------------------------
var draggablePoint = svg.append("circle")
    .attr("id", "drag-point")
    .attr("cx", width / 2) // Initial x-coordinate of point
    .attr("cy", height / 2) // Initial y-coordinate of point
    .attr("r", 6) // Radius 
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
    
    // Point must be on the graph
    xPos = Math.max(0, Math.min(xPos, 1));
    yPos = Math.max(0, Math.min(yPos, tempLimit));
  
    d3.select(this)
      .attr("cx", x(xPos))
      .attr("cy", y(yPos));
  
    d3.select("#coords-display")
      .text(`Point Co-ordinates: (${xPos.toFixed(3)}, ${yPos.toFixed(0)})`);
    
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

    var [maxVapVal, minLiqVal] = defineQualityRegion(xPos)

    if (yPos > maxVapVal && yPos < minLiqVal) {

        // Composition calculation
        var vapFrac = ((liqLineDist) / (liqLineDist + vapLineDist));
        var liqFrac = ((vapLineDist) / (liqLineDist + vapLineDist));

        svg.selectAll(".drag-line").remove(); // Remove previous lines

        svg.append("line")
            .attr("class", "drag-line")
            .attr("x1", x(xPos))
            .attr("y1", y(yPos))
            .attr("x2", x(compVals.vapComp))
            .attr("y2", y(tVals.vapVal))
            .style("stroke", "red") 
            .style("stroke-width", 2)
            .style("stroke-dasharray", "7,5");

        draggablePoint.raise();

        svg.append("line")
            .attr("class", "drag-line")
            .attr("x1", x(xPos))
            .attr("y1", y(yPos))
            .attr("x2", x(compVals.liqComp))
            .attr("y2", y(tVals.liqVal))
            .style("stroke", "blue") 
            .style("stroke-width", 2)
            .style("stroke-dasharray", "7,5");
    } else if (yPos > maxVapVal) {
        svg.selectAll(".drag-line").remove();

        var vapFrac = 1
        var liqFrac = 0

    } else {
        svg.selectAll(".drag-line").remove();

        var vapFrac = 0
        var liqFrac = 1
    }
    

    d3.select("#leverarm")
        .text(`Vapour Fraction: ${vapFrac.toFixed(3)}, Liquid Fraction: ${liqFrac.toFixed(3)}`);

    // Add vertical line
    svg.select(".vertical-line").remove();

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
    var vapVals = data.map(d => d.liqData)
    var liqVals = data.map(d => d.vapData)
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

function defineQualityRegion(xCoord) {
    var compVals = data.map(d => d.comp)
    var vapVals = data.map(d => d.liqData)
    var liqVals = data.map(d => d.vapData)
    
    var minCompDiff = 2;

    for (i = 0; i < compVals.length; i++) {
        var currentCompDiff = Math.abs(xCoord - compVals[i]);

        if (currentCompDiff < minCompDiff) {
            minCompDiff = currentCompDiff;
            var locatedIndex = i;
        }
    }

    return [vapVals[locatedIndex], liqVals[locatedIndex]]
}