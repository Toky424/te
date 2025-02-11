"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBroken = exports.fixStream = exports.breakStream = exports.setLastEventDate = exports.getLastEventDate = exports.setValue = exports.getValue = exports.cacheDisconnectMiddleware = exports.cacheConnectMiddleware = void 0;
const dist_1 = require("redis/dist");
const LastEventDateKey = "last_event_date";
const BreakKey = "isBroken";
const cacheConnectMiddleware = () => (req, res, next) => {
    const client = (0, dist_1.createClient)({
        url: process.env.REDIS_URL,
    })
        .on("error", (err) => {
        console.log("Redis Client Error", err);
        next(err);
    })
        .connect()
        .then((client) => {
        req.redis = client;
        next();
    });
};
exports.cacheConnectMiddleware = cacheConnectMiddleware;
const cacheDisconnectMiddleware = () => async (req, res, next) => {
    console.log("Disconnecting Redis");
    req.redis.disconnect();
};
exports.cacheDisconnectMiddleware = cacheDisconnectMiddleware;
const getValue = async (req, key) => await req.redis.get(key);
exports.getValue = getValue;
const setValue = async (req, key, value) => await req.redis.set(key, value);
exports.setValue = setValue;
const getLastEventDate = async (req) => parseInt((await (0, exports.getValue)(req, LastEventDateKey)) || "0");
exports.getLastEventDate = getLastEventDate;
const setLastEventDate = async (req) => await (0, exports.setValue)(req, LastEventDateKey, Date.now().toString());
exports.setLastEventDate = setLastEventDate;
const breakStream = async (req) => await (0, exports.setValue)(req, BreakKey, "true");
exports.breakStream = breakStream;
const fixStream = async (req) => await (0, exports.setValue)(req, BreakKey, "false");
exports.fixStream = fixStream;
const isBroken = async (req) => (await (0, exports.getValue)(req, BreakKey)) === "true";
exports.isBroken = isBroken;
//# sourceMappingURL=cache.js.map