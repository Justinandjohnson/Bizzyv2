const cors = require("cors");

app.use(
  cors({
    origin: "http://localhost:3000", // or your frontend URL
  })
);
