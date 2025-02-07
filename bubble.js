let data, attr;
let color_index = 2;
let size_index = 7;
let y_index = 11;
let selectedData = [];
setDataset("data/dataset.csv");

const popUpVizWidth = 650,
    popUpVizHeight = 450;
let popUpViz_svg;

let popupButton = document.getElementById("popup-button");

let selectedPlayer;
// popupButton.addEventListener("click", function () {
//     if (popupButton.innerText === "Show Bowling Stats") {
//         popupButton.innerText = "Show Batting Stats";
//     } else {
//         popupButton.innerText = "Show Bowling Stats";
//     }
// });

const tooltip = d3.select("body")
    .append("div")
    .attr("id", "tooltip-card")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "8px")
    .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")
    .style("padding", "10px")
    .style("visibility", "hidden")
    .style("z-index", 20);

function setDataset(e) {
    console.log(e)
    fetch(e)
        .then(response => {
            return response.text();
        })
        .then(d => {
            console.log(d);
            let rows = d.split('\n');
            let csvData = rows.map(row => row.split(','));
            csvData.pop();
            [attr, ...data] = csvData;
            console.log(typeof data[1][color_index]);
            drawPlot(data);
        })
}

function drawPlot(data){
    const width = 800;
    const height = 800;

    const tooltip = d3.select("body")
        .append("div")
        .attr("id", "tooltip-card")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ccc")
        .style("border-radius", "8px")
        .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")
        .style("padding", "10px")
        .style("visibility", "hidden")
        .style("z-index", 10);

    const svg = d3.select("#plot")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const colorScale = d3.scaleSequential(d3.interpolateInferno).domain([d3.min(data, d => Number(d[color_index])), d3.max(data, d => Number(d[color_index]))]) ;

    const sizeScale = d3.scaleLinear()
        .domain([d3.min(data, d => Number(d[size_index])), d3.max(data, d => Number(d[size_index]))]) 
        .range([5, 45]); 
    
    const dropdown = d3.select("#player-select");
    data.forEach(d => {
        dropdown.append("option")
            .attr("value", d[1]) 
            .text(d[1]);
    });

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => Number(d[y_index])), d3.max(data, d => Number(d[y_index]))]) 
        .range([height-100, 50]);
        // .range([100, height - 50]); 

    const simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(width / 2).strength(0.1)) 
        .force("y", d3.forceY(d => yScale(d[y_index])).strength(1))
        .force("collision", d3.forceCollide(d => sizeScale(d[size_index]) + 2)) 
        .on("tick", ticked);

    const bubbles = svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", d => sizeScale(d[size_index])) 
        .style("fill", d => colorScale(d[color_index])) 
        .style("opacity", 0.8)
        .on("click", function (event, d) {
            togglePlayer(d);
            showPopup(d)
        })
        .on("mouseover", function (event, d) {
            tooltip
                .style("visibility", "visible")
                .html(`
                    <strong style="font-size: 24px">${d[1]}</strong> <br>
                    <strong>Total score:</strong> ${d[7]}<br>
                    <strong>Strike rate:</strong> ${d[2]}<br>
                    <strong>Batting average:</strong> ${d[11]}<br>
                    <strong>Balls faced:</strong> ${d[8]}
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
        });

    function togglePlayer(d) {

        svg.selectAll("circle").classed("selected", false);

        selectedData = [];

        const circle = svg.selectAll("circle").filter(b => b === d);
        if (!circle.empty()) {
            selectedData.push(d);
            circle.classed("selected", true);
        }
        
        // const circle = svg.selectAll("circle").filter(b => b === d);
        // const isSelected = selectedData.includes(d);

        // if (isSelected) {
        //     selectedData = selectedData.filter(item => item !== d);
        //     circle.classed("selected", false);
        // } else {
        //     selectedData.push(d);
        //     circle.classed("selected", true);
        // }

        // updatePlayerList();
    }

    dropdown.on("change", function () {
        const selectedName = this.value;
        const player = data.find(d => d[1] === selectedName);
        console.log(player)
        if (player) {
            togglePlayer(player);
        }
    });

    function ticked() {
        bubbles
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    // function updatePlayerList() {
    //     const list = d3.select("#player-list");

    //     const items = list.selectAll("li")
    //         .data(selectedData, d => d[0]);

    //     const newItems = items.enter()
    //         .append("li")
    //         .attr("class", "bubble_player_list_item")
    //         .text(d => d[1])
    //         .style("color", "blue")

    //     newItems.append("button")
    //         .text("✖")
    //         .style("margin-left", "10px")
    //         .on("click", (event, d) => {
    //             togglePlayer(d);
    //         });

    //     items.exit().remove();
    // }

    const legendWidth = 300;
    const legendHeight = 10;

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${width - legendWidth - 50}, ${40})`);

    const defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
        .attr("id", "color-gradient");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d3.interpolateInferno(0));

    gradient.append("stop")
        .attr("offset", "10%")
        .attr("stop-color", d3.interpolateInferno(0.1));

    gradient.append("stop")
        .attr("offset", "20%")
        .attr("stop-color", d3.interpolateInferno(0.20));

    gradient.append("stop")
        .attr("offset", "30%")
        .attr("stop-color", d3.interpolateInferno(0.30));
    
    gradient.append("stop")
        .attr("offset", "40%")
        .attr("stop-color", d3.interpolateInferno(0.40));

    gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", d3.interpolateInferno(0.5)); 

    gradient.append("stop")
        .attr("offset", "60%")
        .attr("stop-color", d3.interpolateInferno(0.60));

    gradient.append("stop")
        .attr("offset", "70%")
        .attr("stop-color", d3.interpolateInferno(0.70)); 
    
    gradient.append("stop")
        .attr("offset", "80%")
        .attr("stop-color", d3.interpolateInferno(0.80));

    gradient.append("stop")
        .attr("offset", "90%")
        .attr("stop-color", d3.interpolateInferno(0.90));

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d3.interpolateInferno(1)); 

    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#color-gradient)")
        .style("stroke", "#ccc")
        .style("stroke-width", "1");

    const minValue = d3.min(data, d => Number(d[color_index]));
    const maxValue = d3.max(data, d => Number(d[color_index]));

    legendGroup.append("text")
        .attr("x", 0)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text(minValue);

    legendGroup.append("text")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text(maxValue);

    legendGroup.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Color Intensity");

    const popup = document.getElementById("popup");
    const popupClose = document.getElementById("popup-close");
    const popupTitle = document.getElementById("popup-title");
    // const popupVisualizations = document.getElementById("popup-visualizations");

    function showPopup(playerData) {
        let popupButton = document.getElementById("popup-button");
        popupButton.innerText = "Show Bowling Stats";
        drawHistogram(playerData, tooltip);
        selectedPlayer = playerData;
        popup.classList.remove("hidden");
    }

    function hidePopup() {
        popup.classList.add("hidden");
    }

    popupClose.addEventListener("click", hidePopup);
    popup.addEventListener("click", (event) => {
        if (event.target === popup) hidePopup(); 
    });


}

function popUpButtonClick(event){
    let popUpButton = document.getElementById("popup-button");
    console.log(event.target.innerText);
    if (event.target.innerText === "Show Bowling Stats"){
        popUpButton.innerText = "Show Batting Stats";
        console.log("entered");
        drawPieChart(selectedPlayer, tooltip);
    }
    else{
        popUpButton.innerText = "Show Bowling Stats";
        drawHistogram(selectedPlayer, tooltip);
    }
}