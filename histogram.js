function drawHistogram(playerData, tooltip) {
    const filePath = "data/player_data_Histogram.csv";
    const histogram_margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const histogram_width = 650 - histogram_margin.left - histogram_margin.right;
    const histogram_height = 400 - histogram_margin.top - histogram_margin.bottom;
    console.log(playerData);

    d3.select("#popup-visualizations").selectAll("*").remove();

    popUpViz_svg = d3.select("#popup-visualizations")
        .append("svg")
        .attr("width", histogram_width + histogram_margin.left + histogram_margin.right)
        .attr("height", histogram_height + histogram_margin.top + histogram_margin.bottom)
        .append("g")
        .attr("transform", `translate(${histogram_margin.left},${histogram_margin.top})`);

    const histogram_x = d3.scaleBand().range([0, histogram_width]).padding(0.2);
    const histogram_y = d3.scaleLinear().range([histogram_height, 0]);

    let color_range = [0.3, 0.5, 0.7, 0.9]
    const histogram_colorCategories = ["0-10", "11-49", "50-99", "100+"];
    const histogram_colorMap = Object.fromEntries(
        histogram_colorCategories.map((category, index) => [
            category,
            d3.interpolateInferno(color_range[index])
        ])
    );

    const histogram_allYears = Array.from({ length: 2023 - 2008 + 1 }, (_, i) => (2008 + i).toString());

    d3.csv(filePath).then(histogram_data => {

        histogram_data.forEach(d => {
            d.runs_scored = +d.runs_scored;
        });

        const histogram_batsmen = Array.from(new Set(histogram_data.map(d => d.batsman)));

        const histogram_datalist = d3.select("#batsman-list");
        histogram_datalist.selectAll("option")
            .data(histogram_batsmen)
            .enter()
            .append("option")
            .attr("value", d => d);

        function histogram_updateChart(histogram_batsman) {
            const histogram_batsmanData = histogram_data.filter(d => d.batsman === histogram_batsman);

            const histogram_categorizedData = histogram_allYears.map(year => {
                const yearData = histogram_batsmanData.filter(d => d.year === year);
                return {
                    year,
                    "0-10": yearData.filter(d => d.runs_scored >= 0 && d.runs_scored <= 10).length,
                    "11-49": yearData.filter(d => d.runs_scored >= 11 && d.runs_scored <= 49).length,
                    "50-99": yearData.filter(d => d.runs_scored >= 50 && d.runs_scored <= 99).length,
                    "100+": yearData.filter(d => d.runs_scored >= 100).length,
                };
            });

            const histogram_flattened = histogram_categorizedData.flatMap(d => Object.keys(d).slice(1).map(category => ({
                year: d.year,
                category,
                value: d[category],
            })));

            histogram_x.domain(histogram_allYears);
            histogram_y.domain([0, d3.max(histogram_flattened, d => d.value)]);
            const t = d3.transition().duration(1000);

            popUpViz_svg.selectAll("g").remove();
            popUpViz_svg.selectAll(".bar").remove();

            popUpViz_svg.selectAll(".x-axis").remove();
            popUpViz_svg.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${histogram_height})`)
                .call(d3.axisBottom(histogram_x).tickValues(histogram_allYears));

            popUpViz_svg.selectAll(".y-axis").remove(); 
            popUpViz_svg.append("g")
                .attr("class", "y-axis")
                .transition(t)
                .call(d3.axisLeft(histogram_y));

            popUpViz_svg.selectAll(".bar-group")
                .data(histogram_flattened, d => `${d.year}-${d.category}`)
                .join(
                    enter => enter.append("rect")
                        .attr("class", d => `bar bar-${d.category.replace(/\+/g, 'plus')}`)
                        .attr("x", d => histogram_x(d.year) + histogram_x.bandwidth() / 4 * ["0-10", "11-49", "50-99", "100+"].indexOf(d.category))
                        .attr("y", histogram_height)
                        .attr("width", histogram_x.bandwidth() / 4)
                        .attr("height", 0)
                        .attr("fill", d => histogram_colorMap[d.category])
                        .call(enter => enter.transition().duration(1000)
                            .attr("y", d => histogram_y(d.value))
                            .attr("height", d => histogram_height - histogram_y(d.value))),
                    update => update.transition().duration(1000)
                        .attr("y", d => histogram_y(d.value))
                        .attr("height", d => histogram_height - histogram_y(d.value)),
                    exit => exit.transition().duration(500)
                        .attr("height", 0)
                        .attr("y", histogram_height)
                        .remove()
                )
                .on("mouseover", function (event, d) {
                    d3.selectAll(`.bar-${d.category.replace(/\+/g, 'plus')}`)
                        .attr("stroke", "black")
                        .attr("stroke-width", 2);

                    const histogram_categoryTotal = histogram_flattened.filter(item => item.category === d.category)
                        .reduce((acc, item) => acc + item.value, 0);
                    const currentSeasonMatches = histogram_batsmanData.filter(item => item.year === d.year).length;
                    const currentSeasonRuns = histogram_batsmanData
                        .filter(item => item.year === d.year && item.runs_scored >= 0)
                        .reduce((total, item) => total + item.runs_scored, 0);

                    tooltip
                        .style("visibility", "visible")
                        .html(`
                            <strong>Category:</strong> ${d.category}<br>
                            <strong>Current Season Matches:</strong> ${currentSeasonMatches}<br>
                            <strong>Runs Scored in the Season:</strong> ${currentSeasonRuns}<br>
                            <strong>Overall matches in Category:</strong> ${histogram_categoryTotal}
                        `)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY - 30}px`);

                    showTooltip(event, d, currentSeasonMatches, currentSeasonRuns, histogram_categoryTotal);
                })
                .on("mousemove", function (event) {
                    tooltip
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY - 30}px`);
                })
                .on("mouseout", function () {
                    d3.selectAll(".bar")
                        .attr("stroke", "none")
                        .attr("stroke-width", 0);

                    tooltip.style("visibility", "hidden");
                });
                popUpViz_svg.append("text")
                .attr("class", "x-axis-label")
                .attr("x", histogram_width / 2)
                .attr("y", histogram_height + histogram_margin.bottom - 10)
                .style("text-anchor", "middle")
                .text("Years");

                            popUpViz_svg.append("text")
                .attr("class", "y-axis-label")
                .attr("x", -histogram_height / 2)
                .attr("y", -histogram_margin.left + 15)
                .attr("transform", "rotate(-90)")
                .style("text-anchor", "middle")
                .text("Frequency");


            function showTooltip(event, d, currentSeasonMatches, currentSeasonRuns, histogram_categoryTotal) {
                tooltip.style("display", "block")
                    .html(`
    <strong>Category:</strong> ${d.category}<br>
    <strong>Current Season Matches:</strong> ${currentSeasonMatches}<br>
    <strong>Runs Scored in the Season:</strong> ${currentSeasonRuns}<br>
    <strong>Overall matches in Category:</strong> ${histogram_categoryTotal}
  `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY + 10}px`);
            }

            const histogram_categories = ["0-10", "11-49", "50-99", "100+"]; 
            console.log("checking the line");
            const histogram_legend = popUpViz_svg.append("g").attr("class", "legend")
                .attr("transform", `translate(${histogram_width - 10}, 5)`)

            const totalMatches = histogram_batsmanData.length;

            histogram_legend.append("g")
                .attr("class", "legend-item")
                .attr("transform", `translate(0, 0)`) 
                .append("text")
                .attr("x", 0)
                .attr("y", 15)
                .style("font-size", "10px")
                .style("font-weight", "bold")
                .text(`Total Matches Played: ${totalMatches}`);

            histogram_categories.forEach((category, i) => {
                const histogram_legendRow = histogram_legend.append("g").attr("class", "legend")
                    .attr("transform", `translate(0, ${(i + 1) * 20})`);  

                histogram_legendRow.append("rect")
                    .attr("width", 10)
                    .attr("height", 10)
                    .attr("fill", histogram_colorMap[category]);

                histogram_legendRow.append("text")
                    .attr("x", 14)
                    .attr("y", 8.5)
                    .attr("text-anchor", "start")
                    .style("font-size", "15px")
                    .text(category);
            });
        }

        d3.select("#batsman-input").on("input", function () {
            const histogram_batsman = d3.select(this).property("value");
            if (histogram_batsmen.includes(histogram_batsman)) {
                histogram_updateChart(histogram_batsman);
            } else {
                console.warn("Invalid batsman selected");
            }
        });

        histogram_updateChart(playerData[1]);
    }).catch(error => {
        console.error("Error loading the data:", error);
    });

}