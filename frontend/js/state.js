/**
 * KONE Elevator Digital Twin - Central Data Store & Backend Integration Layer
 * 
 * Every single data point displayed on the dashboard is defined here.
 * When you connect your backend later, you only need to call:
 *   ElevatorStore.updateTelemetry(data)
 *   ElevatorStore.updateFloor(floor, targetFloor, direction)
 *   ElevatorStore.updateHealth(healthData)
 *   ElevatorStore.addEvent(event)
 * Or connect via WebSocket:
 *   ElevatorStore.connectWebSocket("ws://your-backend-api/stream")
 */

(function () {
  'use strict';

  const INITIAL_STATE = {
    // Top Bar & Building Info
    building: {
      name: "Building A — Research Tower",
      shortName: "Building A",
      subtitle: "Research Tower",
      totalFloors: 20,
      ratedLoad: 1000, // kg
      ratedSpeed: 1.75, // m/s
      motorPower: 11, // kW
      installationYear: 2022,
      systemStatus: "Normal Operation", // "Normal Operation", "Warning", "Critical"
      isLive: true
    },

    // Elevator Unit Info & Current Motion
    elevator: {
      id: "Elevator 01",
      model: "KONE MonoSpace 500",
      description: "PINN-based Real-time Digital Twin",
      currentFloor: 8,
      totalFloors: 20,
      direction: "Up", // "Up", "Down", "Idle"
      targetFloor: 15,
      speed: 1.32, // m/s
      todaysTrips: 312,
      // Operational state machine step: "Idle", "Door Opening", "Upward Travel", "Decelerating", "Door Closing", "Idle"
      currentOperation: "Upward Travel",
      operationSteps: [
        "Idle",
        "Door Opening",
        "Upward Travel",
        "Decelerating",
        "Door Closing",
        "Idle"
      ]
    },

    // Live Telemetry (6 Metric Cards)
    telemetry: {
      motorTemperature: {
        value: 78.4,
        unit: "°C",
        delta: "+2.1",
        trend: "up",
        status: "high", // "normal", "high", "warning"
        history: [68, 69, 71, 72, 74, 75, 76.5, 78.4]
      },
      motorCurrent: {
        value: 32.6,
        unit: "A",
        delta: "-0.8",
        trend: "down",
        status: "normal",
        history: [34.1, 33.8, 33.5, 33.1, 32.9, 32.6]
      },
      vibrationRMS: {
        value: 0.42,
        unit: "g",
        delta: "+0.05",
        trend: "up",
        status: "normal",
        history: [0.36, 0.38, 0.39, 0.41, 0.40, 0.42]
      },
      carLoad: {
        value: 650,
        unit: "kg",
        delta: "-20",
        trend: "down",
        status: "normal",
        history: [680, 675, 670, 665, 655, 650]
      },
      carSpeed: {
        value: 1.32,
        unit: "m/s",
        delta: "+0.12",
        trend: "up",
        status: "normal",
        history: [1.10, 1.18, 1.25, 1.28, 1.30, 1.32]
      },
      ambientTemperature: {
        value: 28.6,
        unit: "°C",
        delta: "—",
        trend: "neutral",
        status: "normal",
        history: [28.5, 28.5, 28.6, 28.6, 28.6, 28.6]
      }
    },

    // Physics-Informed Neural Network (PINN) Analysis
    pinnAnalysis: {
      observed: 84.2,
      expected: 76.8,
      deviation: "+7.4 °C",
      physicsStatus: "Abnormal",
      trend: "Increasing",
      whyExplanation: "Higher thermal accumulation than predicted under current load and operating conditions.",
      timePoints: [0, 10, 20, 30, 40, 50, 60],
      observedCurve: [22, 38, 48, 62, 74, 82, 88.5],
      predictedCurve: [22, 36, 46, 56, 65, 71.5, 76.8],
      deviationCurve: [0, 2, 2.5, 4.5, 5.8, 6.7, 7.4],
      deviationAlertStartSec: 40
    },

    // System Health Donut & Subsystems
    systemHealth: {
      overallPercentage: 92,
      statusLabel: "Healthy",
      subtext: "Operating within normal range",
      components: [
        { id: "traction_motor", name: "Traction Motor", health: 88, status: "healthy" },
        { id: "motor_bearings", name: "Motor Bearings", health: 94, status: "healthy" },
        { id: "brake_system", name: "Brake System", health: 96, status: "healthy" },
        { id: "rope_pulley", name: "Rope & Pulley", health: 91, status: "healthy" },
        { id: "controller", name: "Controller", health: 98, status: "healthy" },
        { id: "door_system", name: "Door System", health: 95, status: "healthy" }
      ]
    },

    // Next 60 Seconds Forecast (PINN)
    forecast: {
      maxProjectedTemp: 98,
      peakTimeSec: 60,
      timePoints: [0, 10, 20, 30, 40, 50, 60],
      projectedValues: [48, 55, 63, 72, 81, 90, 98],
      upperConfidence: [52, 60, 69, 78, 88, 97, 105],
      lowerConfidence: [44, 50, 57, 66, 74, 83, 91],
      warningHeadline: "If current trend continues...",
      warningBody: "Temperature will reach 98°C in ~60 seconds. Risk of thermal stress, reduced efficiency and shorter lifespan."
    },

    // AI Recommendation
    recommendation: {
      title: "Monitor temperature closely",
      details: "Consider reducing load if temperature continues to rise. Inspect cooling system at next maintenance window."
    },

    // Recent Events & Alerts
    events: [
      {
        id: "evt-1",
        time: "10:22:14",
        message: "Motor temperature rising faster than expected",
        level: "High", // "High", "Warning", "Info"
        type: "danger"
      },
      {
        id: "evt-2",
        time: "10:15:33",
        message: "Vibration within normal range",
        level: "Info",
        type: "info"
      },
      {
        id: "evt-3",
        time: "10:10:21",
        message: "Peak load operation (650 kg)",
        level: "Warning",
        type: "warning"
      },
      {
        id: "evt-4",
        time: "09:55:12",
        message: "System returned to normal",
        level: "Info",
        type: "info"
      }
    ],

    // 3D Callout Hotspots Coordinates (matching 3D model node hierarchy)
    hotspots: [
      { id: "traction_motor", label: "Traction Motor", nodeName: "TRACTION_MOTOR", active: true, tagType: "green" },
      { id: "controller", label: "Controller", nodeName: "ELEVATOR_CONTROL_PANEL", active: false, tagType: "white" },
      { id: "rope_pulley", label: "Rope & Pulley", nodeName: "MAIN_TRACTION_SHEAVE", active: false, tagType: "white" },
      { id: "guide_rails", label: "Guide Rails", nodeName: "CABIN_GUIDE_RAIL_1", active: false, tagType: "white" },
      { id: "car_cabin", label: "Car Cabin", nodeName: "ELEVATOR_CABIN", active: false, tagType: "white" },
      { id: "counterweight", label: "Counterweight", nodeName: "COUNTERWEIGHT_TOP_FRAME", active: false, tagType: "white" }
    ]
  };

  class Store {
    constructor(state) {
      this.state = JSON.parse(JSON.stringify(state));
      this.listeners = new Map();
      this.socket = null;
      this.pollingInterval = null;
    }

    /**
     * Subscribe to state changes.
     * @param {string} path - State path like 'telemetry', 'elevator.currentFloor', or '*'
     * @param {Function} callback - Callback function(newValue, path)
     */
    subscribe(path, callback) {
      if (!this.listeners.has(path)) {
        this.listeners.set(path, new Set());
      }
      this.listeners.get(path).add(callback);
      return () => {
        if (this.listeners.has(path)) {
          this.listeners.get(path).delete(callback);
        }
      };
    }

    /**
     * Emit change event to subscribers.
     */
    notify(path, value) {
      if (this.listeners.has(path)) {
        this.listeners.get(path).forEach(cb => {
          try { cb(value, path); } catch (e) { console.error(e); }
        });
      }
      // Also notify root listeners
      if (this.listeners.has('*')) {
        this.listeners.get('*').forEach(cb => {
          try { cb(this.state, path); } catch (e) { console.error(e); }
        });
      }
    }

    /**
     * Update nested value safely.
     */
    set(path, value) {
      const parts = path.split('.');
      let curr = this.state;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]]) curr[parts[i]] = {};
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = value;
      this.notify(path, value);
    }

    /**
     * Get value by path.
     */
    get(path) {
      const parts = path.split('.');
      let curr = this.state;
      for (const part of parts) {
        if (curr === undefined || curr === null) return undefined;
        curr = curr[part];
      }
      return curr;
    }

    // ==========================================
    // BACKEND INTEGRATION CONVENIENCE METHODS
    // ==========================================

    /**
     * Update live telemetry batch from backend.
     * Example: ElevatorStore.updateTelemetry({ motorTemperature: 79.2, motorCurrent: 33.1 })
     */
    updateTelemetry(batch) {
      for (const [key, val] of Object.entries(batch)) {
        if (this.state.telemetry[key]) {
          if (typeof val === 'object') {
            Object.assign(this.state.telemetry[key], val);
          } else {
            this.state.telemetry[key].value = val;
            if (this.state.telemetry[key].history) {
              this.state.telemetry[key].history.push(val);
              if (this.state.telemetry[key].history.length > 20) {
                this.state.telemetry[key].history.shift();
              }
            }
          }
          this.notify(`telemetry.${key}`, this.state.telemetry[key]);
        }
      }
      this.notify('telemetry', this.state.telemetry);
    }

    /**
     * Update elevator motion/floor from backend.
     * Example: ElevatorStore.updateFloor(9, 15, "Up")
     */
    updateFloor(currentFloor, targetFloor, direction, speed) {
      if (currentFloor !== undefined) this.state.elevator.currentFloor = currentFloor;
      if (targetFloor !== undefined) this.state.elevator.targetFloor = targetFloor;
      if (direction !== undefined) this.state.elevator.direction = direction;
      if (speed !== undefined) this.state.elevator.speed = speed;
      this.notify('elevator', this.state.elevator);
    }

    /**
     * Update health percentages.
     * Example: ElevatorStore.updateHealth("traction_motor", 85)
     */
    updateHealth(componentId, percentage) {
      const comp = this.state.systemHealth.components.find(c => c.id === componentId);
      if (comp) {
        comp.health = percentage;
        this.notify('systemHealth', this.state.systemHealth);
      }
    }

    /**
     * Add a real-time event/alert.
     * Example: ElevatorStore.addEvent({ time: "10:25:00", message: "Door sensors recalibrated", level: "Info", type: "info" })
     */
    addEvent(event) {
      const newEvent = {
        id: 'evt-' + Date.now(),
        time: event.time || new Date().toLocaleTimeString('en-GB'),
        message: event.message,
        level: event.level || 'Info',
        type: event.type || 'info'
      };
      this.state.events.unshift(newEvent);
      if (this.state.events.length > 8) this.state.events.pop();
      this.notify('events', this.state.events);
    }

    /**
     * Connect to backend WebSocket API.
     * Pass url such as "ws://localhost:8000/api/stream"
     */
    connectWebSocket(url) {
      if (this.socket) {
        this.socket.close();
      }
      try {
        this.socket = new WebSocket(url);
        this.socket.onopen = () => console.log('Elevator Digital Twin WebSocket connected to:', url);
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'telemetry') this.updateTelemetry(data.payload);
            else if (data.type === 'elevator') this.updateFloor(data.payload.currentFloor, data.payload.targetFloor, data.payload.direction, data.payload.speed);
            else if (data.type === 'alert') this.addEvent(data.payload);
            else if (data.type === 'full_state') {
              Object.assign(this.state, data.payload);
              this.notify('*', this.state);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };
        this.socket.onerror = (err) => console.warn('WebSocket connection error:', err);
        this.socket.onclose = () => console.log('WebSocket connection closed');
      } catch (e) {
        console.error('Failed to initialize WebSocket:', e);
      }
    }

    /**
     * Connect to backend HTTP REST polling.
     */
    connectPolling(endpoint, intervalMs = 2000) {
      if (this.pollingInterval) clearInterval(this.pollingInterval);
      this.pollingInterval = setInterval(async () => {
        try {
          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            if (data.telemetry) this.updateTelemetry(data.telemetry);
            if (data.elevator) this.updateFloor(data.elevator.currentFloor, data.elevator.targetFloor, data.elevator.direction);
          }
        } catch (e) {
          console.warn('Backend polling error:', e);
        }
      }, intervalMs);
    }
  }

  // Export globally
  window.ElevatorStore = new Store(INITIAL_STATE);
  console.log('KONE ElevatorStore initialized. Accessible via window.ElevatorStore');
})();
