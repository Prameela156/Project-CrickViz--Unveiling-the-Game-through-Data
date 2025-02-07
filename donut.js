function drawPieChart(playerData, tooltip) {
    const donutWidth = 650,
       donutHeight = 450;
    const donutColor = d3.scaleOrdinal(d3.schemeCategory10);
    color_range = [0.1, 0.4, 0.6, 0.8, 1]
    const donut_colorCategories = ["extras", "fours_count", "sixes_count", "dot_balls_count", "wickets_taken"];
    const donut_colorMap = Object.fromEntries(
        donut_colorCategories.map((category, index) => [
            category,
            d3.interpolateInferno(color_range[index]) 
        ])
    );
    d3.select("#popup-visualizations").selectAll("*").remove();
    donut_svg = d3.select("#popup-visualizations")
        .append("svg")
        .attr("width", donutWidth)
        .attr("height", donutHeight)
        .append("g")
        .attr("transform", `translate(${(donutWidth - 50) / 2},${donutHeight / 2})`);



    d3.csv("data/merged_result.csv").then(function (data) {
        const donutBowlerData = data.find(d => d.bowler === playerData[1]);
        console.log(data);

        const donutDataDisplay = {
            extras: +donutBowlerData.extras,
            fours_count: +donutBowlerData.fours_count,
            sixes_count: +donutBowlerData.sixes_count,
            dot_balls_count: +donutBowlerData.dot_balls_count,
            wickets_taken: +donutBowlerData.wickets_taken
        };

        const donutChart = d3.pie().value(d => d[1]);
        const donutData = donutChart(Object.entries(donutDataDisplay));
        const donutMaxValue = d3.max(Object.values(donutDataDisplay));
        const outerRadiusScale = d3.scaleLinear().domain([0, donutMaxValue]).range([100, 160]);
        const arcGenerator = d3.arc()
            .innerRadius(75)
            .outerRadius(d => outerRadiusScale(d.data[1]));
        donut_svg.selectAll('path')
            .data(donutData)
            .join('path')
            .attr('d', arcGenerator
            )
            .attr('fill', d => donut_colorMap[d.data[0]])
            .style("opacity", 0.8)
            .on("mouseover", function (event, d) {
                const donutTotalBalls = d3.sum(Object.values(donutDataDisplay));
                const donutColumnName = d.data[0];
                const donutColumnValue = d.data[1];
                const donutMatchCount = +donutBowlerData.match_count;

                // donutTooltip.transition().duration(100).style("opacity", 1);
                // donutTooltip.html(`${donutColumnName}: ${donutColumnValue} balls<br>Total matches: ${donutMatchCount} <br>Total Balls: ${donutTotalBalls}`)
                //     .style("left", (event.pageX + 10) + "px")
                //     .style("top", (event.pageY - 30) + "px");
                // d3.select(this).attr("stroke", "yellow").attr("stroke-width", 3);

                tooltip
                    .style("visibility", "visible")
                    .html(`
                    <strong>${donutColumnName}:</strong>${donutColumnValue} <br>
                    <strong>Total matches:</strong>${donutMatchCount} <br>
                    <strong>Total Balls:</strong>${donutTotalBalls}<br>
                `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 30}px`);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 30}px`);
            })
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden");
            })
            .transition()
            .duration(1500)
            .style("opacity", 1)
            .attrTween('d', function (d) {
                const i = d3.interpolate(d.startAngle, d.endAngle);
                return function (t) {
                    d.endAngle = i(t);
                    return arcGenerator(d);
                };
            });

        donut_svg.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("font-weight", "bold")
            .text(donutBowlerData.bowler);

        const donutLegend = donut_svg.append("g")
            .attr("transform", `translate(175, -220)`);

        const donutLegendItems = Object.entries(donutDataDisplay);

        donutLegendItems.forEach((d, i) => {
            const donutLegendItem = donutLegend.append("g")
                .attr("transform", `translate(0, ${i * 25})`);

            donutLegendItem.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", donut_colorMap[d[0]]);

            donutLegendItem.append("text")
                .attr("x", 22)
                .attr("y", 10)
                .attr("font-size", "15px")
                .text(d[0]);
        });
    });

    // const donutTooltip = d3.select("body").append("div")
    //     .attr("class", "donutTooltip")
    //     .style("position", "absolute")
    //     .style("background-color", "rgba(0, 0, 0, 0.6)")
    //     .style("color", "white")
    //     .style("padding", "10px")
    //     .style("border-radius", "5px")
    //     .style("opacity", 0)
    //     .style("pointer-events", "none");
}