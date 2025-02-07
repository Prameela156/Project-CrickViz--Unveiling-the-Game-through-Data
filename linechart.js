function compareYearlyButtonClick(event){
    const popup = document.getElementById("compare-yearly-popup");
    const popupClose = document.getElementById("compare-yearly-popup-close");
    popup.classList.remove("hidden");
    let graphContainerId = 'radar_graph';
    function hidePopup() {
        popup.classList.add("hidden");

    }
    popupClose.addEventListener("click", hidePopup);
    popup.addEventListener("click", (event) => {
        if (event.target === popup) hidePopup();
    });

    let battingdata = [];
    let bowlingdata = [];
    let selectedPlayers = [];
    const battingcache = {};
    const bowlingcache = {};
    const playerColors = d3.scaleOrdinal(d3.schemeCategory10);

    const margin = { top: 50, right: 30, bottom: 50, left: 50 };
    const width = 400 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const linesvg = d3.select("#linechart-container svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const areasvg = d3.select("#areachart-container svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const lineg = linesvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);



    const areag = areasvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(yScale);

    lineg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    lineg.append("g").attr("class", "y-axis");


    areag.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    areag.append("g").attr("class", "y-axis");

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.runs_scored))
        .curve(d3.curveMonotoneX);

    const wicketsArea = d3.area()
        .x(d => xScale(d.year))
        .y0(height)
        .y1(d => yScale(d.wickets));

    const runsArea = d3.area()
        .x(d => xScale(d.year))
        .y0(height)
        .y1(d => yScale(d.runs_conceded));

    const yearly_tooltip = d3.select("body").append("div")
        .attr("class", "yearly_tooltip")
        .style("position", "absolute")
        .style("z-index", 1000)
        .style("visibility", "hidden")
        .style("opacity", 0)
        .style("background-color", "rgba(0,0,0,0.7)")
        .style("color", "white")
        .style("padding", "5px")
        .style("border-radius", "5px");

    const playerDropdown = d3.select("#playerDropdown");
    const teamDropdown = d3.select("#teamDropdown");
    const addButton = d3.select("#addPlayerButton");
    const playerListContainer = d3.select("#legend-container");

    d3.csv("data/player_data.csv").then(loadedData => {
        battingdata = loadedData.map(d => ({
            batsman: d.batsman,
            batting_team: d.batting_team,
            match_id: d.match_id,
            bowling_team: d.bowling_team,
            runs_scored: +d.runs_scored,
            year: +d.year,
        }));

        console.log("Data loaded:", battingdata.slice(0, 5));

        populateDropdowns();
    });

    d3.csv("data/processed_bowling.csv").then(loadedData => {
        bowlingdata = loadedData.map(d => ({
            bowler: d.bowler,
            player_team: d.player_team,
            match_id: d.match_id,
            against_team: d.against_team,
            runs_conceded: +d.runs_conceded,
            wickets: +d.wickets,
            balls_bowled: +d.balls_bowled,
            year: +d.year,
        }));
        console.log("Data loaded:", bowlingdata.slice(0, 5));

        populateDropdowns();
    });

    function populateDropdowns() {
        const players = Array.from(new Set([
            ...battingdata.map(d => d.batsman),
            ...bowlingdata.map(d => d.bowler)
        ])).sort();
        playerDropdown.selectAll("option")
            .data(players)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        const teams = ["All Teams", ...new Set([
            ...battingdata.map(d => d.bowling_team),
            ...bowlingdata.map(d => d.against_team)
        ])].sort();
        teamDropdown.selectAll("option")
            .data(teams)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        console.log("Dropdowns populated:", { players, teams });
    }

    addButton.on("click", () => {
        const selectedPlayer = playerDropdown.property("value");
        if (!selectedPlayers.includes(selectedPlayer)) {
            selectedPlayers.push(selectedPlayer);
            console.log("Player added:", selectedPlayer);
            renderPlayerList();
            updateVisualization();
            // updateLegend();
        }
    });

    function renderPlayerList() {
        playerListContainer.html("");

        selectedPlayers.forEach(player => {
            const playerDiv = playerListContainer.append("div")
                .attr("class", "player-label");

            playerDiv.append("div")
                .attr("class", "legend-color")
                .style("background-color", playerColors(player));
            playerDiv.append("span").text(player);

            playerDiv.append("button")
                .text("x")
                .on("click", () => {
                    selectedPlayers = selectedPlayers.filter(p => p !== player);
                    console.log("Player removed:", player);

                    renderPlayerList();
                    updateVisualization(); 
                });
        });
    }

    function calculateStats(player, team) {
        const filteredData = getFilteredData("bat", player, team);

        const yearlyStats = filteredData.reduce((acc, curr) => {
            const existing = acc.find(d => d.year === curr.year);
            if (existing) {
                existing.runs_scored += curr.runs_scored;
            } else {
                acc.push({ player: curr.batsman, year: curr.year, runs_scored: curr.runs_scored, batting_team: curr.batting_team });
            }
            return acc;
        }, []);

        yearlyStats.sort((a, b) => a.year - b.year);

        console.log("Yearly Stats:", yearlyStats); 
        return yearlyStats;
    }

    function calculateAreaStats(player, team) {
        const filteredData = getFilteredData("ball", player, team);

        const aggregatedData = d3.rollups(
            filteredData,
            v => ({
                wickets: d3.sum(v, d => d.wickets),
                runs_conceded: d3.sum(v, d => d.runs_conceded)
            }),
            d => d.year
        ).map(([year, values]) => ({
            year: +year,
            wickets: values.wickets,
            runs_conceded: values.runs_conceded
        }));


        aggregatedData.sort((a, b) => a.year - b.year);

        console.log("Aggregated Area Stats:", aggregatedData); 
        return aggregatedData;
    }


    function getFilteredData(skill, player, team) {
        const cacheKey = `${player}-${team}`;
        if (skill === "bat") {
            if (battingcache[cacheKey]) {
                return battingcache[cacheKey]; 
            }

            const filteredData = battingdata
                .filter(d => d.batsman === player && (team === "AllTeams" || d.bowling_team === team))
                .map(d => ({
                    batsman: d.batsman,
                    batting_team: d.batting_team,
                    bowling_team: d.bowling_team,
                    runs_scored: d.runs_scored,
                    year: d.year
                }));

            battingcache[cacheKey] = filteredData; 
            console.log("Filtered batting Data:", filteredData); 
            return filteredData;
        } else {
            if (bowlingcache[cacheKey]) {
                return bowlingcache[cacheKey]; 
            }

            const filteredData = bowlingdata
                .filter(d => d.bowler === player && (team === "AllTeams" || d.against_team === team))
                .map(d => ({
                    bowler: d.bowler,
                    player_team: d.player_team,
                    against_team: d.against_team,
                    runs_conceded: d.runs_conceded,
                    wickets: d.wickets,
                    balls_bowled: d.balls_bowled,
                    year: d.year
                }));

            bowlingcache[cacheKey] = filteredData;
            console.log("Filtered bowling Data:", filteredData); 
            return filteredData;
        }
    }

    teamDropdown.on("change", () => {
        console.log("Team dropdown changed.");
        updateVisualization(); 
    });

    function updateVisualization() {
        const selectedTeam = teamDropdown.property("value");
        const stats = selectedPlayers.map(player => ({
            player,
            stats: calculateStats(player, selectedTeam),
        }));

        console.log("Visualization updated with stats:", stats);

        xScale.domain(d3.extent(battingdata, d => d.year));
        yScale.domain([0, d3.max(stats.flatMap(d => d.stats), d => d.runs_scored)]);

        lineg.select(".x-axis").call(xAxis);
        lineg.select(".y-axis").call(yAxis);

        lineg.selectAll(".x-axis-label").remove(); 
        lineg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .attr("text-anchor", "middle")
            .text("Year");

        lineg.selectAll(".y-axis-label").remove(); 
        lineg.append("text")
            .attr("class", "y-axis-label")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .text("Runs Scored");

        const lines = lineg.selectAll(".line").data(stats, d => d.player);


        lines.enter()
            .append("path")
            .attr("class", "line")
            .merge(lines)
            .transition().duration(500)
            .attr("fill", "none")
            .attr("stroke-width", 2)
            .attr("stroke", d => playerColors(d.player))
            .attr("d", d => line(d.stats));

        lines.exit().remove();

        const circles = lineg.selectAll(".circle-group").data(stats, d => d.player);

        const circleGroup = circles.enter()
            .append("g")
            .attr("class", "circle-group")
            .merge(circles);

        circleGroup.each(function (d) {
            const circleSelection = d3.select(this).selectAll(".data-point")
                .data(d.stats);

            circleSelection.enter()
                .append("circle")
                .attr("class", "data-point")
                .attr("r", 5)
                .attr("fill", playerColors(d.player))
                .merge(circleSelection)
                .transition().duration(500)
                .attr("cx", d => xScale(d.year))
                .attr("cy", d => yScale(d.runs_scored));

            circleSelection.exit().remove();
        });

        circles.exit().remove();

        lineg.selectAll(".data-point")
            .on("mouseover", function (event, d) {
                console.log("on hover -", d)
                d3.select(this).attr("r", 8)
                yearly_tooltip.style("opacity", 1)
                .style("visibility", "visible")
                .style("display", "block")
                .html(`
                    <strong>Player:</strong> ${d.player}<br>
                    <strong>Year:</strong> ${d.year}<br>
                    <strong>Runs:</strong> ${d.runs_scored}<br>
                    <strong>Played For:</strong> ${d.batting_team}
                `)
                .style("top", (event.pageY - 50) + "px")
                .style("left", (event.pageX + 10) + "px");
            })
            .on("mousemove", event => {
                yearly_tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + "px");
            })
            .on("mouseout", function () {
                d3.select(this).attr("r", 5);
                yearly_tooltip.style("opacity", 0)
                .style("visibility", "hidden")
                .style("display", "none");
            });

        // updateLegend();
        updateAreaGraph()
    }
    // function updateLegend() {
    //     const legendContainer = d3.select("#legend-container");

    //     legendContainer.selectAll("*").remove();

    //     selectedPlayers.forEach(player => {
    //         const legendItem = legendContainer.append("div")
    //             .attr("class", "legend-item");

    //         legendItem.append("div")
    //             .attr("class", "legend-color")
    //             .style("background-color", playerColors(player));

    //         legendItem.append("span")
    //             .text(player);
    //     });
    // }
    function updateAreaGraph() {
        const selectedTeam = teamDropdown.property("value");

        const areaStats = selectedPlayers.map(player => ({
            player,
            stats: calculateAreaStats(player, selectedTeam),
        }));

        console.log("Updating area graph with stats:", areaStats);

        const allYears = [...new Set(areaStats.flatMap(d => d.stats.map(s => s.year)))];
        xScale.domain(d3.extent(allYears));

        const maxWickets = d3.max(areaStats, d =>
            d3.max(d.stats, s => s.wickets)
        );
        const maxRunsConceded = d3.max(areaStats, d =>
            d3.max(d.stats, s => s.runs_conceded)
        );

        yScale.domain([-maxRunsConceded, maxWickets]);

        const zeroPosition = yScale(0); 
        areag.select(".x-axis")
            .transition()
            .duration(500)
            .attr("transform", `translate(0, ${zeroPosition})`) 
            .call(xAxis);

        areag.select(".y-axis")
            .transition()
            .duration(500)
            .call(yAxis);

        const wicketsArea = d3
            .area()
            .x(d => xScale(d.year))
            .y0(d => yScale(0))
            .y1(d => yScale(d.wickets));

        const runsArea = d3
            .area()
            .x(d => xScale(d.year))
            .y0(d => yScale(0))
            .y1(d => yScale(-d.runs_conceded)); 

        areag.selectAll(".x-axis-label").remove(); 
        areag.append("text")
            .attr("class", "x-axis-label")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .attr("text-anchor", "middle")
            .text("Year");

        areag.selectAll(".y-axis-label").remove(); 
        areag.append("text")
            .attr("class", "y-axis-label")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .text("Runs Conceded/ Wickets ");

        //     const wicketsArea = d3.area()
        //     .x(d => xScale(d.year))
        //     .y0(d => yScale(0))
        //     .y1(d => yScale(d.wickets));

        // const runsArea = d3.area()
        //     .x(d => xScale(d.year))
        //     .y0(d => yScale(0))
        //     .y1(d => yScale(-d.runs_conceded));

        const wicketsPaths = areag.selectAll(".wickets-area").data(areaStats, d => d.player);

        wicketsPaths
            .enter()
            .append("path")
            .attr("class", "wickets-area")
            .attr("fill", d => playerColors(d.player)) 
            .attr("opacity", 0.5)
            .merge(wicketsPaths)
            .transition()
            .duration(500)
            .attr("d", d => wicketsArea(d.stats));

        wicketsPaths.exit().remove();

        const runsPaths = areag.selectAll(".runs-area").data(areaStats, d => d.player);

        runsPaths
            .enter()
            .append("path")
            .attr("class", "runs-area")
            .attr("fill", d => playerColors(d.player)) 
            .attr("opacity", 0.3)
            .merge(runsPaths)
            .transition()
            .duration(500)
            .attr("d", d => runsArea(d.stats));

        runsPaths.exit().remove();

        console.log("Area graph updated successfully with x-axis at zero.");

        areag
            .selectAll(".wickets-area")
            .on("mouseover", function(event, d) {
                const year = Math.round(xScale.invert(event.offsetX)); // Get the year based on mouse position
                console.log("Mouseover on wickets area at offsetX:", event.offsetX, "Calculated year:", year);
    
                const stats = d.stats.find(s => s.year === year);
                if (stats) {
                    yearly_tooltip.style("opacity", 1)
                    .style("visibility", "visible")
                    .style("display", "block")
                        .html(`
                            <strong>Player:</strong> ${d.player}<br>
                            <strong>Wickets:</strong> ${stats.wickets}
                        `)
                        .style("top", (event.pageY) + "px")
                        .style("left", (event.pageX + 10) + "px");
                }
            })
            .on("mousemove", function(event) {
                yearly_tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + "px");
            })
            .on("mouseout", function() {
                yearly_tooltip.style("opacity", 0)
                .style("visibility", "hidden")
                .style("display", "none");
            });
    
        // Bind tooltips to the runs area paths
        areag
            .selectAll(".runs-area")
            .on("mouseover", function(event, d) {
                const year = Math.round(xScale.invert(event.offsetX)); // Get the year based on mouse position
                console.log("Mouseover on runs area at offsetX:", event.offsetX, "Calculated year:", year);
    
                const stats = d.stats.find(s => s.year === year);
                if (stats) {
                    yearly_tooltip.style("opacity", 1)
                        .style("visibility", "visible")
                        .style("display", "block")
                        .html(`
                            <strong>Player:</strong> ${d.player}<br>
                            <strong>Runs Conceded:</strong> ${stats.runs_conceded}
                        `)
                        .style("top", (event.pageY) + "px")
                        .style("left", (event.pageX + 10) + "px");
                }
            })
            .on("mousemove", function(event) {
                yearly_tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + "px");
            })
            .on("mouseout", function() {
                yearly_tooltip.style("opacity", 0)
                .style("visibility", "hidden")
                .style("display", "none");
            });

    }
}