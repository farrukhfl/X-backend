const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middlewares/errorHandler");
const auth = require("./middlewares/auth");
const userRoutes = require("./routes/userRoutes");
const tweetRoutes = require("./routes/tweetRoutes");


dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
app.use(limiter);

app.use("/api/auth", authRoutes);
app.get("/api/me", auth, (req, res) => {
  res.json({
    message: "Authenticated!",
    user: req.user,
  });
});

app.use("/api/user", userRoutes);
app.use("/api/tweets", tweetRoutes);


// Health check
app.get('/', (req, res) => {
  res.send({ status: 'API is running 🚀' });
});


app.use(errorHandler);
module.exports = app;
