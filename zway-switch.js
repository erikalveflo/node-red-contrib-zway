"use strict";

module.exports = function(RED) {
	function ZWaySwitchNode(config) {
		RED.nodes.createNode(this, config);
		this.server = RED.nodes.getNode(config.server);

		this.on("input", (msg) => {
			if (!this.server) {
				node.status({fill: "red", shape: "ring", text: "no server"});
				return this.error("No Z-Way server configuration");
			}

			var device = config.device || msg.device || "";

			var level = config.level || msg.level || "";
			level = level.toLowerCase() == "on" ? "on" : "off";

			var path = "devices/" + device + "/command/" + level;

			this.server.sendCommand(this, path, (err, data) => {
				if (err) {
					return this.error(err);
				}
				return this.send(data);
			});
		});
	}
	RED.nodes.registerType("zway-switch", ZWaySwitchNode);
};