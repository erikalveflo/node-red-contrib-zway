"use strict";

var mustache = require("mustache");

module.exports = function(RED) {
	function ZWayApiNode(config) {
		RED.nodes.createNode(this, config);
		this.server = RED.nodes.getNode(config.server);

		this.on("input", (msg) => {
			if (!this.server) {
				node.status({fill: "red", shape: "ring", text: "no server"});
				return this.error("No Z-Way server configuration");
			}

			var path = config.path || msg.path;
			if (path.indexOf("{{") != -1) {
				path = mustache.render(path, msg);
			}

			this.server.sendCommand(this, path, (err, data) => {
				if (err) {
					return this.error(err);
				}
				msg.payload = data;
				return this.send(msg);
			});
		});
	}
	RED.nodes.registerType("zway-api", ZWayApiNode);
}