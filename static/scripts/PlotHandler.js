import { addNewOutputEntry } from "./workspace";

class PlotHandler {
    constructor() {
        this.plotMap = new Map();
    }
    //the data forwarded contains a single object of type {yValue,datasetNumber,plotName,plotType}
    //because of the message handling this object is the first element of the data-array
    //forward the data to the correct PlotWorker or create one if necessary 
    updateValue(data) {
        let plotName = data.plotName;
        let requestedPlot = this.plotMap.get(plotName);
        if (!requestedPlot) {
            requestedPlot = new PlotWorker(plotName, data.plotType);
            this.plotMap.set(plotName, requestedPlot);
        }
        requestedPlot.updateValue(data);
    }

    drawPlots() {
        this.plotMap.forEach((plot) => plot.drawPlot());
    }

    clearPlots() {
        this.plotMap = new Map();
    }

    getPlotData() {
        let plotData = [];
        this.plotMap.forEach((plot) => {
            plotData.push(plot.getPlotData());
        });
        return plotData;
    }
}

class PlotWorker {
    constructor(name, plotType) {
        this.plotName = name;
        this.plotData = new Map();
        this.plotType = plotType;
        this.myChart = null;
        this.chartExists = false;
        this.labels = [1];
        this.iteration = 0;
        let divString = `<canvas id="plot-${name}"></canvas>`;
        addNewOutputEntry(
            divString,
            name,
            name
        );
        let canvasID = 'plot-' + name;
        this.chartArea = document.getElementById(canvasID).getContext('2d');
    }

    //collect data during runtime 
    updateValue(data) {
        let datasetName = data.datasetNumber;
        if (this.iteration > 0) {
            // new runs produce new datasets which can be distinguished by their ending 
            datasetName += "_" + this.iteration;
        }
        let dataset = this.plotData.get(datasetName);
        if (!dataset) {
            dataset = {
                label: 'Dataset' + datasetName,
                backgroundColor: random_rgba(),
                data: [data.yValue],
            }
            this.plotData.set(datasetName, dataset);
        } else {
            dataset.data.push(data.yValue);
            if (dataset.data.length > this.labels.length) {
                this.labels.push(dataset.data.length);
            }
        }
    }

    drawPlot() {
        this.iteration++;
        if (!this.chartExists) {

            let testplotData = {
                labels: this.labels,
                datasets: Array.from(this.plotData.values()),
            };
            const config = {
                type: this.plotType,
                data: testplotData,
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: this.plotName
                        }
                    },
                },
            };

            this.myChart = new Chart(//eslint-disable-line no-undef -- is defined in block code
                this.chartArea,
                config
            );
            this.chartExists = true;
        } else {
            this.myChart.data.datasets = Array.from(this.plotData.values());
            this.myChart.update();
        }
        return;
    }

    //Downloading the Plotdata as CSV: 
    //Each line represents one Dataset where the first element is its name. 
    getPlotData() {
        //returns {title : plotTitle, data: csvString}
        let csvString = "";
        let csvLines = [];
        this.plotData.forEach( (dataset) => {
            let line = dataset.label + "," + dataset.data.join(",");
            csvLines.push(line); 
        });
        csvString = csvLines.join("\n"); 
        return { title: this.plotName, data: csvString };
    }
}

var plotHandler = new PlotHandler();

function updateValue(data) {
    plotHandler.updateValue(data);
}

function drawPlots() {
    plotHandler.drawPlots();
}

function clearPlots() {
    plotHandler.clearPlots();
}

function getPlotData() {
    return plotHandler.getPlotData();
}

//use a random color for every dataset for now 
// after the PR for the new color scheme is completed, the plots colors will be based on that
function random_rgba() {
    var o = Math.round, r = Math.random, s = 255;
    return 'rgba(' + o(r() * s) + ',' + o(r() * s) + ',' + o(r() * s) + ',' + r().toFixed(1) + ')';
}

export { updateValue, drawPlots, clearPlots, getPlotData }; 