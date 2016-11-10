"use strict";

module.exports = function(RED) {
	function PeriodicNode(config) {
		RED.nodes.createNode(this, config);

		var interval = (config.interval * 1000) || 60000;
		var timer = setInterval(() => {
			this.send(config.topic ? { topic: config.topic } : {});
		}, interval);

		this.on('close', () => {
			clearInterval(timer);
		});
	}
	RED.nodes.registerType("periodic", PeriodicNode);
};