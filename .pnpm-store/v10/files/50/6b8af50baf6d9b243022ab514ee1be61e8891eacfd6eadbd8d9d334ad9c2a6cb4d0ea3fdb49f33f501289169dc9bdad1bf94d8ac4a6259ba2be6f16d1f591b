"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const querystring = require("querystring");
const mUri = require("mongodb-uri");
const url = require("url");
class DatabaseConfig {
}
exports.DatabaseConfig = DatabaseConfig;
function default_1(databaseUrl) {
    let parsedUrl = url.parse(databaseUrl, false, true);
    let config = querystring.parse(parsedUrl.query);
    config.driver = (parsedUrl.protocol || 'sqlite3:').replace(/\:$/, '');
    if (config.driver == 'mysql2')
        config.driver = 'mysql';
    if (parsedUrl.auth) {
        var userPassword = parsedUrl.auth.split(':', 2);
        config.user = userPassword[0];
        if (userPassword.length > 1) {
            config.password = userPassword[1];
        }
    }
    if (config.driver === 'sqlite3') {
        if (parsedUrl.hostname) {
            if (parsedUrl.pathname) {
                config.filename = parsedUrl.hostname + parsedUrl.pathname;
            }
            else {
                config.filename = parsedUrl.hostname;
            }
        }
        else {
            config.filename = parsedUrl.pathname;
        }
    }
    else {
        if (config.driver === 'mongodb') {
            var mongoParsedUrl = mUri.parse(databaseUrl);
            let mongoUrl = {};
            parsedUrl = { query: '' };
            if (mongoParsedUrl.hosts) {
                mongoUrl.hosts = mongoParsedUrl.hosts;
                for (var i = 0; i < mongoUrl.hosts.length; i += 1) {
                    if (mongoUrl.hosts[i].port)
                        mongoUrl.hosts[i].port = mongoUrl.hosts[i].port.toString();
                }
                if (mongoUrl.hosts.length === 1) {
                    if (mongoUrl.hosts[0].host)
                        mongoUrl.host = mongoUrl.hosts[0].host;
                    if (mongoUrl.hosts[0].port)
                        mongoUrl.port = mongoUrl.hosts[0].port.toString();
                }
            }
            if (mongoParsedUrl.database)
                mongoUrl.database = mongoParsedUrl.database;
            config = Object.assign({}, config, mongoUrl);
        }
        else {
            if (parsedUrl.pathname) {
                config.database = parsedUrl.pathname
                    .replace(/^\//, '')
                    .replace(/\/$/, '');
            }
        }
        if (parsedUrl.hostname)
            config.host = parsedUrl.hostname;
        if (parsedUrl.port)
            config.port = parsedUrl.port;
    }
    return config;
}
exports.default = default_1;
//# sourceMappingURL=index.js.map