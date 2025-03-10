// Function to add markers dynamically
function addMarker(markerId, modelUrl, position, rotation, scale) {
    // Create a new marker element
    const marker = document.createElement('a-marker');

    // Set the marker type and ID
    marker.setAttribute('type', 'pattern');
    marker.setAttribute('url', `assets/markers/${markerId}.patt`);

    // Create a 3D model element
    const model = document.createElement('a-entity');
    model.setAttribute('gltf-model', modelUrl);
    model.setAttribute('position', position);
    model.setAttribute('rotation', rotation);
    model.setAttribute('scale', scale);

    // Append the model to the marker
    marker.appendChild(model);

    // Ensure scene is loaded before appending markers
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.appendChild(marker);
    } else {
        console.error("A-Frame scene not found! Make sure your <a-scene> is loaded.");
    }
}

// ✅ Fetch markers dynamically from backend
async function loadMarkers() {
    try {
        const response = await fetch("http://localhost:9999/markers"); // Fetch from backend
        const data = await response.json();

        if (data.success && Array.isArray(data.markers)) {
            data.markers.forEach(marker => {
                addMarker(
                    marker.id,          // Marker ID (e.g., 'example-marker')
                    marker.modelUrl,    // Path to 3D model
                    marker.position,    // e.g., '0 0 0'
                    marker.rotation,    // e.g., '0 0 0'
                    marker.scale        // e.g., '0.5 0.5 0.5'
                );
            });
        } else {
            console.error("Invalid marker data received from backend.");
        }
    } catch (error) {
        console.error("Error loading markers:", error);
    }
}

// ✅ Load markers when the window loads
window.addEventListener("load", loadMarkers);
