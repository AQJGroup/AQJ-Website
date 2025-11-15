const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// serve frontend static (optional)
app.use("/", express.static(path.join(__dirname,"..","frontend","public")));
app.use("/assets", express.static(path.join(__dirname,"..","frontend","assets")));

// endpoints
app.get("/api/projects", (req,res) => {
  try {
    const data = fs.readJsonSync(path.join(__dirname,"..","frontend","data","projects.json"));
    res.json(data);
  } catch(err) { res.status(500).json({ error:"projects data not available" }); }
});

app.get("/api/services", (req,res) => {
  try {
    const data = fs.readJsonSync(path.join(__dirname,"..","frontend","data","services.json"));
    res.json(data);
  } catch(err) { res.status(500).json({ error:"services data not available" }); }
});

app.post("/api/contact", async (req,res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ message:"Missing fields" });
  const uploads = path.join(__dirname,"uploads","messages.json");
  await fs.ensureFile(uploads);
  let arr = [];
  try { arr = await fs.readJson(uploads); } catch(e) { arr = []; }
  arr.push({ name, email, message, ts: new Date().toISOString() });
  await fs.writeJson(uploads, arr, { spaces:2 });
  res.json({ ok:true, message:"Message received (demo)" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("AQJ backend running on port", PORT));
