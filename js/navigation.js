// System status flags and global variables
let isARSystemReady = false;
let isLocationAvailable = false;
let isCompassAvailable = false;
let hasPermissions = false;
let currentPosition = null;
let currentHeading = 0;
let lastCompassUpdate = 0;

document.addEventListener("DOMContentLoaded", async function () {
    try {
        // Check for required browser features
        if (!navigator.geolocation) {
            throw new Error("Geolocation is not supported by your browser");
        }
        if (!window.DeviceOrientationEvent) {
            throw new Error("Device orientation is not supported by your browser");
        }

        // Request necessary permissions
        await requestPermissions();

        // Retrieve stored coordinates
        const startCoords = JSON.parse(sessionStorage.getItem("startCoords"));
        const destinationCoords = JSON.parse(sessionStorage.getItem("destinationCoords"));

        if (!startCoords || !destinationCoords) {
            throw new Error("Missing location data");
        }

        // Initialize AR system
        await initializeARSystem();

        // Initialize current position
        currentPosition = startCoords;

        // Start tracking and initialize UI
        startTracking(startCoords, destinationCoords);
        updateLocationDisplay(startCoords, destinationCoords);
        createLocationMarkers([startCoords, destinationCoords]);
        updateARScene(startCoords, destinationCoords);
    } catch (error) {
        handleError(error);
    }
});

async function requestPermissions() {
    try {
        // Request geolocation permission
        const geoPermission = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                () => resolve(true),
                (error) => reject(new Error(`Geolocation permission denied: ${error.message}`))
            );
        });

        // Request device orientation permission (iOS 13+)
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            const orientationPermission = await DeviceOrientationEvent.requestPermission();
            if (orientationPermission !== 'granted') {
                throw new Error('Device orientation permission denied');
            }
        }

        hasPermissions = true;
        updateSystemStatus('Permissions granted');
    } catch (error) {
        throw new Error(`Permission error: ${error.message}`);
    }
}

async function initializeARSystem() {
    try {
        // Wait for A-Frame scene to load
        await new Promise((resolve) => {
            const scene = document.querySelector('a-scene');
            if (scene.hasLoaded) {
                resolve();
            } else {
                scene.addEventListener('loaded', resolve);
            }
        });

        isARSystemReady = true;
        updateSystemStatus('AR system initialized');
    } catch (error) {
        throw new Error(`AR initialization error: ${error.message}`);
    }
}

function startTracking(startCoords, destinationCoords) {
    // Initialize location tracking
    if ("geolocation" in navigator) {
        const locationWatcher = navigator.geolocation.watchPosition(
            (position) => {
                isLocationAvailable = true;
                currentPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                updateNavigation();
                updateSystemStatus('Location tracking active');
            },
            (error) => {
                isLocationAvailable = false;
                handleError(new Error(`Location error: ${error.message}`));
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    }

    // Initialize compass tracking
    if ("DeviceOrientationEvent" in window) {
        window.addEventListener("deviceorientationabsolute", (event) => {
            isCompassAvailable = true;
            handleOrientation(event);
            updateSystemStatus('Compass tracking active');
        }, true);
    }

    // Initialize error recovery interval
    setInterval(checkSystemStatus, 5000);
}

function checkSystemStatus() {
    if (!isLocationAvailable || !isCompassAvailable) {
        updateSystemStatus('Trying to recover tracking...');
        // Attempt to restart tracking
        if (!isLocationAvailable) {
            navigator.geolocation.getCurrentPosition(
                () => { isLocationAvailable = true; },
                () => { handleError(new Error('Location tracking lost')); }
            );
        }
    }
}

function handleError(error) {
    console.error('Navigation error:', error);

    // Update UI with error message
    const errorMessages = {
        'Missing location data': 'Navigation data is missing. Please scan a QR code first.',
        'Geolocation permission denied': 'Please enable location services to use AR navigation.',
        'Device orientation permission denied': 'Please enable device orientation to use compass features.',
        'Location tracking lost': 'GPS signal lost. Please ensure you have a clear view of the sky.',
        'AR initialization error': 'Failed to start AR. Please ensure your device supports AR features.'
    };

    const message = errorMessages[error.message] || error.message;
    updateSystemStatus(`Error: ${message}`);

    // Handle critical errors
    if (error.message === 'Missing location data') {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
}

function updateSystemStatus(status) {
    const statusElement = document.createElement('div');
    statusElement.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 1000;
        transition: opacity 0.3s;
    `;
    statusElement.textContent = status;

    // Remove previous status message if exists
    const previousStatus = document.querySelector('.status-message');
    if (previousStatus) {
        previousStatus.remove();
    }

    // Add new status message
    statusElement.classList.add('status-message');
    document.body.appendChild(statusElement);

    // Fade out after 3 seconds
    setTimeout(() => {
        statusElement.style.opacity = '0';
        setTimeout(() => statusElement.remove(), 300);
    }, 3000);
}

// Initialize device orientation for compass
function initializeCompass() {
    if ("DeviceOrientationEvent" in window) {
        window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    }
}

function handleOrientation(event) {
    const now = Date.now();
    if (now - lastCompassUpdate < 50) return; // Limit updates to 20fps
    lastCompassUpdate = now;

    if (event.alpha !== null) {
        const compass = document.getElementById("compass");
        const targetHeading = 360 - event.alpha;

        // Smooth heading transition
        const delta = targetHeading - currentHeading;
        const adjustedDelta = delta > 180 ? delta - 360 : delta < -180 ? delta + 360 : delta;
        currentHeading += adjustedDelta * 0.1; // Smooth factor
        currentHeading = (currentHeading + 360) % 360;

        // Apply smooth rotation
        compass.style.transform = `rotate(${currentHeading}deg)`;
        compass.textContent = `${Math.round(currentHeading)}°`;

        // Update AR elements based on heading
        updateARElements(currentHeading);
    }
}

function updateARElements(heading) {
    const arScene = document.querySelector('a-scene');
    if (!arScene || !arScene.camera) return;

    // Get camera's world position
    const cameraPosition = arScene.camera.getWorldPosition();
    const cameraRotation = arScene.camera.getWorldRotation();

    // Update AR elements based on camera position and heading
    updateArrowPosition(cameraPosition, cameraRotation, heading);
    updateDistanceIndicators(cameraPosition);
}

function updateArrowPosition(cameraPos, cameraRot, heading) {
    const arrowContainer = document.getElementById('arrow-container');
    if (!arrowContainer) return;

    // Calculate arrow position relative to camera
    const distance = 4; // Fixed distance from camera
    const x = -Math.sin(heading * Math.PI / 180) * distance;
    const z = -Math.cos(heading * Math.PI / 180) * distance;

    // Smoothly update arrow position
    const currentPos = arrowContainer.getAttribute('position');
    const newPos = {
        x: currentPos.x + (x - currentPos.x) * 0.1,
        y: currentPos.y,
        z: currentPos.z + (z - currentPos.z) * 0.1
    };

    arrowContainer.setAttribute('position', newPos);
}

function updateDistanceIndicators(cameraPos) {
    const rings = document.getElementById('distance-rings');
    if (!rings) return;

    // Update rings position to follow camera but stay on ground
    rings.setAttribute('position', `${cameraPos.x} 0 ${cameraPos.z}`);
}

// Create location markers on the overlay
function createLocationMarkers(locations) {
    const container = document.getElementById("overlay-container");
    container.innerHTML = "";

    locations.forEach((location, index) => {
        const marker = document.createElement("div");
        marker.className = "location-marker";
        marker.id = `marker-${index}`;
        marker.innerHTML = `${location.name || 'Location ' + (index + 1)}<br>(${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`;
        container.appendChild(marker);
    });
}

// Update location display in UI
function updateLocationDisplay(start, destination) {
    document.getElementById("start-coords").innerText = 
        `Start: ${start.name || `(${start.lat.toFixed(4)}, ${start.lng.toFixed(4)})`}`;
    document.getElementById("destination-coords").innerText = 
        `Destination: ${destination.name || `(${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)})`}`;

    const distance = getDistance(start.lat, start.lng, destination.lat, destination.lng);
    document.getElementById("distance").innerText = `Distance: ${distance.toFixed(0)}m`;

    const bearing = calculateBearing(start.lat, start.lng, destination.lat, destination.lng);
    document.getElementById("bearing").innerText = `Bearing: ${bearing.toFixed(0)}°`;
}

// ✅ Function to fetch destination coordinates from backend
async function getDestinationCoordinates(locationId) {
    try {
        const response = await fetch(`http://localhost:9999/location/${locationId}`);
        const data = await response.json();
        return data.success ? data.coordinates : null;
    } catch (error) {
        console.error("Error fetching destination coordinates:", error);
        return null;
    }
}

// Calculate distance between coordinates (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calculate bearing between coordinates
function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
}

// Update AR scene with new position and orientation
function updateARScene(currentPos, targetPos) {
    const distance = getDistance(currentPos.lat, currentPos.lng, targetPos.lat, targetPos.lng);
    const bearing = calculateBearing(currentPos.lat, currentPos.lng, targetPos.lat, targetPos.lng);

    // Update direction arrow
    updateDirectionArrow(bearing, distance);

    // Update distance rings
    updateDistanceRings(distance);

    // Update destination marker
    updateDestinationMarker(distance, bearing);

    // Update waypoints if needed
    updateWaypoints(currentPos, targetPos);
}

// Update direction arrow appearance and behavior
function updateDirectionArrow(bearing, distance) {
    const arrowContainer = document.getElementById("arrow-container");
    const directionArrow = document.getElementById("direction-arrow");
    const arrowTrail = document.getElementById("arrow-trail");

    // Update arrow rotation based on bearing
    arrowContainer.setAttribute("rotation", `0 ${bearing} 0`);

    // Scale arrow and trail based on distance
    const scaleFactor = Math.min(Math.max(distance / 1000, 0.5), 2);
    directionArrow.setAttribute("scale", `${scaleFactor} ${scaleFactor} ${scaleFactor}`);
    
    // Update trail opacity based on distance
    const trailOpacity = Math.max(0.1, Math.min(0.4, 1 - (distance / 1000)));
    arrowTrail.setAttribute("material", `opacity: ${trailOpacity}`);
}

// Update distance rings visibility and scale
function updateDistanceRings(distance) {
    const rings = ["ring-near", "ring-mid", "ring-far"];
    const thresholds = [50, 100, 200]; // Distance thresholds in meters

    rings.forEach((ringId, index) => {
        const ring = document.getElementById(ringId);
        const threshold = thresholds[index];
        
        // Show ring only if within its distance threshold
        const visible = distance <= threshold;
        ring.setAttribute("visible", visible);

        if (visible) {
            // Scale ring based on distance
            const scale = 1 - (distance / threshold);
            ring.setAttribute("scale", `${scale} ${scale} ${scale}`);
        }
    });
}

// Update destination marker position and visibility
function updateDestinationMarker(distance, bearing) {
    const marker = document.getElementById("destination-marker");
    
    // Only show destination marker when within 200 meters
    const visible = distance <= 200;
    marker.setAttribute("visible", visible);

    if (visible) {
        // Position marker at scaled distance and bearing
        const scaledDistance = Math.min(distance / 10, 20);
        const x = Math.sin(bearing * Math.PI / 180) * scaledDistance;
        const z = -Math.cos(bearing * Math.PI / 180) * scaledDistance;
        marker.setAttribute("position", `${x} 0 ${z}`);

        // Update marker scale based on distance
        const scale = Math.max(0.5, 2 - (distance / 100));
        marker.setAttribute("scale", `${scale} ${scale} ${scale}`);
    }
}

// Update waypoints between current position and destination
function updateWaypoints(currentPos, targetPos) {
    const container = document.getElementById("waypoints-container");
    const distance = getDistance(currentPos.lat, currentPos.lng, targetPos.lat, targetPos.lng);

    // Only show waypoints for distances greater than 50 meters
    if (distance <= 50) {
        container.innerHTML = '';
        return;
    }

    // Create waypoints every 50 meters
    const numWaypoints = Math.min(5, Math.floor(distance / 50));
    container.innerHTML = '';

    for (let i = 1; i <= numWaypoints; i++) {
        const fraction = i / (numWaypoints + 1);
        const waypointLat = currentPos.lat + (targetPos.lat - currentPos.lat) * fraction;
        const waypointLng = currentPos.lng + (targetPos.lng - currentPos.lng) * fraction;

        const waypoint = document.createElement('a-sphere');
        waypoint.setAttribute('radius', '0.2');
        waypoint.setAttribute('material', 'color: #FFC107; opacity: 0.6; transparent: true');
        
        // Position waypoint in 3D space
        const bearing = calculateBearing(currentPos.lat, currentPos.lng, waypointLat, waypointLng);
        const scaledDistance = Math.min(distance * fraction / 10, 20);
        const x = Math.sin(bearing * Math.PI / 180) * scaledDistance;
        const z = -Math.cos(bearing * Math.PI / 180) * scaledDistance;
        
        waypoint.setAttribute('position', `${x} 1.6 ${z}`);
        waypoint.setAttribute('animation', 'property: position; dir: alternate; dur: 2000; easing: easeInOutQuad; loop: true; to: ' + `${x} 2 ${z}`);
        
        container.appendChild(waypoint);
    }
}

// Update navigation elements
function updateNavigation() {
    const destinationCoords = JSON.parse(sessionStorage.getItem("destinationCoords"));
    if (!currentPosition || !destinationCoords) return;

    // Update distance and bearing display
    const distance = getDistance(
        currentPosition.lat, currentPosition.lng,
        destinationCoords.lat, destinationCoords.lng
    );
    const bearing = calculateBearing(
        currentPosition.lat, currentPosition.lng,
        destinationCoords.lat, destinationCoords.lng
    );

    document.getElementById("distance").innerText = `Distance: ${distance.toFixed(0)}m`;
    document.getElementById("bearing").innerText = `Bearing: ${bearing.toFixed(0)}°`;

    // Update AR scene
    updateARScene(currentPosition, destinationCoords);

    // Update marker positions
    updateMarkerPositions([currentPosition, destinationCoords]);
}

// Update marker positions on screen
function updateMarkerPositions(locations) {
    locations.forEach((location, index) => {
        const marker = document.getElementById(`marker-${index}`);
        if (!marker) return;

        // Convert GPS to screen coordinates (simplified)
        const x = (location.lng - currentPosition.lng) * 1000 + window.innerWidth / 2;
        const y = -(location.lat - currentPosition.lat) * 1000 + window.innerHeight / 2;

        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;
    });
}
