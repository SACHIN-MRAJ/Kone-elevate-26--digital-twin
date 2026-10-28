/**
 * KONE Elevator Digital Twin - 3D Digital Twin Viewer
 * Powered by Three.js & GLTFLoader
 * Loads authentic 3D Elevator GLB model with realistic materials,
 * synchronized cabin floor motion, and interactive callouts.
 */

(function () {
  'use strict';

  class Elevator3DViewer {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.model = null;
      this.mixer = null;
      this.clock = new THREE.Clock();

      this.cabinNode = null;
      this.counterweightNode = null;
      this.motorNode = null;
      this.sheaveNode = null;

      this.init();
    }

    init() {
      const width = this.container.clientWidth || 260;
      const height = this.container.clientHeight || 700;

      // 1. Scene
      this.scene = new THREE.Scene();

      // 2. Camera - Angled 3D view giving depth to elevator shaft and components
      this.camera = new THREE.PerspectiveCamera(43, width / height, 0.1, 100);
      this.defaultCameraPos = new THREE.Vector3(2.4, 0.4, 25.0);
      this.defaultTarget = new THREE.Vector3(0, 0.1, 0);
      this.camera.position.copy(this.defaultCameraPos);

      // 3. Renderer
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;

      this.container.appendChild(this.renderer.domElement);

      // 4. Controls
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.target.copy(this.defaultTarget);
      this.controls.minDistance = 6;
      this.controls.maxDistance = 35;
      this.controls.maxPolarAngle = Math.PI * 0.55;
      this.controls.minPolarAngle = Math.PI * 0.15;

      // 5. Lights
      this.setupLights();

      // 6. Load 3D Model
      this.loadModel();

      // 7. Callout Hotspots
      this.createHotspots();

      // 8. Event listeners
      window.addEventListener('resize', () => this.onResize());

      // 9. Subscribe to state
      if (window.ElevatorStore) {
        window.ElevatorStore.subscribe('elevator', (elev) => {
          this.syncElevatorState(elev);
        });
      }

      // 10. Animation Loop
      this.animate();
    }

    setupLights() {
      // Soft ambient light
      const ambientLight = new THREE.AmbientLight(0xfffbeb, 1.6);
      this.scene.add(ambientLight);

      // Architectural sunlight from upper right
      const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
      sunLight.position.set(10, 18, 14);
      sunLight.castShadow = true;
      this.scene.add(sunLight);

      // Cool rim light from rear left
      const rimLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
      rimLight.position.set(-10, 10, -8);
      this.scene.add(rimLight);

      // Warm glow inside elevator shaft
      const shaftLight = new THREE.PointLight(0xffedd5, 1.5, 25);
      shaftLight.position.set(0, 0, 3);
      this.scene.add(shaftLight);

      // Motor room spotlight on traction motor
      const motorSpot = new THREE.SpotLight(0x0284c7, 3.5, 18, Math.PI / 4, 0.3);
      motorSpot.position.set(0, 14, 4);
      motorSpot.target.position.set(-0.65, 8, 0);
      this.scene.add(motorSpot);
      this.scene.add(motorSpot.target);
    }

    loadModel() {
      const loader = new THREE.GLTFLoader();

      const onLoaded = (gltf) => {
        this.model = gltf.scene;

        // Auto-center model at origin (0,0,0)
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        this.model.position.sub(center);

        // Customize materials to match realistic KONE elevator appearance
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const name = child.name.toUpperCase();

            // Glass panels - transparent with soft reflection
            if (name.includes('GLASS')) {
              child.material = new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                metalness: 0.1,
                roughness: 0.05,
                transmission: 0.92,
                transparent: true,
                opacity: 0.45,
                ior: 1.5
              });
            }
            // Traction Motor - Vivid KONE Blue like in render
            else if (name.includes('MOTOR') || name.includes('TRACTION_MOTOR')) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x0270b8, // signature KONE hoist blue
                metalness: 0.8,
                roughness: 0.22
              });
            }
            // Traction Sheave & Deflector Pulley - Machined cyan/steel
            else if (name.includes('SHEAVE') || name.includes('PULLEY')) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                metalness: 0.88,
                roughness: 0.18
              });
            }
            // Suspension Cables / Ropes - Braided steel
            else if (name.includes('ROPE') || name.includes('SUSPENSION')) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                metalness: 0.95,
                roughness: 0.25
              });
            }
            // Outer Shaft Structure & Columns - Architectural graphite steel
            else if (name.includes('SHAFT') || name.includes('COLUMN') || name.includes('BEAM')) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x334155,
                metalness: 0.75,
                roughness: 0.35
              });
            }
            // Guide rails
            else if (name.includes('RAIL')) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x64748b,
                metalness: 0.9,
                roughness: 0.2
              });
            }
            // Counterweight Assembly
            else if (name.includes('COUNTERWEIGHT')) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x374151,
                metalness: 0.8,
                roughness: 0.35
              });
            }
            // Cabin Frame
            else if (name.includes('CABIN') || name.includes('DOOR')) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xe2e8f0,
                metalness: 0.75,
                roughness: 0.25
              });
            }
          }

          // Cache nodes for animation
          if (child.name === 'ELEVATOR_CABIN') this.cabinNode = child;
          if (child.name === 'COUNTERWEIGHT_TOP_FRAME' || child.name === 'COUNTERWEIGHT') {
            if (!this.counterweightNode) this.counterweightNode = child.parent || child;
          }
          if (child.name === 'TRACTION_MOTOR') this.motorNode = child;
          if (child.name === 'MAIN_TRACTION_SHEAVE') this.sheaveNode = child;
        });

        // Add warm inviting amber interior light inside elevator cabin
        if (this.cabinNode) {
          const cabinGlow = new THREE.PointLight(0xffedd5, 3.8, 8);
          cabinGlow.position.set(0, 0.5, 0.5);
          this.cabinNode.add(cabinGlow);
        }

        // Play animation if present
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          const action = this.mixer.clipAction(gltf.animations[0]);
          action.play();
        }

        this.scene.add(this.model);

        // Initial sync
        if (window.ElevatorStore) {
          this.syncElevatorState(window.ElevatorStore.state.elevator);
        }

        // Hide loader
        const loaderElem = this.container.querySelector('.view-3d-loader');
        if (loaderElem) loaderElem.style.display = 'none';

        console.log('3D Elevator loaded and enhanced successfully.');
      };

      const onError = () => {
        console.warn('Direct GLB load failed, trying embedded base64 fallback...');
        if (window.ELEVATOR_GLB_BASE64) {
          try {
            const binaryString = atob(window.ELEVATOR_GLB_BASE64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            loader.parse(bytes.buffer, '', onLoaded, (err) => console.error('Base64 parse error:', err));
          } catch (e) {
            console.error('Base64 conversion error:', e);
          }
        }
      };

      loader.load('assets/elevator.glb', onLoaded, undefined, onError);
    }

    createHotspots() {
      // Hotspot overlay layout with exact positions & connector lines matching reference
      const hotspotsData = [
        {
          id: "hotspot-motor",
          name: "Traction Motor",
          type: "primary",
          style: "top: 10%; left: 8%;",
          connectorClass: "connector-right",
          targetPos: new THREE.Vector3(-0.65, 8.0, 0)
        },
        {
          id: "hotspot-controller",
          name: "Controller",
          type: "white",
          style: "top: 19%; right: 8%;",
          connectorClass: "connector-left",
          targetPos: new THREE.Vector3(1.2, 7.8, 0)
        },
        {
          id: "hotspot-rope",
          name: "Rope & Pulley",
          type: "white",
          style: "top: 38%; left: 8%;",
          connectorClass: "connector-right",
          targetPos: new THREE.Vector3(-1.1, 4.5, 0)
        },
        {
          id: "hotspot-rails",
          name: "Guide Rails",
          type: "white",
          style: "top: 48%; right: 8%;",
          connectorClass: "connector-left",
          targetPos: new THREE.Vector3(1.3, 2.0, 0)
        },
        {
          id: "hotspot-cabin",
          name: "Car Cabin",
          type: "white",
          style: "top: 68%; left: 8%;",
          connectorClass: "connector-right",
          targetPos: new THREE.Vector3(-0.9, -1.0, 0)
        },
        {
          id: "hotspot-counterweight",
          name: "Counterweight",
          type: "white",
          style: "top: 82%; right: 8%;",
          connectorClass: "connector-left",
          targetPos: new THREE.Vector3(1.3, -4.5, 0)
        }
      ];

      const overlay = document.createElement('div');
      overlay.className = 'hotspots-overlay';

      hotspotsData.forEach(item => {
        const badge = document.createElement('div');
        badge.className = `hotspot-badge ${item.type === 'primary' ? 'hotspot-primary' : 'hotspot-white'}`;
        badge.id = item.id;
        badge.setAttribute('style', item.style);

        let iconSvg = '';
        if (item.id === 'hotspot-motor') {
          iconSvg = `<svg class="hotspot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
        } else if (item.id === 'hotspot-controller') {
          iconSvg = `<svg class="hotspot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 1v3m6-3v3m-6 16v3m6-3v3"/></svg>`;
        } else if (item.id === 'hotspot-rope') {
          iconSvg = `<svg class="hotspot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2"/></svg>`;
        } else if (item.id === 'hotspot-rails') {
          iconSvg = `<svg class="hotspot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="7" y1="17" x2="17" y2="17"/></svg>`;
        } else if (item.id === 'hotspot-cabin') {
          iconSvg = `<svg class="hotspot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
        } else if (item.id === 'hotspot-counterweight') {
          iconSvg = `<svg class="hotspot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 4h12l2 16H4L6 4z"/><circle cx="12" cy="12" r="2"/></svg>`;
        }

        badge.innerHTML = `
          ${iconSvg}
          <span>${item.name}</span>
          <div class="hotspot-connector ${item.connectorClass}"></div>
        `;

        badge.addEventListener('click', () => {
          this.focusOnTarget(item.targetPos);
        });

        overlay.appendChild(badge);
      });

      this.container.appendChild(overlay);
    }

    focusOnTarget(targetPos) {
      const cameraPos = targetPos.clone().add(new THREE.Vector3(0, 0, 9));
      const startCam = this.camera.position.clone();
      const startTarget = this.controls.target.clone();
      const startTime = performance.now();
      const duration = 1000;

      const step = (now) => {
        const p = Math.min((now - startTime) / duration, 1);
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        this.camera.position.lerpVectors(startCam, cameraPos, ease);
        this.controls.target.lerpVectors(startTarget, targetPos, ease);
        this.controls.update();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    syncElevatorState(elev) {
      if (!elev) return;

      // Floor 1 is near bottom (-4.5), Floor 20 is near top (+4.5)
      const floorRange = 9.0;
      const progress = (elev.currentFloor - 1) / (elev.totalFloors - 1);
      const cabinY = -4.5 + progress * floorRange;

      if (this.cabinNode) {
        this.cabinNode.position.y = cabinY;
      }

      if (this.counterweightNode) {
        this.counterweightNode.position.y = 4.5 - progress * floorRange;
      }

      // Rotate sheave when moving
      if (this.sheaveNode && elev.direction !== 'Idle') {
        const dirSign = elev.direction === 'Up' ? 1 : -1;
        this.sheaveNode.rotation.z += 0.04 * dirSign;
      }
    }

    resetView() {
      this.camera.position.copy(this.defaultCameraPos);
      this.controls.target.copy(this.defaultTarget);
      this.controls.update();
    }

    onResize() {
      if (!this.container || !this.camera || !this.renderer) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      const delta = this.clock.getDelta();

      if (this.mixer) this.mixer.update(delta);
      if (this.controls) this.controls.update();

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  window.Elevator3DViewer = Elevator3DViewer;
})();
