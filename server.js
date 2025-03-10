const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 9999;

app.use(cors()); // Enable CORS
app.use(express.json()); // Enable JSON parsing

// Hardcoded locations with coordinates
const locations = {
    location1: { name: "SET Lab", lat: 26.724131, lng: 94.075835 },
    location2: { name: "Data Science Lab", lat: 26.724132, lng: 94.075358 },
    location3: { name: "IBM Lab", lat: 26.724061, lng: 94.075695 },
    location4: { name: "SET HOD Cabin", lat: 26.1260, lng: 91.1260 },
    location5: { name: "SET Dean's Office", lat: 26.1270, lng: 91.1270 },
    location6: { name: "SET Faculty Cabin", lat: 26.1280, lng: 91.1280 }
};

// Hardcoded markers data for AR.js
const markers = [
    {
        id: "set-lab-marker",
        modelUrl: "assets/models/set-lab.glb",
        position: "0 0 0",
        rotation: "0 0 0",
        scale: "0.5 0.5 0.5"
    },
    {
        id: "data-science-marker",
        modelUrl: "assets/models/data-science.glb",
        position: "1 0 0",
        rotation: "0 90 0",
        scale: "1 1 1"
    },
    {
        id: "ibm-lab-marker",
        modelUrl: "assets/models/ibm-lab.glb",
        position: "2 0 0",
        rotation: "0 180 0",
        scale: "0.7 0.7 0.7"
    }
];

// Root route
app.get("/", (req, res) => {
    res.json({ message: "ARIN Backend is Running!" });
});

// Endpoint to get coordinates of a selected location
app.get("/location/:locationId", (req, res) => {
    const locationId = req.params.locationId;
    if (locations[locationId]) {
        res.json({ success: true, coordinates: locations[locationId] });
    } else {
        res.status(404).json({ success: false, message: "Location not found" });
    }
});

// ✅ New Endpoint to Get AR Markers Data
app.get("/markers", (req, res) => {
    res.json({ success: true, markers });
});

// Start server with error handling
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
