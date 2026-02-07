const fs = require("fs"); const content = fs.readFileSync(0, "utf8"); fs.appendFileSync("server.ts", content);
