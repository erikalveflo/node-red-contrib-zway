"use strict";

var mustache = require("mustache");

module.exports = function(RED) {
	function ZWayMetricNode(config) {
		RED.nodes.createNode(this, config);
		this.server = RED.nodes.getNode(config.server);

		this.on("input", (msg) => {
			if (!this.server) {
				node.status({fill: "red", shape: "ring", text: "no server"});
				return this.error("No Z-Way server configuration");
			}

			var device = config.device || msg.device || "";

			var metric = config.metric || "other";
			if (metric == "other" || metric == "exact" || metric == "exactSmooth") {
				metric = config.metricOther;
			}
			if (!metric) {
				metric = msg.metric || "";
				if (metric.indexOf("{{") != -1) {
					metric = mustache.render(metric, msg);
				}
			}

			var path = "devices/" + device;

			this.server.sendCommand(this, path, (err, data) => {
				if (err) {
					return this.error(err);
				}
				try {
					var metrics = data.data.metrics;
					var value = (metrics.hasOwnProperty(metric) ? metrics[metric] : "") || "";

					this.status({fill: "yellow", shape: "dot", text: metric + ": " + value});
					msg.payload = value;
					this.send(msg);
				}
				catch (ex) {
					this.status({fill: "red", shape: "ring", text: "invalid response"});
					return this.error("Unable to read device metric: " + ex);
				}
			});
		});
	}
	RED.nodes.registerType("zway-metric", ZWayMetricNode);
};