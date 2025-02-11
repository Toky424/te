"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const hubspot_1 = require("./hubspot");
const cache_1 = require("./cache");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
app.use(body_parser_1.default.json({
    type: () => true,
}));
const checkApiKey = () => (req, res, next) => {
    if (req.headers.authorization &&
        req.headers.authorization === `Bearer ${process.env.API_TOKEN}`) {
        return next();
    }
    return res.status(401).json({
        error: "Unauthorized",
        error_description: "Call is not authorized",
    });
};
app.use(checkApiKey());
app.use((0, cache_1.cacheConnectMiddleware)());
app.post("/webhook", async (req, res, next) => {
    console.log("Received Event: ", req.body);
    try {
        const ignoreBeforeTimestamp = await (0, cache_1.getLastEventDate)(req);
        const userEvent = req.body;
        const eventTimestamp = new Date(userEvent.time).getTime();
        if (ignoreBeforeTimestamp > eventTimestamp) {
            console.log(`Ignoring old event: ${new Date(ignoreBeforeTimestamp).toISOString()} > ${new Date(eventTimestamp).toISOString()}`);
            res.status(204).send();
            next();
            return;
        }
        const streamIsBroken = await (0, cache_1.isBroken)(req);
        if (streamIsBroken) {
            return res.status(400).send({
                message: "Stream is broken",
            });
        }
        const user = await (0, hubspot_1.getUser)(req.body);
        switch (userEvent.type) {
            case "user.created":
            case "user.initialized":
                if (user) {
                    console.log("skipping user because it already exists: ", user);
                    (0, hubspot_1.diffUser)(user, userEvent);
                    break;
                }
            case "user.updated":
                if (!user) {
                    await (0, hubspot_1.createUser)(req.body);
                    break;
                }
                const userTimestamp = parseInt(user.auth0_last_event_timestamp);
                const eventTimestamp = new Date(userEvent.time).getTime();
                // Check event time vs last event processed on the user
                if (eventTimestamp > userTimestamp) {
                    await (0, hubspot_1.updateUser)(user, userEvent);
                    break;
                }
                console.log(`Not updating user because ${eventTimestamp} <= ${userTimestamp}`);
                break;
            case "user.deleted":
                if (!user) {
                    console.log("Can't delete non-existing user");
                    break;
                }
                await (0, hubspot_1.deleteUser)(user);
                break;
        }
        res.status(204).send();
        next();
    }
    catch (e) {
        console.error("Failed to process event", e);
        console.error(e.message);
        res.status(500).json({
            error: "Failed to process user",
            error_description: e.message,
        });
        next(e);
    }
});
app.post("/webhook/ignore", async (req, res, next) => {
    await (0, cache_1.setLastEventDate)(req);
    res.status(204).send();
    next();
});
app.post("/webhook/break", async (req, res, next) => {
    await (0, cache_1.breakStream)(req);
    res.status(204).send();
    next();
});
app.post("/webhook/fix", async (req, res, next) => {
    await (0, cache_1.fixStream)(req);
    res.status(204).send();
    next();
});
app.use((0, cache_1.cacheDisconnectMiddleware)());
app.listen(port, () => {
    return console.log(`Server is listening on ${port}`);
});
//# sourceMappingURL=index.js.map