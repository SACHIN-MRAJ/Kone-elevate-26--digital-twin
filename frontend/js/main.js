/**
 * KONE Elevator Digital Twin - Main Application Controller
 * Handles UI bindings, live simulation updates, interactive controls, and event handling.
 */

(function () {
  'use strict';

  let viewer3D = null;
  let chartsMgr = null;
  let simulationTimer = null;

  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });

  function initApp() {
    console.log('Initializing KONE Elevator Digital Twin Dashboard...');

    // 1. Initialize 3D Viewer
    if (window.Elevator3DViewer) {
      viewer3D = new window.Elevator3DViewer('elevator-3d-viewport');
    }

    // 2. Initialize Charts
    if (window.ElevatorChartsManager) {
      chartsMgr = new window.ElevatorChartsManager();
    }

    // 3. Bind UI to Data Store
    bindUIWithStore();

    // 4. Setup Interactive Buttons & Dropdowns
    setupInteractiveControls();

    // 5. Start live clock & optional subtle realistic telemetry simulation
    startClock();
    startSubtleSimulation();
  }

  /**
   * Bind DOM elements to ElevatorStore so changes in the store reflect in the UI immediately.
   */
  function bindUIWithStore() {
    const store = window.ElevatorStore;
    if (!store) return;

    // Render initial values
    renderAll(store.state);

    // Subscribe to state updates
    store.subscribe('telemetry', (telemetry) => renderTelemetry(telemetry));
    store.subscribe('elevator', (elevator) => renderElevator(elevator));
    store.subscribe('systemHealth', (health) => renderHealth(health));
    store.subscribe('events', (events) => renderEvents(events));
  }

  function renderAll(state) {
    if (state.telemetry) renderTelemetry(state.telemetry);
    if (state.elevator) renderElevator(state.elevator);
    if (state.systemHealth) renderHealth(state.systemHealth);
    if (state.events) renderEvents(state.events);
  }

  function renderTelemetry(telemetry) {
    // 1. Motor Temperature
    setElemText('val-motor-temp', `${telemetry.motorTemperature.value.toFixed(1)}`);
    setElemText('delta-motor-temp', `${telemetry.motorTemperature.delta}`);

    // 2. Motor Current
    setElemText('val-motor-current', `${telemetry.motorCurrent.value.toFixed(1)}`);
    setElemText('delta-motor-current', `${telemetry.motorCurrent.delta}`);

    // 3. Vibration RMS
    setElemText('val-vibration', `${telemetry.vibrationRMS.value.toFixed(2)}`);
    setElemText('delta-vibration', `${telemetry.vibrationRMS.delta}`);

    // 4. Car Load
    setElemText('val-car-load', `${Math.round(telemetry.carLoad.value)}`);
    setElemText('delta-car-load', `${telemetry.carLoad.delta}`);

    // 5. Car Speed
    setElemText('val-car-speed', `${telemetry.carSpeed.value.toFixed(2)}`);
    setElemText('delta-car-speed', `${telemetry.carSpeed.delta}`);

    // 6. Ambient Temperature
    setElemText('val-ambient-temp', `${telemetry.ambientTemperature.value.toFixed(1)}`);
    setElemText('delta-ambient-temp', `${telemetry.ambientTemperature.delta}`);
  }

  function renderElevator(elevator) {
    setElemText('val-current-floor', elevator.currentFloor);
    setElemText('val-target-floor', elevator.targetFloor);
    setElemText('val-speed-display', `${elevator.speed.toFixed(2)} m/s`);
    setElemText('val-direction', elevator.direction);
    setElemText('val-trips', elevator.todaysTrips);

    // Update Operation Stepper
    const stepperItems = document.querySelectorAll('.stepper-step');
    stepperItems.forEach(item => {
      const stepName = item.getAttribute('data-step');
      if (stepName === elevator.currentOperation) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Arrow direction rotation
    const arrowElem = document.getElementById('floor-arrow-indicator');
    if (arrowElem) {
      if (elevator.direction === 'Up') arrowElem.style.transform = 'rotate(0deg)';
      else if (elevator.direction === 'Down') arrowElem.style.transform = 'rotate(180deg)';
      else arrowElem.style.transform = 'rotate(90deg)';
    }
  }

  function renderHealth(health) {
    setElemText('val-overall-health', `${health.overallPercentage}%`);
    setElemText('val-health-status', health.statusLabel);

    // Subsystem health bars
    health.components.forEach(comp => {
      const bar = document.getElementById(`health-bar-${comp.id}`);
      const val = document.getElementById(`health-val-${comp.id}`);
      if (bar) bar.style.width = `${comp.health}%`;
      if (val) val.innerText = `${comp.health}%`;
    });
  }

  function renderEvents(events) {
    const listContainer = document.getElementById('events-table-body');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    events.slice(0, 4).forEach(evt => {
      const tr = document.createElement('tr');
      tr.className = 'event-row';

      const dotClass = evt.type === 'danger' ? 'dot-danger' : (evt.type === 'warning' ? 'dot-warning' : 'dot-info');
      const badgeClass = evt.level === 'High' ? 'badge-high' : (evt.level === 'Warning' ? 'badge-warning' : 'badge-info');

      tr.innerHTML = `
        <td class="col-dot"><span class="status-bullet ${dotClass}"></span></td>
        <td class="col-time">${evt.time}</td>
        <td class="col-desc">${evt.message}</td>
        <td class="col-tag"><span class="event-tag ${badgeClass}">${evt.level}</span></td>
      `;
      listContainer.appendChild(tr);
    });
  }

  function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  /**
   * Setup Quick Actions and Viewport controls
   */
  function setupInteractiveControls() {
    // 3D Controls
    const resetBtn = document.getElementById('btn-reset-3d');
    if (resetBtn && viewer3D) {
      resetBtn.addEventListener('click', () => viewer3D.resetView());
    }

    // Quick Action Buttons
    const actionSim = document.getElementById('action-simulation');
    if (actionSim) {
      actionSim.addEventListener('click', () => {
        showNotification('Starting What-If Physics Simulation...', 'info');
      });
    }

    const actionComp = document.getElementById('action-components');
    if (actionComp) {
      actionComp.addEventListener('click', () => {
        showNotification('Component diagnostics: All sub-assemblies nominal.', 'info');
      });
    }

    const actionMaint = document.getElementById('action-maintenance');
    if (actionMaint) {
      actionMaint.addEventListener('click', () => {
        showNotification('Maintenance request scheduled for Elevator 01.', 'success');
      });
    }

    const actionReport = document.getElementById('action-report');
    if (actionReport) {
      actionReport.addEventListener('click', () => {
        showNotification('Generating PDF Diagnostic & PINN Report...', 'info');
      });
    }

    // Interval selector (1 s / 500 ms / 5 s)
    const intervalBtn = document.getElementById('btn-telemetry-interval');
    if (intervalBtn) {
      intervalBtn.addEventListener('click', () => {
        const current = intervalBtn.innerText.trim();
        if (current === '1 s') intervalBtn.innerHTML = '500 ms <svg class="chevron-sm" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
        else if (current === '500 ms') intervalBtn.innerHTML = '5 s <svg class="chevron-sm" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
        else intervalBtn.innerHTML = '1 s <svg class="chevron-sm" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
      });
    }
  }

  /**
   * Keep top header time clock accurate
   */
  function startClock() {
    const timeElem = document.getElementById('live-time');
    const dateElem = document.getElementById('live-date');

    function update() {
      const now = new Date();
      if (timeElem) {
        timeElem.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      if (dateElem) {
        const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
        dateElem.innerText = now.toLocaleDateString('en-GB', options);
      }
    }
    update();
    setInterval(update, 1000);
  }

  /**
   * Subtle realistic live simulation so the dashboard breathes naturally with micro-fluctuations.
   */
  function startSubtleSimulation() {
    const store = window.ElevatorStore;
    if (!store) return;

    let simStep = 0;

    simulationTimer = setInterval(() => {
      simStep++;

      // Micro-fluctuate motor temperature around 78.4 °C
      const currentTemp = store.state.telemetry.motorTemperature.value;
      const noise = (Math.random() - 0.48) * 0.15;
      const newTemp = Math.min(84.0, Math.max(76.0, currentTemp + noise));

      // Micro-fluctuate motor current around 32.6 A
      const currentAmp = store.state.telemetry.motorCurrent.value;
      const ampNoise = (Math.random() - 0.5) * 0.2;
      const newAmp = Math.min(35.0, Math.max(30.0, currentAmp + ampNoise));

      // Micro-fluctuate vibration around 0.42 g
      const currentVib = store.state.telemetry.vibrationRMS.value;
      const vibNoise = (Math.random() - 0.48) * 0.01;
      const newVib = Math.min(0.55, Math.max(0.35, currentVib + vibNoise));

      // Update telemetry store
      store.updateTelemetry({
        motorTemperature: Number(newTemp.toFixed(1)),
        motorCurrent: Number(newAmp.toFixed(1)),
        vibrationRMS: Number(newVib.toFixed(2))
      });

      // Slowly simulate upward elevator travel to floor 9 after some ticks
      if (simStep === 12 && store.state.elevator.currentFloor === 8) {
        store.updateFloor(9, 15, 'Up', 1.35);
      }

    }, 2000);
  }

  /**
   * Minimalist toast notification
   */
  function showNotification(msg, type = 'info') {
    let container = document.getElementById('toast-notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-notification-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
      <div class="toast-indicator"></div>
      <div class="toast-content">${msg}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  window.showToast = showNotification;
})();
