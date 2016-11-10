"use strict";

const http = require("http");
const mustache = require("mustache");

module.exports = function(RED) {
	function ZWayServerNode(config) {
		RED.nodes.createNode(this, config);

		this.host = config.host;
		this.port = config.port;
		this.username = this.credentials.username;
		this.password = this.credentials.password;
		this.sessionId = "";

		this.requestOptions = (path) => {
			return {
				host: this.host,
				port: this.port,
				path: "/ZAutomation/api/v1/" + (path || "").trimLeft("/"),
				headers: {
					"cookie": "ZWAYSession=" + this.sessionId
				}
			};
		};

		this.errorStatus = (node, text) => {
			node.status({fill: "red", shape: "ring", text: text});
		};

		this.infoStatus = (node, text) => {
			node.status({fill: "green", shape: "dot", text: text});
		};

		this.warnStatus = (node, text) => {
			node.status({fill: "yellow", shape: "dot", text: text});
		};

		this.authenticate = (node, cb) => {
			var postData = JSON.stringify({
				"login": this.username,
				"password": this.password,
			});

			this.sessionId = ""; // We are creating a new session ID.

			var options = this.requestOptions("login");
			options.method = "POST";
			options.headers = Object.assign(options.headers, {
				"content-type": "application/json; charset=utf-8",
				"content-length": Buffer.byteLength(postData),
			});

			var req = http.request(options, (res) => {
				if (res.statusCode == 401) {
					this.errorStatus(node, "wrong user/pass");
					return cb("Incorrect credentials");
				}
				else if (res.statusCode == 200) {
					res.setEncoding("utf8");
					var rawData = "";

					res.on("data", (chunk) => rawData += chunk);
					res.on("end", () => {
						try {
							var parsedData = JSON.parse(rawData);
							this.sessionId = parsedData.data.sid;
							node.log("Session ID: " + this.sessionId);
							return cb(null);
						} catch (e) {
							this.errorStatus(node, "invalid json");
							return cb("Invalid JSON in response: " + e.message + "\nBody: " + rawData, {});
						}
					});
				} else {
					return cb("Status code: " + res.statusCode);
				}
			});

			req.on("error", (e) => {
				this.errorStatus(node, "invalid request");
				return cb(e.message);
			});

			req.write(postData);
			req.end();
		};

		this._sendCommand = (node, path, cb) => {
			var options = this.requestOptions(path || "");
			http.get(options, (res) => {
				if (res.statusCode == 401) {
					return cb("Incorrect credentials", {});
				}

				res.setEncoding("utf8");
				var rawData = "";

				res.on("data", (chunk) => rawData += chunk);
				res.on("end", () => {
					try {
						var parsedData = JSON.parse(rawData);
						return cb(null, parsedData);
					} catch (e) {
						this.errorStatus(node, "invalid json");
						return cb("Invalid JSON in response: " + e.message + "\nBody: " + rawData, {});
					}
				});
			}).on("error", (e) => {
				this.errorStatus(node, "invalid request");
				return cb("Error with request: " + e.message, {});
			});
		};

		this.sendCommand = (node, path, cb) => {
			path = path || "";

			this.infoStatus(node, "sending...");
			node.log("Sending command: " + path);

			this._sendCommand(node, path, (err, data) => {
				if (!err) {
					node.status({});
					return cb(null, data);
				}

				this.warnStatus(node, "authenticating...");
				node.log("Authenticating...");
				this.authenticate(node, (err) => {
					if (err) {
						return cb("Unable to authenticate: " + err, {});
					}

					this.infoStatus(node, "sending...");
					node.log("Authentication OK");
					this._sendCommand(node, path, (err, data) => {
						if (err) {
							return cb("Unable to send command: " + err, {});
						}

						node.status({});
						return cb(null, data);
					});
				});
			});
		};

		RED.httpNode.get("/zway-devices", (req, res) => {
			this.sendCommand(this, "devices", (err, data) => {
				if (err) {
					return res.sendStatus(500);
				}

				var list = data.data.devices;
				var devices = [];
				for (var d in list) {
					d = list[d];
					devices.push({
						id: d.id,
						type: d.deviceType,
						level: d.metrics.level,
						title: d.metrics.title,
					});
				}

				var template =`
					<label for="list"><i class="fa fa-list"></i> Device list</label>
					<ul id="list">
						{{#devices}}
						<li>
							<a href="#" onclick="$('#node-input-device').val('{{id}}')">
								{{title}} ({{id}}) {{type}}
							</a>
						</li>
						{{/devices}}
					</ul>`;

				res.send(mustache.render(template, {devices: devices}));
			});
		});
	}
	RED.nodes.registerType("zway-server", ZWayServerNode, {
		credentials: {
			username: { type: "text" },
			password: { type: "password" },
		}
	});
}