// document.addEventListener("DOMContentLoaded", function () {
//     const sidebar = document.getElementById("sidebar");
//     const menuBtn = document.getElementById("open-sidebar");
//     const searchBar = document.getElementById("search-bar");
//     const startNavigationBtn = document.getElementById("start-navigation");
//     const scanResult = document.getElementById("scan-result");
    
//     let initialCoordinates = null; // Stores the scanned start location
//     let selectedLocation = null; // Stores the selected destination

//     // ✅ Toggle Sidebar (Open/Close)
//     menuBtn.addEventListener("click", function () {
//         sidebar.classList.toggle("open");
//     });

//     // ✅ Handle Location Selection
//     searchBar.addEventListener("change", function () {
//         selectedLocation = searchBar.value;
//         checkReadyToNavigate();
//     });

//     // ✅ Function to enable Start button only if both conditions are met
//     function checkReadyToNavigate() {
//         if (selectedLocation && initialCoordinates) {
//             startNavigationBtn.disabled = false;
//         } else {
//             startNavigationBtn.disabled = true;
//         }
//     }

//     // ✅ Redirect to Navigation Page on Button Click
//     startNavigationBtn.addEventListener("click", function () {
//         if (selectedLocation && initialCoordinates) {
//             const destinationCoordinates = getDestinationCoordinates(selectedLocation);
//             if (!destinationCoordinates) {
//                 alert("Invalid location selected!");
//                 return;
//             }

//             // Store coordinates and navigate
//             sessionStorage.setItem("startCoords", JSON.stringify(initialCoordinates));
//             sessionStorage.setItem("destinationCoords", JSON.stringify(destinationCoordinates));
//             window.location.href = "navigation.html";
//         } else {
//             alert("Please scan a QR code and select a destination!");
//         }
//     });

//     // ✅ Function to fetch hardcoded destination coordinates
//     function getDestinationCoordinates(location) {
//         const locations = {
//             "SET Lab": { lat: 26.1234, lng: 91.1234 },
//             "Data Science Lab": { lat: 26.1245, lng: 91.1256 },
//             "IBM Lab": { lat: 26.1256, lng: 91.1267 },
//             "SET HOD Cabin": { lat: 26.1267, lng: 91.1278 },
//             "SET Dean's Office": { lat: 26.1278, lng: 91.1289 },
//             "SET Faculty Cabin": { lat: 26.1289, lng: 91.1299 },
//         };
//         return locations[location] || null;
//     }

//     // ✅ Initialize QR Code Scanner
//     function startQRScanner() {
//         const qrScanner = new Html5Qrcode("reader");
//         qrScanner.start(
//             { facingMode: "environment" },
//             { fps: 10, qrbox: 250 },
//             (decodedText) => {
//                 try {
//                     const coords = JSON.parse(decodedText); // Expecting format: {"lat": 26.xxxx, "lng": 91.xxxx}
//                     initialCoordinates = coords;
//                     scanResult.innerText = `Start Location: (${coords.lat}, ${coords.lng})`;
//                     qrScanner.stop();
//                     checkReadyToNavigate(); // Check if navigation can start
//                 } catch (error) {
//                     scanResult.innerText = "Invalid QR Code!";
//                 }
//             },
//             (errorMessage) => {
//                 console.log("QR Scan Error:", errorMessage);
//             }
//         );
//     }

//     // ✅ Start QR Scanner on Page Load
//     startQRScanner();
// });


document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("open-sidebar");
    const searchBar = document.getElementById("search-bar");
    const startNavigationBtn = document.getElementById("start-navigation");
    const scanResult = document.getElementById("scan-result");

    let initialCoordinates = null; // Stores the scanned start location
    let selectedLocation = null; // Stores the selected destination
    let locationData = {}; // Stores locations fetched from the backend

    // ✅ Fetch locations from the backend
    fetch("http://localhost:9999/")
        .then(response => response.json())
        .then(data => console.log(data.message))
        .catch(error => console.error("Error connecting to backend:", error));

    fetchLocations();

    function fetchLocations() {
        fetch("http://localhost:9999/location/location1") // Example fetch to check connection
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log("Backend connection successful.");
                }
            })
            .catch(error => console.error("Error fetching location:", error));
    }

    // ✅ Handle Location Selection
    searchBar.addEventListener("change", function () {
        selectedLocation = searchBar.value;
        checkReadyToNavigate();
    });

    // ✅ Function to enable Start button only if both conditions are met
    function checkReadyToNavigate() {
        if (selectedLocation && initialCoordinates) {
            startNavigationBtn.disabled = false;
        } else {
            startNavigationBtn.disabled = true;
        }
    }

    // ✅ Redirect to Navigation Page on Button Click
    startNavigationBtn.addEventListener("click", async function () {
        if (selectedLocation && initialCoordinates) {
            try {
                const response = await fetch(`http://localhost:9999/location/${selectedLocation}`);
                const data = await response.json();
                
                if (!data.success) {
                    alert("Error: Could not get destination coordinates");
                    return;
                }

                // Store coordinates and navigate
                sessionStorage.setItem("startCoords", JSON.stringify({
                    lat: initialCoordinates.lat,
                    lng: initialCoordinates.lng,
                    name: "Scanned Location"
                }));
                sessionStorage.setItem("destinationCoords", JSON.stringify(data.coordinates));
                window.location.href = "navigation.html";
            } catch (error) {
                console.error("Error fetching destination:", error);
                alert("Error connecting to server. Please try again.");
            }
        } else {
            alert("Please scan a QR code and select a destination!");
        }
    });



    // ✅ Initialize QR Code Scanner
    function startQRScanner() {
        const qrScanner = new Html5Qrcode("reader");
        qrScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            (decodedText) => {
                try {
                    const coords = JSON.parse(decodedText); // Expecting format: {"lat": 26.xxxx, "lng": 91.xxxx}
                    
                    // Validate coordinates
                    if (!coords.lat || !coords.lng || 
                        typeof coords.lat !== 'number' || 
                        typeof coords.lng !== 'number') {
                        throw new Error('Invalid coordinate format');
                    }
                    
                    initialCoordinates = {
                        lat: coords.lat,
                        lng: coords.lng
                    };
                    
                    scanResult.innerText = `Start Location: (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
                    qrScanner.stop();
                    checkReadyToNavigate(); // Check if navigation can start
                } catch (error) {
                    console.error('QR Code parsing error:', error);
                    scanResult.innerText = "Invalid QR Code! Please ensure it contains valid coordinates.";
                    initialCoordinates = null;
                    checkReadyToNavigate();
                }
            },
            (errorMessage) => {
                console.log("QR Scan Error:", errorMessage);
            }
        );
    }

    // ✅ Start QR Scanner on Page Load
    startQRScanner();
});
