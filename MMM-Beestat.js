'use strict';


Module.register("MMM-Beestat", {
    hist: [],
    // Default module config.
    defaults: {
        updateInterval: 360 * 60 * 1000, // every 6 hours
        url: 'https://beestat.io/api/?api_key=',
        api_key: "", //request it from beestat
        ecobee_thermostat_id: 0, //via &resource=ecobee_thermostat&method=read_id
        time_period: "month",
        time_count: 3,
        group_by: "day",
        width: 300,
        height: 200,
        fadeSpeed: 2000,
        chart_title: "Last 3 months runtime"
    },

    getStyles: function() {
        return ["MMM-Beestat.css"];
    },

    getScripts: function() {
        return ["modules/" + this.name + "/node_modules/chart.js/dist/Chart.bundle.min.js"];
    },
    
    start: function() {
        this.loaded_history = false;
        this.getData();
        this.scheduleUpdate();
    },

    // Override dom generator.
    getDom: function() {
        const outerWrapper = document.createElement("beestat");
        const demandWrapper = document.createElement("div");
        const chartWrapper = document.createElement("div");
        chartWrapper.setAttribute("style", "position: relative; display: inline-block;");

        if (!this.loaded_history) {
            outerWrapper.innerHTML = this.translate("LOADING");
            outerWrapper.className = "dimmed light small";
            return outerWrapper;
        }

        demandWrapper.className = 'medium bright';

        if (this.hist) {
            // Create chart canvas
            const chartCanvas  = document.createElement("canvas");
                        
            var arrHeat = [];
            var arrCool = [];
            var arrLabels = []; //later set to blanks so the graph plots the points

            for (var i = 0; i < this.hist.data.length; i++) {
                var heatRuntime = 0;
                var coolRuntime = 0;

                //heat
                if (this.hist.data[i].auxiliary_heat_1 > 0) {
                    heatRuntime += this.hist.data[i].auxiliary_heat_1 / 3600;
                }
                if (this.hist.data[i].auxiliary_heat_2 > 0) {
                    heatRuntime += this.hist.data[i].auxiliary_heat_2 / 3600;
                }
                if (this.hist.data[i].auxiliary_heat_3 > 0) {
                    heatRuntime += this.hist.data[i].auxiliary_heat_3 / 3600;
                }
                if (this.hist.data[i].compressor_heat_1 > 0) {
                    heatRuntime += this.hist.data[i].compressor_heat_1 / 3600;
                }
                if (this.hist.data[i].compressor_heat_2 > 0) {
                    heatRuntime += this.hist.data[i].compressor_heat_2 / 3600;
                }

                //cool
                if (this.hist.data[i].compressor_cool_1 > 0) {
                    coolRuntime += this.hist.data[i].compressor_cool_1 / 3600;
                }
                if (this.hist.data[i].compressor_cool_2 > 0) {
                    coolRuntime += this.hist.data[i].compressor_cool_2 / 3600;
                }

                if (heatRuntime > 0) {
                    arrHeat.push(heatRuntime);
                } else {
                    arrHeat.push(0);
                }
                if (coolRuntime > 0) {
                    arrCool.push(coolRuntime);
                } else {
                    arrCool.push(0);
                }

                arrLabels.push('');
            }
            
            var chartconfig = {
                type: 'bar',
                data: {
                    labels: arrLabels,
                    datasets: [{
                        backgroundColor: "#fd9644",
                        data: arrHeat
                    },
                    {
                        backgroundColor: "#45aaf2",
                        data: arrCool
                    }]
                },
                options: {
                    scales: { xAxes: [{ stacked: true }], yAxes: [{ stacked: true }] },
                    elements: { point: { radius: 0 } }, 
                    legend: { display: false },
                    title: { display: true, text: this.config.chart_title, padding: 5 }
                }
            };
            
            this.chart = new Chart(chartCanvas.getContext("2d"), chartconfig);
            chartCanvas.width  = this.config.width;
            chartCanvas.height = this.config.height;
            chartCanvas.setAttribute("style", "width: " + this.config.width + "; height: " + this.config.height+";");
            
            // Append chart
            chartWrapper.appendChild(chartCanvas);
        
            outerWrapper.appendChild(demandWrapper);
            outerWrapper.appendChild(chartWrapper);
        }

        return outerWrapper;
    },

    scheduleUpdate: function(delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }

        var self = this;
        setInterval(function() {
            self.getData();
        }, nextLoad);
    },

    getData: function () {
        var url = this.config.url + this.config.api_key + '&resource=ecobee_runtime_thermostat&method=get_aggregate_runtime&arguments={"ecobee_thermostat_id":'+this.config.ecobee_thermostat_id+',"time_period":"'+this.config.time_period+'","time_count":'+this.config.time_count+',"group_by":"'+this.config.group_by+'"}';

        this.sendSocketNotification('beestat_runtime', url);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "beestat_runtime") {
            this.hist = payload;
            this.loaded_history = true;
        }

        //display only when data is loaded
        if (this.loaded_history) {
            this.updateDom(this.config.fadeSpeed);
        }
    },
});