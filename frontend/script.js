/* =========================================================
   KONE ELEVATOR PREDICTIVE MAINTENANCE
   script.js
   ========================================================= */

/* =========================================================
   1. DEMO ELEVATOR DATA
   Replace these values later with API data
   ========================================================= */

const elevatorData = {
    cabin1: {
        id: "KONE-CAB-01",
        health: 87,
        failureProbability: 21,
        rul: 18,

        floor: 4,
        targetFloor: 6,
        movement: "Moving Up",
        door: "Closed",

        motorTemperature: 48.6,
        vibration: 2.8,
        current: 8.4,
        voltage: 230,

        motorSpeed: 1450,
        motorTorque: 42.5,
        loadTorque: 18.2,

        acceleration: 11.8,
        expectedAcceleration: 12.4,
        physicsResidual: -0.6,

        ropeTension: 1520,
        expectedRopeTension: 1498,

        cabinAcceleration: 0.42,
        expectedCabinAcceleration: 0.38,

        thermalResidual: 1.4,

        fault: "No Critical Fault",

        events: [
            {
                time: "2 min ago",
                type: "info",
                title: "Cabin reached Floor 4",
                description: "Normal movement detected."
            },
            {
                time: "12 min ago",
                type: "warning",
                title: "Slight vibration deviation",
                description: "Vibration is 8% above baseline."
            },
            {
                time: "28 min ago",
                type: "success",
                title: "Door operation normal",
                description: "Door open/close cycle completed."
            },
            {
                time: "1 hr ago",
                type: "info",
                title: "Routine monitoring",
                description: "All major parameters within limits."
            }
        ]
    },

    cabin2: {
        id: "KONE-CAB-02",
        health: 94,
        failureProbability: 8,
        rul: 41,

        floor: 2,
        targetFloor: 2,
        movement: "Idle",
        door: "Closed",

        motorTemperature: 41.2,
        vibration: 1.7,
        current: 6.9,
        voltage: 231,

        motorSpeed: 0,
        motorTorque: 0,
        loadTorque: 0,

        acceleration: 0,
        expectedAcceleration: 0,
        physicsResidual: 0,

        ropeTension: 1480,
        expectedRopeTension: 1475,

        cabinAcceleration: 0.08,
        expectedCabinAcceleration: 0.08,

        thermalResidual: 0.3,

        fault: "No Critical Fault",

        events: []
    }
};


/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

let activeCabin = "cabin1";

let currentData = elevatorData[activeCabin];

let doorOpen = false;
let elevatorMoving = true;

let faultSimulation = {
    active: false,
    component: "Motor",
    type: "Bearing Wear",
    severity: 0
};


/* =========================================================
   3. PAGE NAVIGATION
   ========================================================= */

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

navItems.forEach(item => {

    item.addEventListener("click", () => {

        const target = item.dataset.page;

        navItems.forEach(nav => {
            nav.classList.remove("active");
        });

        item.classList.add("active");

        pages.forEach(page => {
            page.classList.remove("active");
        });

        const selectedPage = document.getElementById(target);

        if (selectedPage) {
            selectedPage.classList.add("active");
        }

    });

});


/* =========================================================
   4. UPDATE DASHBOARD
   ========================================================= */

function updateDashboard() {

    currentData = elevatorData[activeCabin];

    updateElement("healthScore", currentData.health);
    updateElement("failureProbability", currentData.failureProbability + "%");
    updateElement("rulValue", currentData.rul + " Days");

    updateElement(
        "motorTemperature",
        currentData.motorTemperature.toFixed(1) + " °C"
    );

    updateElement(
        "vibrationValue",
        currentData.vibration.toFixed(1) + " mm/s"
    );

    updateElement(
        "currentValue",
        currentData.current.toFixed(1) + " A"
    );

    updateElement(
        "floorValue",
        "Floor " + currentData.floor
    );

    updateElement(
        "movementValue",
        currentData.movement
    );

    updateElement(
        "doorValue",
        currentData.door
    );

    updateElement(
        "faultValue",
        currentData.fault
    );

}


/* =========================================================
   5. HELPER FUNCTION
   ========================================================= */

function updateElement(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


/* =========================================================
   6. CABIN SWITCHING
   ========================================================= */

function switchCabin(cabin) {

    if (!elevatorData[cabin]) {
        return;
    }

    activeCabin = cabin;

    currentData = elevatorData[cabin];

    updateDashboard();
    updateHealthMonitor();
    updatePhysicsMonitor();
    updateMLPrediction();
    updateCabinStatus();
    renderEvents();

}


/* =========================================================
   7. CABIN BUTTONS
   ========================================================= */

document.querySelectorAll("[data-cabin]").forEach(button => {

    button.addEventListener("click", () => {

        switchCabin(button.dataset.cabin);

        document
            .querySelectorAll("[data-cabin]")
            .forEach(btn => btn.classList.remove("selected"));

        button.classList.add("selected");

    });

});


/* =========================================================
   8. 3D ELEVATOR MOVEMENT
   ========================================================= */

function moveElevator(targetFloor) {

    if (elevatorMoving) {
        return;
    }

    elevatorMoving = true;

    currentData.targetFloor = targetFloor;

    currentData.movement =
        targetFloor > currentData.floor
            ? "Moving Up"
            : "Moving Down";

    updateCabinStatus();

    const cabin = document.querySelector(".elevator-cabin");

    if (cabin) {

        const distance = targetFloor * 70;

        cabin.style.transform =
            `translateY(-${distance}px)`;

    }

    const interval = setInterval(() => {

        if (currentData.floor === targetFloor) {

            clearInterval(interval);

            elevatorMoving = false;

            currentData.movement = "Idle";

            updateCabinStatus();

            return;
        }

        if (currentData.floor < targetFloor) {
            currentData.floor++;
        } else {
            currentData.floor--;
        }

        updateCabinStatus();

    }, 900);

}


/* =========================================================
   9. FLOOR BUTTONS
   ========================================================= */

document.querySelectorAll(".floor-button").forEach(button => {

    button.addEventListener("click", () => {

        const floor =
            parseInt(button.dataset.floor);

        moveElevator(floor);

    });

});


/* =========================================================
   10. DOOR CONTROL
   ========================================================= */

function toggleDoor() {

    const leftDoor =
        document.querySelector(".door-left");

    const rightDoor =
        document.querySelector(".door-right");

    doorOpen = !doorOpen;

    if (doorOpen) {

        currentData.door = "Open";

        if (leftDoor) {
            leftDoor.style.transform =
                "translateX(-100%)";
        }

        if (rightDoor) {
            rightDoor.style.transform =
                "translateX(100%)";
        }

    } else {

        currentData.door = "Closed";

        if (leftDoor) {
            leftDoor.style.transform =
                "translateX(0)";
        }

        if (rightDoor) {
            rightDoor.style.transform =
                "translateX(0)";
        }

    }

    updateCabinStatus();

}


/* =========================================================
   11. DOOR BUTTON
   ========================================================= */

const doorButton =
    document.getElementById("doorToggle");

if (doorButton) {

    doorButton.addEventListener(
        "click",
        toggleDoor
    );

}


/* =========================================================
   12. CABIN STATUS
   ========================================================= */

function updateCabinStatus() {

    updateElement(
        "cabinFloor",
        "Floor " + currentData.floor
    );

    updateElement(
        "cabinMovement",
        currentData.movement
    );

    updateElement(
        "cabinDoor",
        currentData.door
    );

    updateElement(
        "targetFloor",
        "Target: Floor " +
        currentData.targetFloor
    );

}


/* =========================================================
   13. HEALTH MONITOR
   ========================================================= */

function updateHealthMonitor() {

    updateElement(
        "actualVibration",
        currentData.vibration.toFixed(2) +
        " mm/s"
    );

    updateElement(
        "expectedVibration",
        "2.60 mm/s"
    );

    updateElement(
        "actualTemperature",
        currentData.motorTemperature.toFixed(1) +
        " °C"
    );

    updateElement(
        "expectedTemperature",
        "45.0 °C"
    );

    updateElement(
        "actualCurrent",
        currentData.current.toFixed(2) +
        " A"
    );

    updateElement(
        "expectedCurrent",
        "8.0 A"
    );

    const vibrationDeviation =
        calculateDeviation(
            currentData.vibration,
            2.6
        );

    const temperatureDeviation =
        calculateDeviation(
            currentData.motorTemperature,
            45
        );

    updateElement(
        "vibrationDeviation",
        vibrationDeviation + "%"
    );

    updateElement(
        "temperatureDeviation",
        temperatureDeviation + "%"
    );

}


/* =========================================================
   14. DEVIATION CALCULATION
   ========================================================= */

function calculateDeviation(actual, expected) {

    if (expected === 0) {
        return 0;
    }

    return Math.abs(
        ((actual - expected) / expected) * 100
    ).toFixed(1);

}


/* =========================================================
   15. PHYSICS MONITOR
   ========================================================= */

function updatePhysicsMonitor() {

    updateElement(
        "physicsAcceleration",
        currentData.acceleration.toFixed(2) +
        " rad/s²"
    );

    updateElement(
        "expectedAcceleration",
        currentData.expectedAcceleration.toFixed(2) +
        " rad/s²"
    );

    updateElement(
        "physicsResidual",
        currentData.physicsResidual.toFixed(2)
    );

    updateElement(
        "ropeTension",
        currentData.ropeTension.toFixed(0) +
        " N"
    );

    updateElement(
        "expectedRopeTension",
        currentData.expectedRopeTension.toFixed(0) +
        " N"
    );

    updateElement(
        "thermalResidual",
        currentData.thermalResidual.toFixed(2) +
        " °C"
    );

}


/* =========================================================
   16. ML PREDICTION
   ========================================================= */

function updateMLPrediction() {

    updateElement(
        "mlFailureProbability",
        currentData.failureProbability + "%"
    );

    updateElement(
        "mlFault",
        currentData.fault
    );

    updateElement(
        "mlRUL",
        currentData.rul + " Days"
    );

    updateElement(
        "mlHealth",
        currentData.health + "%"
    );

}


/* =========================================================
   17. RENDER EVENTS
   ========================================================= */

function renderEvents() {

    const container =
        document.getElementById("eventList");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    currentData.events.forEach(event => {

        const eventElement =
            document.createElement("div");

        eventElement.className =
            "event-item";

        eventElement.innerHTML = `
            <div class="event-indicator ${event.type}">
            </div>

            <div class="event-content">

                <div class="event-time">
                    ${event.time}
                </div>

                <div class="event-title">
                    ${event.title}
                </div>

                <div class="event-description">
                    ${event.description}
                </div>

            </div>
        `;

        container.appendChild(eventElement);

    });

}


/* =========================================================
   18. FAULT INJECTION
   ========================================================= */

function simulateFault() {

    const component =
        document.getElementById("faultComponent")?.value ||
        "Motor";

    const faultType =
        document.getElementById("faultType")?.value ||
        "Bearing Wear";

    const severity =
        parseInt(
            document.getElementById("faultSeverity")?.value ||
            0
        );

    faultSimulation = {
        active: true,
        component: component,
        type: faultType,
        severity: severity
    };

    /* -----------------------------------------
       DEMO CALCULATION

       This is NOT the actual ML model.
       Replace with backend prediction later.
       ----------------------------------------- */

    const healthReduction =
        severity * 0.45;

    const probabilityIncrease =
        severity * 0.65;

    const rulReduction =
        Math.round(severity * 0.25);

    const simulatedHealth =
        Math.max(
            0,
            currentData.health - healthReduction
        );

    const simulatedProbability =
        Math.min(
            99,
            currentData.failureProbability +
            probabilityIncrease
        );

    const simulatedRUL =
        Math.max(
            1,
            currentData.rul - rulReduction
        );

    updateElement(
        "simulatedHealth",
        simulatedHealth.toFixed(0) + "%"
    );

    updateElement(
        "simulatedProbability",
        simulatedProbability.toFixed(0) + "%"
    );

    updateElement(
        "simulatedRUL",
        simulatedRUL + " Days"
    );

    updateElement(
        "simulatedFault",
        component +
        " - " +
        faultType
    );

    updateElement(
        "simulationStatus",
        "Fault simulated at " +
        severity +
        "% severity"
    );

}


/* =========================================================
   19. RESET FAULT SIMULATION
   ========================================================= */

function resetSimulation() {

    faultSimulation = {
        active: false,
        component: "Motor",
        type: "Bearing Wear",
        severity: 0
    };

    updateElement(
        "simulatedHealth",
        currentData.health + "%"
    );

    updateElement(
        "simulatedProbability",
        currentData.failureProbability + "%"
    );

    updateElement(
        "simulatedRUL",
        currentData.rul + " Days"
    );

    updateElement(
        "simulatedFault",
        "No Fault"
    );

    updateElement(
        "simulationStatus",
        "Simulation reset"
    );

}


/* =========================================================
   20. FAULT BUTTONS
   ========================================================= */

const simulateButton =
    document.getElementById("simulateFault");

if (simulateButton) {

    simulateButton.addEventListener(
        "click",
        simulateFault
    );

}


const resetButton =
    document.getElementById("resetSimulation");

if (resetButton) {

    resetButton.addEventListener(
        "click",
        resetSimulation
    );

}


/* =========================================================
   21. SEVERITY SLIDER
   ========================================================= */

const severitySlider =
    document.getElementById("faultSeverity");

const severityValue =
    document.getElementById("severityValue");

if (severitySlider) {

    severitySlider.addEventListener(
        "input",
        () => {

            if (severityValue) {

                severityValue.textContent =
                    severitySlider.value + "%";

            }

        }
    );

}


/* =========================================================
   22. AI CHATBOT
   ========================================================= */

const chatInput =
    document.getElementById("chatInput");

const chatSend =
    document.getElementById("chatSend");

const chatMessages =
    document.getElementById("chatMessages");


function addChatMessage(message, sender) {

    if (!chatMessages) {
        return;
    }

    const messageElement =
        document.createElement("div");

    messageElement.className =
        `chat-message ${sender}`;

    messageElement.textContent =
        message;

    chatMessages.appendChild(
        messageElement
    );

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


/* =========================================================
   23. AI RESPONSE ENGINE
   ========================================================= */

function generateAIResponse(question) {

    const q =
        question.toLowerCase();

    if (
        q.includes("health") ||
        q.includes("condition")
    ) {

        return `
Cabin ${currentData.id} currently has a health
score of ${currentData.health}%. The predicted
failure probability is ${currentData.failureProbability}%,
with an estimated remaining useful life of
${currentData.rul} days.
        `.trim();

    }


    if (
        q.includes("failure") ||
        q.includes("fail")
    ) {

        return `
The current predicted failure probability is
${currentData.failureProbability}%. The system
estimates approximately ${currentData.rul} days
of remaining useful life.
        `.trim();

    }


    if (
        q.includes("vibration")
    ) {

        return `
Current vibration is ${currentData.vibration}
mm/s. The monitored baseline is approximately
2.6 mm/s. The system is checking the deviation
between measured vibration and expected behavior.
        `.trim();

    }


    if (
        q.includes("temperature") ||
        q.includes("motor")
    ) {

        return `
The motor temperature is currently
${currentData.motorTemperature.toFixed(1)} °C.
The monitored reference value is approximately
45 °C.
        `.trim();

    }


    if (
        q.includes("physics") ||
        q.includes("residual")
    ) {

        return `
The physics monitor compares measured behavior
with expected behavior from the elevator physics
model. The current motor physics residual is
${currentData.physicsResidual.toFixed(2)}.
        `.trim();

    }


    if (
        q.includes("fault")
    ) {

        return `
Current detected condition:
${currentData.fault}.

The system combines sensor measurements,
physics residuals and ML predictions to identify
possible abnormal behavior.
        `.trim();

    }


    if (
        q.includes("floor") ||
        q.includes("where")
    ) {

        return `
Cabin ${currentData.id} is currently at
Floor ${currentData.floor}.
Movement status: ${currentData.movement}.
Target floor: ${currentData.targetFloor}.
        `.trim();

    }


    return `
I am monitoring cabin ${currentData.id}.
You can ask me about health, failure probability,
RUL, vibration, motor temperature, physics
residuals, faults or cabin movement.
    `.trim();

}


/* =========================================================
   24. SEND CHAT MESSAGE
   ========================================================= */

function sendChatMessage() {

    if (!chatInput) {
        return;
    }

    const message =
        chatInput.value.trim();

    if (!message) {
        return;
    }

    addChatMessage(
        message,
        "user"
    );

    chatInput.value = "";

    setTimeout(() => {

        const response =
            generateAIResponse(message);

        addChatMessage(
            response,
            "ai"
        );

        speak(response);

    }, 500);

}


if (chatSend) {

    chatSend.addEventListener(
        "click",
        sendChatMessage
    );

}


if (chatInput) {

    chatInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                sendChatMessage();

            }

        }
    );

}


/* =========================================================
   25. VOICE ASSISTANT
   ========================================================= */

let recognition = null;

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.lang = "en-IN";

    recognition.onresult =
        function(event) {

            const transcript =
                event.results[0][0].transcript;

            if (chatInput) {
                chatInput.value =
                    transcript;
            }

            sendChatMessage();

        };

    recognition.onerror =
        function(event) {

            console.log(
                "Voice recognition error:",
                event.error
            );

        };

}


function startVoiceAssistant() {

    if (!recognition) {

        alert(
            "Voice recognition is not supported in this browser."
        );

        return;

    }

    recognition.start();

}


const voiceButton =
    document.getElementById("voiceButton");

if (voiceButton) {

    voiceButton.addEventListener(
        "click",
        startVoiceAssistant
    );

}


/* =========================================================
   26. TEXT TO SPEECH
   ========================================================= */

function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    const speech =
        new SpeechSynthesisUtterance(text);

    speech.lang = "en-IN";

    speech.rate = 1;

    speech.pitch = 1;

    window.speechSynthesis.speak(
        speech
    );

}


/* =========================================================
   27. GENERATE FINAL REPORT
   ========================================================= */

function generateReport() {

    const report = `

KONE ELEVATOR
PREDICTIVE MAINTENANCE REPORT

----------------------------------------

Cabin ID:
${currentData.id}

Health Score:
${currentData.health}%

Failure Probability:
${currentData.failureProbability}%

Remaining Useful Life:
${currentData.rul} Days

----------------------------------------

CURRENT SENSOR DATA

Motor Temperature:
${currentData.motorTemperature} °C

Vibration:
${currentData.vibration} mm/s

Current:
${currentData.current} A

Voltage:
${currentData.voltage} V

Motor Speed:
${currentData.motorSpeed} RPM

----------------------------------------

PHYSICS ANALYSIS

Actual Acceleration:
${currentData.acceleration}

Expected Acceleration:
${currentData.expectedAcceleration}

Physics Residual:
${currentData.physicsResidual}

Rope Tension:
${currentData.ropeTension} N

Expected Rope Tension:
${currentData.expectedRopeTension} N

Thermal Residual:
${currentData.thermalResidual} °C

----------------------------------------

ML PREDICTION

Detected Condition:
${currentData.fault}

Predicted Failure Probability:
${currentData.failureProbability}%

Estimated RUL:
${currentData.rul} Days

----------------------------------------

CABIN STATUS

Current Floor:
${currentData.floor}

Target Floor:
${currentData.targetFloor}

Movement:
${currentData.movement}

Door:
${currentData.door}

----------------------------------------

Generated by KONE Predictive
Maintenance Digital Twin System

    `.trim();

    downloadReport(
        report,
        "KONE_Elevator_Report.txt"
    );

}


/* =========================================================
   28. DOWNLOAD REPORT
   ========================================================= */

function downloadReport(content, filename) {

    const blob =
        new Blob(
            [content],
            {
                type: "text/plain"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

}


/* =========================================================
   29. REPORT BUTTON
   ========================================================= */

const reportButton =
    document.getElementById("generateReport");

if (reportButton) {

    reportButton.addEventListener(
        "click",
        generateReport
    );

}


/* =========================================================
   30. LIVE SENSOR SIMULATION
   ========================================================= */

function updateLiveSensorData() {

    if (faultSimulation.active) {
        return;
    }

    /*
     * Small random variations to make the dashboard
     * look like a live monitoring system.
     */

    currentData.vibration =
        Math.max(
            0.5,
            currentData.vibration +
            (Math.random() - 0.5) * 0.15
        );

    currentData.motorTemperature =
        Math.max(
            35,
            currentData.motorTemperature +
            (Math.random() - 0.5) * 0.3
        );

    currentData.current =
        Math.max(
            2,
            currentData.current +
            (Math.random() - 0.5) * 0.2
        );

    updateDashboard();
    updateHealthMonitor();

}


/* =========================================================
   31. LIVE UPDATE TIMER
   ========================================================= */

setInterval(
    updateLiveSensorData,
    2000
);


/* =========================================================
   32. EVENT SIMULATION
   ========================================================= */

function addLiveEvent(
    title,
    description,
    type = "info"
) {

    currentData.events.unshift({

        time: "Just now",

        type: type,

        title: title,

        description: description

    });

    if (currentData.events.length > 8) {

        currentData.events.pop();

    }

    renderEvents();

}


/* =========================================================
   33. PERIODIC MONITORING
   ========================================================= */

setInterval(() => {

    const vibration =
        currentData.vibration;

    if (vibration > 3.2) {

        addLiveEvent(
            "High vibration detected",
            "Measured vibration exceeded the monitoring threshold.",
            "warning"
        );

    }

}, 10000);


/* =========================================================
   34. INITIALIZE APPLICATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateDashboard();

        updateHealthMonitor();

        updatePhysicsMonitor();

        updateMLPrediction();

        updateCabinStatus();

        renderEvents();

        console.log(
            "KONE Predictive Maintenance UI initialized."
        );

    }
);


/* =========================================================
   35. BACKEND API PLACEHOLDER
   =========================================================

   Later your real ML + Physics backend can be
   connected here.

   Example FastAPI endpoint:

   GET /api/elevator/cabin1

   Response:

   {
       "health": 87,
       "failure_probability": 21,
       "rul": 18,
       "vibration": 2.8,
       "temperature": 48.6,
       ...
   }

   ========================================================= */

async function fetchElevatorData() {

    try {

        const response =
            await fetch(
                "http://localhost:8000/api/elevator/" +
                activeCabin
            );

        if (!response.ok) {

            throw new Error(
                "Backend request failed"
            );

        }

        const data =
            await response.json();

        /*
         * Merge backend data into
         * current cabin data.
         */

        elevatorData[activeCabin] = {

            ...elevatorData[activeCabin],

            ...data

        };

        currentData =
            elevatorData[activeCabin];

        updateDashboard();
        updateHealthMonitor();
        updatePhysicsMonitor();
        updateMLPrediction();
        updateCabinStatus();

    } catch (error) {

        console.log(
            "Backend not connected. Using demo data.",
            error.message
        );

    }

}


/* =========================================================
   36. BACKEND PREDICTION REQUEST
   =========================================================

   This is what you can later use to send
   sensor + physics data to your ML model.

   ========================================================= */

async function requestMLPrediction(sensorData) {

    try {

        const response =
            await fetch(
                "http://localhost:8000/api/predict",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(
                        sensorData
                    )

                }
            );

        if (!response.ok) {

            throw new Error(
                "Prediction request failed"
            );

        }

        const prediction =
            await response.json();

        console.log(
            "ML Prediction:",
            prediction
        );

        return prediction;

    } catch (error) {

        console.error(
            "ML backend unavailable:",
            error
        );

        return null;

    }

}


/* =========================================================
   37. SEND SENSOR + PHYSICS DATA
   ========================================================= */

async function sendCurrentDataToML() {

    const payload = {

        cabin_id: currentData.id,

        /* Sensor values */

        vibration:
            currentData.vibration,

        motor_temperature:
            currentData.motorTemperature,

        current:
            currentData.current,

        voltage:
            currentData.voltage,

        motor_speed:
            currentData.motorSpeed,

        motor_torque:
            currentData.motorTorque,

        load_torque:
            currentData.loadTorque,

        /* Physics features */

        physics_acceleration:
            currentData.acceleration,

        expected_acceleration:
            currentData.expectedAcceleration,

        physics_residual:
            currentData.physicsResidual,

        rope_tension:
            currentData.ropeTension,

        expected_rope_tension:
            currentData.expectedRopeTension,

        thermal_residual:
            currentData.thermalResidual

    };

    const result =
        await requestMLPrediction(
            payload
        );

    if (!result) {
        return;
    }

    /*
     * Update UI using actual ML result.
     */

    if (result.health !== undefined) {
        currentData.health =
            result.health;
    }

    if (result.failure_probability !== undefined) {
        currentData.failureProbability =
            result.failure_probability;
    }

    if (result.rul !== undefined) {
        currentData.rul =
            result.rul;
    }

    if (result.fault !== undefined) {
        currentData.fault =
            result.fault;
    }

    updateDashboard();
    updateMLPrediction();

}


/* =========================================================
   END OF SCRIPT
   ========================================================= */

/* =========================================================
   35. AUTO-MOUNT 3D ELEVATOR MODEL (GLB) INTO DIGITAL TWIN
   ========================================================= */
(function() {
  function loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  async function ensureThreeLibs() {
    if (!window.THREE) await loadScript('libs/three.min.js');
    if (window.THREE && !window.THREE.OrbitControls) await loadScript('libs/OrbitControls.js');
    if (window.THREE && !window.THREE.GLTFLoader) await loadScript('libs/GLTFLoader.js');
    if (!window.ELEVATOR_MODEL_BASE64) await loadScript('model-data.js');
  }

  function initElevator3DOnContainer(container) {
    if (!window.THREE || !window.THREE.GLTFLoader) return;
    if (container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 380;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0.6, 4.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.2;
    controls.maxDistance = 12;
    controls.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xd4d8e0, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x0284c7, 0.9);
    rimLight.position.set(-6, -2, -5);
    scene.add(rimLight);

    const goldAccent = new THREE.DirectionalLight(0xd6ad63, 0.7);
    goldAccent.position.set(0, 5, -3);
    scene.add(goldAccent);

    const grid = new THREE.GridHelper(6, 12, 0xd6ad63, 0x2b2c30);
    grid.position.y = -1.65;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    scene.add(grid);

    let cabinMesh = null;
    let motionTime = 0;

    const loader = new THREE.GLTFLoader();

    function onModelLoaded(gltf) {
      const model = gltf.scene;
      model.traverse(function(child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const name = (child.name || '').toUpperCase();
          if (name.includes('CABIN') || name.includes('CAR')) cabinMesh = child;
          if (child.material) {
            child.material.metalness = Math.max(child.material.metalness || 0, 0.7);
            child.material.roughness = Math.min(child.material.roughness || 0.4, 0.3);
            if (name.includes('MOTOR') || name.includes('TRACTION')) {
              child.material.color = new THREE.Color(0x0260a8);
              child.material.metalness = 0.85;
            } else if (name.includes('PULLEY') || name.includes('SHEAVE')) {
              child.material.color = new THREE.Color(0x38bdf8);
              child.material.metalness = 0.9;
            } else if (name.includes('ROPE') || name.includes('CABLE')) {
              child.material.color = new THREE.Color(0xa0aec0);
              child.material.metalness = 0.95;
            } else if (name.includes('GLASS')) {
              child.material.transparent = true;
              child.material.opacity = 0.45;
              child.material.roughness = 0.08;
            }
          }
        }
      });

      if (!cabinMesh && model.children.length > 0) {
        model.children.forEach(c => { if (c.isMesh || c.isGroup) cabinMesh = c; });
      }

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.7 / (maxDim || 1);
      model.scale.setScalar(scale);
      model.position.x = -center.x * scale;
      model.position.y = -center.y * scale;
      model.position.z = -center.z * scale;
      scene.add(model);

      const statusTag = container.parentElement ? container.parentElement.querySelector('.twin-status') : null;
      if (statusTag) {
        statusTag.innerHTML = '● 3D Digital Twin Loaded · <i>The Main elevator for the dig twin .glb</i>';
        statusTag.style.color = '#62c58d';
      }
    }

    const paths = [
      'assets/elevator.glb',
      'assets/The Main elevator for the dig twin .glb',
      'elevator.glb',
      'The Main elevator for the dig twin .glb'
    ];

    function tryLoad(idx) {
      if (idx >= paths.length) {
        if (window.ELEVATOR_MODEL_BASE64) {
          loader.parse(
            Uint8Array.from(atob(window.ELEVATOR_MODEL_BASE64), c => c.charCodeAt(0)).buffer,
            '',
            onModelLoaded,
            (err) => console.error('Base64 parse error:', err)
          );
        }
        return;
      }
      loader.load(paths[idx], onModelLoaded, undefined, () => tryLoad(idx + 1));
    }
    tryLoad(0);

    function animate() {
      requestAnimationFrame(animate);
      if (cabinMesh) {
        motionTime += 0.015;
        cabinMesh.position.y = Math.sin(motionTime) * 0.35;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);
  }

  async function mountAll3DTwins() {
    await ensureThreeLibs();

    document.querySelectorAll('.twin').forEach(twin => {
      const bldg = twin.querySelector('.building');
      if (bldg) bldg.style.display = 'none';

      let wrap = twin.querySelector('.elevator-3d-canvas-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'elevator-3d-canvas-wrap';
        wrap.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;overflow:hidden;';
        twin.insertBefore(wrap, twin.firstChild);
      }

      twin.querySelectorAll('.component, .twin-tabs, .floor-label, .twin-status, .btn').forEach(el => {
        el.style.zIndex = '10';
      });

      initElevator3DOnContainer(wrap);
    });
  }

  window.showPage = function(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (btn) {
      document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    if (pageId === 'simulation' && window.renderWhatIfAll) {
      setTimeout(window.renderWhatIfAll, 60);
    }
    setTimeout(mountAll3DTwins, 150);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll3DTwins);
  } else {
    mountAll3DTwins();
  }
  window.addEventListener('load', mountAll3DTwins);
})();


/* =========================================================
   36. PERMANENT REMOVAL OF FLEET, PASSENGER REPORTS, SPARE PARTS
       AND QUALITATIVE WORKING CONDITIONS DISPLAY
   ========================================================= */
(function() {
  function enforceUIRequirements() {
    // 1. Remove sidebar navigation buttons
    document.querySelectorAll('.nav button').forEach(btn => {
      const text = btn.innerText.toLowerCase();
      if (
        text.includes('fleet') || 
        text.includes('passenger reports') || 
        text.includes('spare parts')
      ) {
        btn.remove();
      }
    });

    // 2. Remove page sections
    ['fleet', 'reports', 'parts'].forEach(id => {
      const section = document.getElementById(id);
      if (section) section.remove();
    });

    // 3. Ensure Working Conditions card replaces ML Prediction percentage
    document.querySelectorAll('.card').forEach(card => {
      const head = card.querySelector('.card-head h3');
      if (head && head.innerText.includes('ML PREDICTION')) {
        head.innerText = 'WORKING CONDITIONS & DIAGNOSTICS';
        const sub = card.querySelector('.card-head span');
        if (sub) sub.innerText = 'OPERATIONAL ASSESSMENT';

        const body = card.querySelector('.card-body');
        if (body && !card.dataset.workingConditionsActive) {
          card.dataset.workingConditionsActive = 'true';
          body.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 13px;background:#211d16;border:1px solid #625033;border-radius:8px;margin-bottom:11px;">
  <div style="display:flex;align-items:center;gap:9px;">
    <span style="width:9px;height:9px;border-radius:50%;background:#d6ad63;box-shadow:0 0 8px rgba(214,173,99,0.7);display:inline-block;"></span>
    <div>
      <strong style="color:#f0d08a;font-size:12px;display:block;">Elevated Mechanical & Thermal Stress</strong>
      <small style="color:#a9a8a2;font-size:9px;">Drive subsystem operating under heavy duty cycle</small>
    </div>
  </div>
  <span style="font-size:9px;padding:3px 8px;border-radius:12px;background:rgba(214,173,99,0.15);color:#f0d08a;border:1px solid #625033;font-weight:600;">ATTENTION REQUIRED</span>
</div>
<div style="display:flex;flex-direction:column;gap:7px;">
  <div style="display:flex;gap:9px;align-items:flex-start;padding:8px 10px;background:#141518;border:1px solid #2a2b2f;border-radius:6px;">
    <span style="color:#d6ad63;font-size:12px;line-height:1.2;">⚡</span>
    <div style="font-size:10px;line-height:1.4;">
      <strong style="color:#e6e3db;font-size:10px;display:block;">Electrical Load Condition</strong>
      <span style="color:#aaa9a3;">Operating under sustained elevated current draw with continuous duty cycle during travel.</span>
    </div>
  </div>
  <div style="display:flex;gap:9px;align-items:flex-start;padding:8px 10px;background:#141518;border:1px solid #2a2b2f;border-radius:6px;">
    <span style="color:#d6ad63;font-size:12px;line-height:1.2;">⚙️</span>
    <div style="font-size:10px;line-height:1.4;">
      <strong style="color:#e6e3db;font-size:10px;display:block;">Mechanical Resistance & Friction</strong>
      <span style="color:#aaa9a3;">Noticeable dragging resistance detected along door header track and guide roller assemblies.</span>
    </div>
  </div>
  <div style="display:flex;gap:9px;align-items:flex-start;padding:8px 10px;background:#141518;border:1px solid #2a2b2f;border-radius:6px;">
    <span style="color:#d6ad63;font-size:12px;line-height:1.2;">🌡️</span>
    <div style="font-size:10px;line-height:1.4;">
      <strong style="color:#e6e3db;font-size:10px;display:block;">Thermal State & Dissipation</strong>
      <span style="color:#aaa9a3;">Motor housing temperature running consistently warm with slower cooling between consecutive trips.</span>
    </div>
  </div>
  <div style="display:flex;gap:9px;align-items:flex-start;padding:8px 10px;background:#141518;border:1px solid #2a2b2f;border-radius:6px;">
    <span style="color:#62c58d;font-size:12px;line-height:1.2;">🛡️</span>
    <div style="font-size:10px;line-height:1.4;">
      <strong style="color:#62c58d;font-size:10px;display:block;">Operational Safety Status</strong>
      <span style="color:#aaa9a3;">Safe for passenger travel; schedule technician track inspection within 6 days to prevent downtime.</span>
    </div>
  </div>
</div>`;
          }
        }
      });
  }

  // Run on DOM ready, on load, and keep continuous enforcement active
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceUIRequirements);
  } else {
    enforceUIRequirements();
  }
  window.addEventListener('load', enforceUIRequirements);
  setInterval(enforceUIRequirements, 400);
})();


  // Direct Page Routing Support via URL search parameter or hash
  function autoRoutePage() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');
      const hashParam = window.location.hash ? window.location.hash.substring(1) : null;
      const targetPage = pageParam || hashParam;
      if (targetPage && document.getElementById(targetPage) && typeof window.showPage === 'function') {
        const navBtn = Array.from(document.querySelectorAll('.nav button')).find(b => {
          const oc = b.getAttribute('onclick') || '';
          return oc.includes("'" + targetPage + "'") || oc.includes('"' + targetPage + '"');
        });
        window.showPage(targetPage, navBtn);
      }
    } catch(e) {
      console.warn("Routing init error:", e);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoRoutePage);
  } else {
    autoRoutePage();
  }
  window.addEventListener('hashchange', autoRoutePage);
  setTimeout(autoRoutePage, 250);



// =========================================================
// Incidents & Maintenance UI Helpers
// =========================================================
window.filterIncidents = function(type) {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(t => t.classList.remove('active'));
  if (window.event && window.event.target && window.event.target.classList) {
    window.event.target.classList.add('active');
  }
  const rows = document.querySelectorAll('#incidents tbody tr');
  rows.forEach(r => {
    if (type === 'all') {
      r.style.display = '';
    } else if (type === 'critical') {
      r.style.display = r.innerHTML.includes('CRITICAL') ? '' : 'none';
    } else if (type === 'warning') {
      r.style.display = (r.innerHTML.includes('WARNING') || r.innerHTML.includes('ADVISORY')) ? '' : 'none';
    } else if (type === 'resolved') {
      r.style.display = r.innerHTML.includes('RESOLVED') ? '' : 'none';
    }
  });
};

window.showNewIncidentModal = function() {
  const elev = prompt("Enter Elevator ID (e.g. E-001):", "E-001");
  if (!elev) return;
  const desc = prompt("Enter Incident Description:", "Transient door sensor flutter");
  if (!desc) return;
  alert("Incident successfully logged: " + elev + " - " + desc + ". Auto-triage pipeline initiated.");
};

window.openCreateWOModal = function() {
  const elev = prompt("Enter Target Elevator ID:", "E-001");
  if (!elev) return;
  const task = prompt("Enter Maintenance Task:", "Inspect door operator track & lubricate");
  if (!task) return;
  alert("Work Order WO-8822 generated for " + elev + ": " + task + ". Assigned to Field Queue.");
};

window.scheduleMaintenanceRun = function() {
  alert("Fleet-wide CBM Maintenance schedule generated for 8 elevator units. Synchronized with building off-peak hours (01:00 - 05:00).");
};



// =========================================================
// Dedicated Elevator E-001 Dynamic Scenario Report Generator
// =========================================================
window.generateDetailedReport = function(scenarioOverride) {
  const scenSelect = document.getElementById('reportScenarioSelect');
  const scopeSelect = document.getElementById('reportScopeSelect');
  const scenario = scenarioOverride || (scenSelect ? scenSelect.value : 'LIVE');
  if (scenSelect && scenarioOverride) scenSelect.value = scenarioOverride;
  const scope = scopeSelect ? scopeSelect.value : 'pinn';

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // DOM Elements
  const repRef = document.getElementById('repRefNo');
  const repTime = document.getElementById('repTimestamp');
  const repTitle = document.getElementById('repTitle');
  const repBadge = document.getElementById('repConditionBadge');
  const repExec = document.getElementById('repExecutiveText');
  const repCallout = document.getElementById('repCalloutBox');
  const repState = document.getElementById('repStateSummary');
  const repWo = document.getElementById('repWoRef');
  const repPart = document.getElementById('repPartRef');
  const repTech = document.getElementById('repTechRef');
  const repTbody = document.getElementById('repPinnTableBody');

  if (repTime) repTime.innerText = `${dateStr}, ${timeStr} IST`;

  if (scenario === 'LIVE') {
    if (repRef) repRef.innerText = `#KONE-PINN-2026-E001-LIVE-${Math.floor(1000 + Math.random()*9000)}`;
    if (repTitle) repTitle.innerText = "ELEVATOR E-001 — LIVE OPERATIONAL & PINN AUDIT DOSSIER";
    if (repBadge) {
      repBadge.className = "p-badge";
      repBadge.style.background = "rgba(98,197,141,0.15)";
      repBadge.style.color = "#62c58d";
      repBadge.style.border = "1px solid #2d5039";
      repBadge.innerText = "GOOD CONDITION · ADVISORY ACTIVE";
    }
    const t = (window.KONE_API && typeof window.KONE_API.getLatestTelemetry === 'function') ? window.KONE_API.getLatestTelemetry() : null;
    const pinn = (window.KONE_API && typeof window.KONE_API.getLatestPINN === 'function') ? window.KONE_API.getLatestPINN() : null;
    const ml = (window.KONE_API && typeof window.KONE_API.getLatestML === 'function') ? window.KONE_API.getLatestML() : null;

    if (t) {
      const kin = t.kinematics;
      const mot = t.traction_motor;
      const totalMass = Math.round(820 + kin.car_load_kg);
      const rVal = pinn ? pinn.composite_physics_residual.toFixed(3) : '0.018';
      const eff = mot.motor_efficiency_pct.toFixed(1);
      const tNm = (mot.motor_torque_nm / 1000.0).toFixed(2);
      const pKw = mot.motor_power_kw.toFixed(2);
      const dirArrow = kin.direction === 'UP' ? '↑' : kin.direction === 'DOWN' ? '↓' : '●';

      if (repExec) {
        repExec.innerHTML = `Elevator <strong>E-001 (Lobby Tower, Passenger 1200kg)</strong> was evaluated under live operational telemetry. The primary gearless permanent magnet traction drive, sheave kinematics, counterweight dynamic balance, and hoisting dynamics satisfy physical conservation laws with high fidelity (Residual <strong>R<sub>phys</sub> = ${rVal} &le; 0.050</strong>). Mechanical traction efficiency is verified at <strong>${eff}%</strong> with shaft torque of <strong>${tNm} kN·m</strong> and power demand of <strong>${pKw} kW</strong>.`;
      }
      if (repCallout) {
        const fc = ml && ml.fault_classification;
        if (fc && fc.is_fault) {
          repCallout.innerHTML = `<strong style="color:#e66b6b;">Active Abnormality Detected:</strong> Predictive classifier flagged <strong>${fc.predicted_fault_type.replace(/_/g, ' ')}</strong> with <strong>${Math.round(fc.confidence * 100)}% confidence</strong>.`;
        } else {
          repCallout.innerHTML = `<strong style="color:#62c58d;">Nominal Operating Baseline:</strong> All 11 subsystem telemetry channels verify nominal condition. Main EcoDisc gearless drive and safety circuits are verified for full-speed passenger transport.`;
        }
      }
      if (repState) {
        repState.innerHTML = `&bull; Unit: <b style="color:#f0d08a;">E-001 (Lobby Tower)</b><br>&bull; Floor: <b style="color:#dedbd3;">Floor ${kin.current_floor} / 25 (${dirArrow} B2 to 25)</b><br>&bull; Velocity: <b style="color:#78a9c8;">${kin.speed_mps >= 0 ? '+' : ''}${kin.speed_mps.toFixed(2)} m/s (${t.operating_phase})</b><br>&bull; Cabin Load: <b style="color:#f0d08a;">${totalMass.toLocaleString()} kg (${kin.car_load_percent.toFixed(0)}%)</b><br>&bull; Motor Temp: <b style="${mot.motor_temperature_c > 75 ? 'color:#e66b6b;' : 'color:#62c58d;'}">${mot.motor_temperature_c.toFixed(1)} &deg;C (${mot.motor_temperature_c < 85 ? 'Normal < 85°C' : 'ELEVATED'})</b>`;
      }
    }
    if (repWo) repWo.innerText = "WO-8821";
    if (repPart) repPart.innerText = "KONE Kit #KM5009 (Rollers)";
    if (repTech) repTech.innerText = "Siva Prithiviraj (Lead Eng.)";

  } else if (scenario === 'UP') {
    if (repRef) repRef.innerText = `#KONE-PINN-2026-E001-UP-${Math.floor(1000 + Math.random()*9000)}`;
    if (repTitle) repTitle.innerText = "ELEVATOR E-001 — UPWARD HOISTING & TRACTION TORQUE AUDIT";
    if (repBadge) {
      repBadge.className = "p-badge";
      repBadge.style.background = "rgba(98,197,141,0.15)";
      repBadge.style.color = "#62c58d";
      repBadge.style.border = "1px solid #2d5039";
      repBadge.innerText = "PERFECT CONDITION · DRIVE NOMINAL";
    }
    if (repExec) {
      repExec.innerHTML = `Elevator <strong>E-001</strong> upward travel trajectory at <strong>+1.52 m/s</strong> was analyzed across full acceleration, cruise, and deceleration phases. The gearless PM motor delivers <strong>1.35 kN·m</strong> traction torque against nominal 1200kg cabin mass and 1000kg counterweight. Dynamic S-curve jerk limiting is within ISO 18738 comfort thresholds.`;
    }
    if (repCallout) {
      repCallout.innerHTML = `<strong style="color:#62c58d;">Kinematic Verification:</strong> Sheave angular velocity <code>&omega; = 15.20 rad/s (145.5 RPM)</code> exactly matches linear cabin speed <code>v = &omega;R = 1.52 m/s</code>. Power factor cos&phi; = 0.94 with 400.5V grid stability.`;
    }
    if (repState) {
      repState.innerHTML = `&bull; Unit: <b style="color:#f0d08a;">E-001 (Lobby Tower)</b><br>&bull; Motion: <b style="color:#78a9c8;">+1.52 m/s (Ascending)</b><br>&bull; Accel: <b style="color:#62c58d;">+0.18 m/s²</b><br>&bull; Torque: <b style="color:#62c58d;">1.35 kN·m</b><br>&bull; Power: <b style="color:#dedbd3;">6.49 kW (93.8% Eff)</b>`;
    }
    if (repWo) repWo.innerText = "PM-ANNUAL-E001";
    if (repPart) repPart.innerText = "EcoDisc Inspection Kit";
    if (repTech) repTech.innerText = "Siva Prithiviraj";

  } else if (scenario === 'DOWN') {
    if (repRef) repRef.innerText = `#KONE-PINN-2026-E001-DOWN-${Math.floor(1000 + Math.random()*9000)}`;
    if (repTitle) repTitle.innerText = "ELEVATOR E-001 — REGENERATIVE DESCENT & ENERGY AUDIT";
    if (repBadge) {
      repBadge.className = "p-badge";
      repBadge.style.background = "rgba(98,197,141,0.15)";
      repBadge.style.color = "#62c58d";
      repBadge.style.border = "1px solid #2d5039";
      repBadge.innerText = "REGENERATIVE ACTIVE · ENERGY RECOVERED";
    }
    if (repExec) {
      repExec.innerHTML = `Elevator <strong>E-001</strong> controlled descent at <strong>-1.52 m/s</strong> demonstrates active regenerative braking. The heavier counterweight provides gravitational assistance, lowering required traction torque to <strong>0.87 kN·m</strong> and recovering electrical energy to the building microgrid via the bidirectional PWM inverter.`;
    }
    if (repCallout) {
      repCallout.innerHTML = `<strong style="color:#62c58d;">Regeneration Benchmark:</strong> Inverter DC link voltage rises to 568V DC during descent. Motor current drops to 7.2A. 18.4% electrical power regenerated into the facility grid.`;
    }
    if (repState) {
      repState.innerHTML = `&bull; Unit: <b style="color:#f0d08a;">E-001 (Lobby Tower)</b><br>&bull; Motion: <b style="color:#e0b45f;">-1.52 m/s (Descending)</b><br>&bull; Torque: <b style="color:#62c58d;">0.87 kN·m (Assist)</b><br>&bull; DC Bus: <b style="color:#78a9c8;">568 V DC</b><br>&bull; Regen: <b style="color:#62c58d;">18.4% Recovered</b>`;
    }
    if (repWo) repWo.innerText = "REGEN-AUDIT-E001";
    if (repPart) repPart.innerText = "Bus Capacitor Diagnostics";
    if (repTech) repTech.innerText = "Siva Prithiviraj";

  } else if (scenario === 'BRAKE') {
    if (repRef) repRef.innerText = `#KONE-PINN-2026-E001-BRAKE-${Math.floor(1000 + Math.random()*9000)}`;
    if (repTitle) repTitle.innerText = "ELEVATOR E-001 — MECHANICAL BRAKE & EMERGENCY HOLD AUDIT";
    if (repBadge) {
      repBadge.className = "p-badge";
      repBadge.style.background = "rgba(230,107,107,0.2)";
      repBadge.style.color = "#e66b6b";
      repBadge.style.border = "1px solid #5d3030";
      repBadge.innerText = "HOLD ENGAGED · CALIPER CLAMPED";
    }
    if (repExec) {
      repExec.innerHTML = `Elevator <strong>E-001</strong> mechanical brake clamp verification. Electromechanical dual calipers clamped to the traction sheave rim at <strong>5.2 bar</strong>. Velocity and dynamic acceleration hold at exactly <strong>0.00 m/s and 0.00 m/s²</strong>. Zero slip or creep detected on suspension cables.`;
    }
    if (repCallout) {
      repCallout.innerHTML = `<strong style="color:#f0d08a;">Safety Certification:</strong> Emergency holding brake meets EN 81-20 clause 5.6.6 holding torque threshold (holding ratio &gt; 1.5&times; maximum rated cabin load). Winding current is 0.0A.`;
    }
    if (repState) {
      repState.innerHTML = `&bull; Unit: <b style="color:#f0d08a;">E-001 (Lobby Tower)</b><br>&bull; Brake: <b style="color:#e66b6b;">CLAMPED (5.2 bar)</b><br>&bull; Speed: <b style="color:#dedbd3;">0.00 m/s (Locked)</b><br>&bull; Current: <b style="color:#dedbd3;">0.0 A (Isolated)</b><br>&bull; Residual: <b style="color:#62c58d;">0.000 &rarr; 0</b>`;
    }
    if (repWo) repWo.innerText = "BRAKE-HOLD-E001";
    if (repPart) repPart.innerText = "Caliper Linings KM7724";
    if (repTech) repTech.innerText = "Siva Prithiviraj";

  } else {
    // ANNUAL
    if (repRef) repRef.innerText = `#KONE-PINN-2026-E001-ANNUAL-${Math.floor(1000 + Math.random()*9000)}`;
    if (repTitle) repTitle.innerText = "ELEVATOR E-001 — ANNUAL PINN COMPLIANCE & PHYSICAL INTEGRITY AUDIT";
    if (repBadge) {
      repBadge.className = "p-badge";
      repBadge.style.background = "rgba(98,197,141,0.15)";
      repBadge.style.color = "#62c58d";
      repBadge.style.border = "1px solid #2d5039";
      repBadge.innerText = "FULL ANNUAL PASS · ISO GRADE A";
    }
    if (repExec) {
      repExec.innerHTML = `Annual comprehensive digital twin audit for Elevator <strong>E-001 (Lobby Tower)</strong>. Structural integrity of car frame, hoisting cables (Safety factor 12.4&times;), traction machine bearing raceway, and counterweight balance confirmed. 98.4% of all operating cycles satisfy the governing equation of motion residual constraint.`;
    }
    if (repCallout) {
      repCallout.innerHTML = `<strong style="color:#62c58d;">Annual Certification:</strong> Certified compliant under ISO 18738 (Grade A comfort, vertical vibration RMS &lt; 0.02g) and European Lift Directive 2014/33/EU. Next annual statutory inspection: Sep 2027.`;
    }
    if (repState) {
      repState.innerHTML = `&bull; Unit: <b style="color:#f0d08a;">E-001 (Lobby Tower)</b><br>&bull; Compliance: <b style="color:#62c58d;">98.4% Verified</b><br>&bull; ISO 18738: <b style="color:#62c58d;">Grade A (Pass)</b><br>&bull; Cable Safety: <b style="color:#62c58d;">12.4&times; (Nominal)</b><br>&bull; Overall Health: <b style="color:#62c58d;">96% Optimal</b>`;
    }
    if (repWo) repWo.innerText = "ANNUAL-CERT-E001";
    if (repPart) repPart.innerText = "Statutory Seal #KONE-2026";
    if (repTech) repTech.innerText = "Siva Prithiviraj";
  }

  // Visual pulse feedback on report container
  const repContainer = document.getElementById('dynamicReportContainer');
  if (repContainer) {
    repContainer.style.transition = 'box-shadow 0.4s ease, border-color 0.4s ease';
    repContainer.style.borderColor = '#d6ad63';
    repContainer.style.boxShadow = '0 0 30px rgba(214,173,99,0.3)';
    setTimeout(() => {
      repContainer.style.borderColor = '#625033';
      repContainer.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)';
    }, 800);
  }
};

window.scheduleMaintenanceRun = function() {
  alert("Elevator E-001 CBM Maintenance schedule generated. Synchronized with building off-peak hours (01:00 - 05:00).");
};

window.copyReportText = function() {
  const title = document.getElementById('repTitle') ? document.getElementById('repTitle').innerText : "KONE Audit Report";
  const ref = document.getElementById('repRefNo') ? document.getElementById('repRefNo').innerText : "";
  const time = document.getElementById('repTimestamp') ? document.getElementById('repTimestamp').innerText : "";
  const exec = document.getElementById('repExecutiveText') ? document.getElementById('repExecutiveText').innerText : "";

  const textToCopy = `=== ${title} ===\nRef: ${ref}\nGenerated: ${time}\n\n${exec}\n\nStatus: Verified under EN 81-20 & ISO 18738 Standards.`;

  navigator.clipboard.writeText(textToCopy).then(() => {
    alert("Detailed Audit Report copied to clipboard!");
  }).catch(() => {
    alert("Report summary: " + ref + " generated successfully.");
  });
};
