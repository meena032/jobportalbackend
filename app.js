const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs'); // Use bcryptjs instead of bcrypt

const app = express();
app.use(cors());
const port = 3003; // Change port if needed

// MongoDB connection string
const mongourl = "mongodb+srv://meena2005:jesus123@cluster0.phgjr.mongodb.net/jobportal";


// Connect to MongoDB
mongoose
  .connect(mongourl)
  .then(() => {
    console.log("Database connected successfully");
    app.listen(port, () => {
      console.log(`Server is running at port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
  });

// Middleware to parse JSON requests
app.use(express.json());

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);

// Job Schema and Model
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  salary: { type: Number, required: true },
  company: { type: String, required: true }
});

const Job = mongoose.model("Job", jobSchema);

// User Registration
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    const savedUser = await newUser.save();
    res.status(201).json({ message: "User registered successfully", user: savedUser });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
});

// User Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign({ username: user.username }, "secret-key", { expiresIn: "12h" });
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

// Authorization Middleware
const authorize = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  jwt.verify(token, "secret-key", (error, userInfo) => {
    if (error) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = userInfo;
    next();
  });
};

// Secured Route to Get All Jobs (Only accessible to authenticated users)
app.get("/api/jobs", authorize, async (req, res) => {
  try {
    const jobs = await Job.find();
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching jobs", error: error.message });
  }
});

// Secured Route to Post a New Job
app.post("/api/jobs", authorize, async (req, res) => {
  const { title, description, salary, company } = req.body;
  try {
    const newJob = new Job({ title, description, salary, company });
    const savedJob = await newJob.save();
    res.status(201).json({ message: "Job posted successfully", job: savedJob });
  } catch (error) {
    res.status(500).json({ message: "Error posting job", error: error.message });
  }
});

// Secured Route to Delete a Job by ID
app.delete("/api/jobs/:id", authorize, async (req, res) => {
  const { id } = req.params;
  try {
    const deletedJob = await Job.findByIdAndDelete(id);
    if (!deletedJob) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json({ message: "Job deleted successfully", job: deletedJob });
  } catch (error) {
    res.status(500).json({ message: "Error deleting job", error: error.message });
  }
});




// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});
