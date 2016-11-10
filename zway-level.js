"use strict";

module.exports = function(RED) {
	function ZWayLevelNode(config) {
		RED.nodes.createNode(this, config);
		this.server = RED.nodes.getNode(config.server);

		this.on("input", (msg) => {
			if (!this.server) {
				this.status({fill: "red", shape: "ring", text: "no server"});
				return this.error("No Z-Way server configuration");
			}

			var device = config.device || msg.device || "";

			var path = "devices/" + device;

			this.server.sendCommand(this, path, (err, data) => {
				if (err) {
					this.status({fill: "gray", shape: "dot", text: "level: unknown"});
					return this.error(err);
				}
				try {
					var on = data.payload.data.metrics.level == "on";
					if (on) {
						this.status({fill: "yellow", shape: "dot", text: "level: on"});
					}
					else {
						this.status({fill: "blue", shape: "dot", text: "level: off"});
					}
					this.send({ payload: on ? 1 : 0 });
				}
				catch (ex) {
					this.status({fill: "red", shape: "ring", text: "invalid response"});
					return this.error("Unable to read device level");
				}
			});
		});
	}
	RED.nodes.registerType("zway-level", ZWayLevelNode);
};