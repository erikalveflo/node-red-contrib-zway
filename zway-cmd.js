"use strict";

var mustache = require("mustache");

module.exports = function(RED) {
	function ZWayCmdNode(config) {
		RED.nodes.createNode(this, config);
		this.server = RED.nodes.getNode(config.server);

		this.on("input", (msg) => {
			if (!this.server) {
				node.status({fill: "red", shape: "ring", text: "no server"});
				return this.error("No Z-Way server configuration");
			}

			var device = config.device || msg.device || "";
			var command = config.command || msg.command || "";
			if (command.indexOf("{{") != -1) {
				command = mustache.render(command, msg);
			}

			var path = "devices/" + device + "/command/" + command;

			this.server.sendCommand(this, path, (err, data) => {
				if (err) {
					return this.error(err);
				}
				//return this.send(data);
			});
		});
	}
	RED.nodes.registerType("zway-cmd", ZWayCmdNode);
};