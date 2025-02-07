function compareAllButtonClick(event){
    let popupButton = document.getElementById("compare-all-popup");
    // drawHistogram(playerData, tooltip);
    // selectedPlayer = playerData;
    const popup = document.getElementById("compare-all-popup");
    const popupClose = document.getElementById("compare-all-popup-close");
    popup.classList.remove("hidden");
    let graphContainerId = 'radar_graph';
    function hidePopup() {
            popup.classList.add("hidden");
            const checkboxes = document.querySelectorAll('#radar_dropdown-content input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            const radarChartContainer = document.getElementById('radar_graph');
            radarChartContainer.innerHTML = '';


    }
    popupClose.addEventListener("click", hidePopup);
    popup.addEventListener("click", (event) => {
        if (event.target === popup) hidePopup(); 
    });

    const dropdownContent = document.getElementById('radar_dropdown-content');
    const graphContainer = document.getElementById('radar_graph');

    d3.select(graphContainer).selectAll('svg').remove();

    let width = 800,
        height = 400,
        size = 400,
        NUM_OF_SIDES = 5,
        NUM_OF_LEVEL = 5,
        offset = Math.PI,
        polyangle = (Math.PI * 2) / NUM_OF_SIDES,
        r = 0.8 * size,
        r_0 = r / 2,
        center = {
            x: size / 2,
            y: size / 2
        };

    var datasets = [];
    var playerColors;

    d3.csv('data/final_df.csv').then(datasetInput => {
        const playerSet = new Set(datasetInput.map(d => d.striker));
        playerSet.forEach(player => {
            const label = document.createElement('label');
            label.innerHTML = `
                <input type="checkbox" value="${player}"> ${player}
            `;
            dropdownContent.appendChild(label);
        });

        let selectedPlayers = new Set();

        dropdownContent.addEventListener('change', (event) => {
            const checkbox = event.target;
            if (checkbox.checked) {
                selectedPlayers.add(checkbox.value);
            } else {
                selectedPlayers.delete(checkbox.value);
            }

            datasets = [];

            selectedPlayers.forEach(player => {
                datasetInput.forEach(datasetPlayer => {
                    if (datasetPlayer.striker === player) {
                        let tempObj = {};
                        tempObj.name = player;
                        tempObj.data = [
                            { "name": "strike_rate", "value": parseFloat(datasetPlayer.strike_rate) },
                            { "name": "half_centuries", "value": parseInt(datasetPlayer.half_centuries) },
                            { "name": "centuries", "value": parseInt(datasetPlayer.centuries) },
                            { "name": "boundary_percentage", "value": parseFloat(datasetPlayer.boundary_percentage) },
                            { "name": "normal_runs", "value": parseFloat(datasetPlayer.normal_runs) }
                        ];
                        datasets.push(tempObj);
                    }
                });
            });

            playerColors = d3.scaleOrdinal()
                .domain(Array.from(new Set(datasets.map(dataset => dataset.name))))
                .range(d3.schemeCategory10);

            drawRadarChart();
            updateLegend();
        });
    });

    function drawRadarChart() {
        d3.select(graphContainer).selectAll('svg').remove();

        if (datasets.length === 0) return;

        const wrapper = d3.select(`#${graphContainerId}`)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = wrapper.append('g');
        const legendGroup = wrapper.append('g')
            .attr('id', 'legend')
            .attr('transform', `translate(${width - 250}, 20)`);

        const parameterMaxValues = datasets[0].data.map((_, i) =>
            Math.max(...datasets.map(dataset => dataset.data[i].value))
        );
        const parameterScales = parameterMaxValues.map(maxValue =>
            d3.scaleLinear().domain([0, maxValue]).range([0, r_0])
        );

        const drawPath = (points, parent) => {
            const lineGenerator = d3.line()
                .x(d => d.x)
                .y(d => d.y);

            parent.append("path")
                .attr("d", lineGenerator(points))
                .attr('stroke', '#B0B0B0')
                .attr('fill', 'none');
        };

        const generatePoint = ({ length, angle }) => ({
            x: center.x + (length * Math.sin(offset - angle)),
            y: center.y + (length * Math.cos(offset - angle))
        });

        const generateAndDrawLevels = (levelsCount, sideCount) => {
            const group = g.append("g").attr("class", "levels");
            for (let level = 1; level <= levelsCount; level++) {
                const hyp = (level / levelsCount) * r_0;
                const points = [];
                for (let vertex = 0; vertex < sideCount; vertex++) {
                    const theta = vertex * polyangle;
                    points.push(generatePoint({ length: hyp, angle: theta }));
                }
                drawPath([...points, points[0]], group);
            }
        };

        const generateAndDrawLines = (sideCount) => {
            const group = g.append("g").attr("class", "grid-lines");
            for (let vertex = 0; vertex < sideCount; vertex++) {
                const theta = vertex * polyangle;
                const point = generatePoint({ length: r_0, angle: theta });
                drawPath([center, point], group);
            }
        };

        const drawData = (datasets, n) => {
            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
            const radar_tooltip = d3.select('#radar_tooltip');

           
            datasets.forEach((dataset, index) => {
                const points = dataset.data.map((d, i) => {
                    const scale = parameterScales[i];
                    const len = scale(d.value);
                    const theta = i * (2 * Math.PI / n);

                    return generatePoint({ length: len, angle: theta });
                });

                const group = g.append("g").attr("class", `shape ${dataset.name}`);

                group.append("path")
                    .attr("d", d3.line()
                        .x(d => d.x)
                        .y(d => d.y)([...points, points[0]]))
                    .attr("stroke", playerColors(dataset.name))
                    .attr("fill", playerColors(dataset.name))
                    .attr("fill-opacity", 0.25)
                    .attr("stroke-width", 0.5)
                    .attr("class", `player-path ${dataset.name}`)
                    .style("cursor", "pointer")
                    .on("click", () => {
                        selectedPlayer = dataset.name;

                        d3.selectAll(".player-path")
                            .attr("stroke-width", 1)
                            .attr("fill-opacity", 0.25);

                        d3.select(`.player-path.${dataset.name}`)
                            .attr("stroke-width", 3)
                            .attr("fill-opacity", 0.6);

                        const details = dataset.data.map(p => `<br>${p.name}: ${p.value}`).join('');
                        radar_tooltip.style("display", "block")
                            .html(`<strong>${dataset.name}</strong>${details}`);
                    });

                group.selectAll(".data-circle")
                    .data(points.map((point, i) => ({
                        ...point,
                        name: dataset.name,
                        parameter: dataset.data[i].name,
                        value: dataset.data[i].value
                    })))
                    .enter()
                    .append("circle")
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y)
                    .attr("r", 8) 
                    .attr("fill", colorScale(index));


                group.selectAll(".hover-circle")
                    .data(points.map((point, i) => ({
                        ...point,
                        name: dataset.name,
                        parameter: dataset.data[i].name,
                        value: dataset.data[i].value
                    })))
                    .enter()
                    .append("circle")
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y)
                    .attr("r", 12) 
                    .attr("fill", "transparent") 
                    .style("pointer-events", "all") 
                    .on("mouseover", (event, d) => {
                        radar_tooltip.style("display", "block")
                            .html(`<strong>${d.name}</strong><br>${d.parameter}: ${d.value}`);
                    })
                    .on("mousemove", (event) => {
                        const popup = document.getElementById("compare-all-popup-content"); 
                        const popupRect = popup.getBoundingClientRect(); 
                    
                        const tooltipWidth = radar_tooltip.node().offsetWidth;
                        const tooltipHeight = radar_tooltip.node().offsetHeight;
                    
                        const offsetX = 10; 
                        const offsetY = 10; 
                        const relativeX = event.clientX - popupRect.left + offsetX;
                        const relativeY = event.clientY - popupRect.top + offsetY;
                    
                        radar_tooltip
                            .style("left", `${Math.min(relativeX, popupRect.width - tooltipWidth - offsetX)}px`)
                            .style("top", `${Math.min(relativeY, popupRect.height - tooltipHeight - offsetY)}px`);
                    })
                    
                    
                    .on("mouseout", () => {
                        radar_tooltip.style("display", "none");
                    });


            });
        };

        const drawLabels = (sideCount) => {
            const groupL = g.append("g").attr("class", "labels");
            const labels = datasets[0].data.map(d => d.name);
            const distanceFactor = 1.09;
            for (let vertex = 0; vertex < sideCount; vertex++) {
                const angle = vertex * polyangle;
                const point = generatePoint({
                    length: r_0 * distanceFactor,
                    angle
                });

                const label = labels[vertex];
                groupL.append("text")
                    .attr("x", point.x)
                    .attr("y", point.y)
                    .html(label)
                    .style("text-anchor", "middle")
                    .attr("fill", "black")
                    .style("font-size", "12px")
                    .style("font-family", "sans-serif");
            }
        };
        const drawAxisLabels = (sideCount, ticks) => {
            const groupTicks = g.append("g").attr("class", "tick-values");
            const distanceFactor = 1.1;
            for (let vertex = 0; vertex < sideCount; vertex++) {
                const angle = vertex * polyangle;
                const parameterMax = parameterMaxValues[vertex];
                ticks[vertex].forEach((tickValue, i) => {
                    const r = (i / NUM_OF_LEVEL) * r_0;
                    const tickPoint = generatePoint({ length: r, angle: angle });

                    groupTicks.append("text")
                        .attr("x", tickPoint.x)
                        .attr("y", tickPoint.y)
                        .html(tickValue)
                        .style("text-anchor", "middle")
                        .attr("fill", "black")
                        .style("font-size", "10px")
                        .style("font-family", "sans-serif");
                });
            }
        };
        const genTicks = (maxValue, levels) => {
            const ticks = [];
            const step = maxValue / levels;
            for (let i = 0; i <= levels; i++) {
                const num = step * i;
                ticks.push(Number.isInteger(num) ? num : num.toFixed(2));
            }
            return ticks;
        };

        generateAndDrawLevels(NUM_OF_LEVEL, NUM_OF_SIDES);
        generateAndDrawLines(NUM_OF_SIDES);
        drawData(datasets, NUM_OF_SIDES);

        const ticksPerParameter = parameterMaxValues.map(maxValue =>
            genTicks(maxValue, NUM_OF_LEVEL)
        );


        drawLabels(NUM_OF_SIDES);
        drawAxisLabels(NUM_OF_SIDES, ticksPerParameter);
    }

    function updateLegend() {
        const legendGroup = d3.select('#legend');
        legendGroup.selectAll('*').remove();
    
        datasets.forEach((dataset, index) => {
            const legendItem = legendGroup.append('g')
                .attr('transform', `translate(100, ${index * 25})`)
                .style('cursor', 'pointer') 
                .on('mouseover', (event) => {
                    const popup = document.getElementById("compare-all-popup-content"); 
                    const popupRect = popup.getBoundingClientRect(); 
    
                    const tooltip = d3.select('#radar_tooltip');
                    const details = dataset.data.map(p => `<br><strong>${p.name}:</strong> ${p.value}`).join('');
                    tooltip
                        .style('display', 'block')
                        .html(`<strong>${dataset.name}</strong>${details}`);
                    
                    const offsetX = 10; 
                    const offsetY = 10; 
    
                    const relativeX = event.clientX - popupRect.left + offsetX; 
                    const relativeY = event.clientY - popupRect.top + offsetY;  
    
                   
                    tooltip
                        .style('left', `${Math.min(relativeX, popupRect.width - tooltip.node().offsetWidth - offsetX)}px`)
                        .style('top', `${Math.min(relativeY, popupRect.height - tooltip.node().offsetHeight - offsetY)}px`);
                })
                .on("mousemove", (event) => {
                    const radar_tooltip = ensureTooltipExists(); 
                
                    const popup = document.getElementById("compare-all-popup-content");
                    const popupRect = popup.getBoundingClientRect();
                
                    const tooltipWidth = radar_tooltip.node().offsetWidth;
                    const tooltipHeight = radar_tooltip.node().offsetHeight;
                
                    const offsetX = 10;
                    const offsetY = 10;
                
                    const relativeX = event.clientX - popupRect.left + offsetX;
                    const relativeY = event.clientY - popupRect.top + offsetY;
                
                    radar_tooltip
                        .style('left', `${Math.min(relativeX, popupRect.width - tooltipWidth - offsetX)}px`)
                        .style('top', `${Math.min(relativeY, popupRect.height - tooltipHeight - offsetY)}px`);
                })
                .on('mouseout', () => {
                    const radar_tooltip = ensureTooltipExists();
                    d3.select('#radar_tooltip').style('display', 'none');
                });
    
           
            legendItem.append('rect')
                .attr('width', 20)
                .attr('height', 20)
                .attr('fill', playerColors(dataset.name));
    
          
            legendItem.append('text')
                .attr('x', 30)
                .attr('y', 15)
                .text(dataset.name)
                .attr('font-size', '14px')
                .attr('fill', 'black');
        });
    }
    

    function ensureTooltipExists() {
        let tooltip = d3.select('#radar_tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body')
                .append('div')
                .attr('id', 'radar_tooltip')
                .style('position', 'absolute')
                .style('background', 'lightgrey')
                .style('padding', '8px')
                .style('border-radius', '5px')
                .style('font-size', '12px')
                .style('font-family', 'Arial, sans-serif')
                .style('pointer-events', 'none')
                .style('display', 'none');
        }
        return tooltip;
    }

}