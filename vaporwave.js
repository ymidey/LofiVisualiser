import * as THREE from 'three';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { RenderPass } from "../node_modules/three/examples/jsm/postprocessing/RenderPass.js";
import { EffectComposer } from "../node_modules/three/examples/jsm/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "../node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js";

const CONFIG = {
    SEARCH: {
        DEBOUNCE_TIME: 300,
        MIN_QUERY_LENGTH: 1,
        MAX_RESULTS: 12,
    },
    SCENE: {
        BACKGROUND_SIZE: 100,
        PETALS: {
            COUNT: 1000,
            SIZE: 0.5,
            VELOCITY_RANGE: [0.01, 0.03],
            RESPAWN_HEIGHT: 50
        },
        VINYL: {
            RADIUS: 2,
            SEGMENTS: 32
        }
    }
};

class App {
    constructor() {
        this.userSelectedHour = null;
        this.lastProcessedHour = null;
        this.clockElement = document.getElementById('digitalClock');
        this.timeSlider = document.getElementById('timeSlider');

        this.initThreeJS();
        this.initAudio();
        this.initEventListeners();
        this.initTimeSlider();
        this.animate();
    }

    initThreeJS() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('canvas.webgl'),
            antialias: true
        });
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 20);

        // Post-processing
        this.effectComposer = new EffectComposer(this.renderer);
        this.effectComposer.addPass(new RenderPass(this.scene, this.camera));
        this.effectComposer.addPass(new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,
            0.4,
            0.85
        ));

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.setupScene();
    }

    setupScene() {
        // Background
        const bgTexture = new THREE.TextureLoader().load('./assets/japan_street.jpg');
        const bgGeometry = new THREE.SphereGeometry(CONFIG.SCENE.BACKGROUND_SIZE, 50, 50);
        const bgMaterial = new THREE.MeshStandardMaterial({
            map: bgTexture,
            side: THREE.BackSide,
            metalness: 0.3,
            roughness: 0.8
        }); this.scene.add(new THREE.Mesh(bgGeometry, bgMaterial));

        // Pétales
        const petalTexture = new THREE.TextureLoader().load('./assets/cherry_blossom.png');
        const petalsGeometry = this.createPetalsGeometry();
        const petalsMaterial = new THREE.PointsMaterial({
            map: petalTexture,
            size: CONFIG.SCENE.PETALS.SIZE,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        this.petals = new THREE.Points(petalsGeometry, petalsMaterial);
        this.scene.add(this.petals);

        // Éclairage
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(10, 10, 10);
        this.scene.add(this.directionalLight);

        // Vinyle
        const vinylTexture = new THREE.TextureLoader().load('./assets/vinyl_texture.jpg');
        const vinylGeometry = new THREE.CircleGeometry(
            CONFIG.SCENE.VINYL.RADIUS,
            CONFIG.SCENE.VINYL.SEGMENTS
        );
        // Remplacer le MeshBasicMaterial par un MeshPhongMaterial pour de meilleurs effets
        this.vinyl = new THREE.Mesh(
            vinylGeometry,
            new THREE.MeshPhongMaterial({
                color: 0xFFFFFF,
                specular: 0x111111,
                shininess: 50,
                transparent: true
            })
        ); this.scene.add(this.vinyl);
    }

    initTimeSlider() {
        const now = new Date();
        this.timeSlider.value = now.getHours();
    }

    // Gestion du temps
    handleTimeSliderInput(event) {
        this.userSelectedHour = parseInt(event.target.value);
        this.updateLighting(this.userSelectedHour);
    }

    calculateColorFromHour(hour) {
        const color = new THREE.Color();
        if (hour >= 5 && hour < 7) {
            const t = (hour - 5) / 2;
            color.lerpColors(new THREE.Color(0xFFA500), new THREE.Color(0xFFFFFF), t);
        } else if (hour >= 7 && hour < 17) {
            color.set(0xFFFFFF);
        } else if (hour >= 17 && hour < 19) {
            const t = (hour - 17) / 2;
            color.lerpColors(new THREE.Color(0xFFFFFF), new THREE.Color(0xFFA500), t);
        } else if (hour >= 19 && hour < 21) {
            const t = (hour - 19) / 2;
            color.lerpColors(new THREE.Color(0xFFA500), new THREE.Color(0x00008B), t);
        } else {
            color.set(0x00008B);
        }
        return color;
    }

    calculateIntensityFromHour(hour) {
        if (hour >= 7 && hour < 17) return 1.0;
        if ((hour >= 5 && hour < 7) || (hour >= 17 && hour < 19)) return 0.6;
        return 0.2;
    }

    updateLighting(hour) {
        const color = this.calculateColorFromHour(hour);
        const intensity = this.calculateIntensityFromHour(hour);

        this.directionalLight.color.copy(color);
        this.directionalLight.intensity = intensity;
        this.ambientLight.color.copy(color);
        this.ambientLight.intensity = intensity * 0.5;
    }

    updateClock() {
        let hours, minutes, seconds;
        const now = new Date();

        if (this.userSelectedHour !== null) {
            hours = this.userSelectedHour;
            minutes = now.getMinutes();
            seconds = now.getSeconds();
        } else {
            hours = now.getHours();
            minutes = now.getMinutes();
            seconds = now.getSeconds();
        }

        this.clockElement.textContent =
            `${String(hours).padStart(2, '0')}:` +
            `${String(minutes).padStart(2, '0')}:` +
            `${String(seconds).padStart(2, '0')}`;
    }

    // Gestion audio
    initAudio() {
        this.currentAudio = null;
        this.currentTrackUrl = null;
        this.searchTimeout = null;
    }

    // Événements
    initEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
        const canvas = this.renderer.domElement;
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.getElementById('searchBar').addEventListener('input', (e) => this.handleSearchInput(e));
        this.timeSlider.addEventListener('input', (e) => this.handleTimeSliderInput(e));
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.effectComposer.setSize(width, height);
    }

    handleCanvasClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        if (this.raycaster.intersectObject(this.vinyl).length > 0) {
            this.togglePlayback();
        }
    }

    handleMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.vinyl);

        this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'auto';
    }

    // Recherche musicale
    async handleSearchInput(event) {
        clearTimeout(this.searchTimeout);
        const query = event.target.value.trim();
        const tbody = document.querySelector('#resultsTable tbody');

        if (query.length < CONFIG.SEARCH.MIN_QUERY_LENGTH) {
            this.clearResults();
            return;
        }

        tbody.innerHTML = '<tr><td colspan="3">Chargement...</td></tr>';

        this.searchTimeout = setTimeout(() =>
            this.performSearch(query),
            CONFIG.SEARCH.DEBOUNCE_TIME
        );
    }

    async performSearch(query) {
        const tbody = document.querySelector('#resultsTable tbody');
        try {
            const response = await fetch(`https://corsproxy.io/?https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Erreur API');

            const data = await response.json();
            this.displayResults(data.data || []);
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="3" style="color: #ff4444">Erreur: ${error.message}</td></tr>`;
        }
    }

    displayResults(tracks) {
        const tbody = document.querySelector('#resultsTable tbody');
        tbody.innerHTML = '';

        tracks.slice(0, CONFIG.SEARCH.MAX_RESULTS).forEach(track => {
            if (!track.preview) return;

            const row = tbody.insertRow();
            row.dataset.preview = track.preview;
            row.innerHTML = `
                <td>${track.title}</td>
                <td>${track.artist.name}</td>
                <td>${track.album.title}</td>
            `;

            row.addEventListener('click', () => this.handleTrackClick(track, row));
        });
    }

    handleTrackClick(track, row) {
        document.querySelectorAll('tr').forEach(r => r.style.background = '');
        row.style.background = this.currentTrackUrl === track.preview && !this.currentAudio?.paused
            ? 'rgba(255, 0, 0, 0.2)'
            : 'rgba(0, 255, 0, 0.2)';

        // Charger la texture de l'album
        this.loadAlbumTexture(track.album.cover);
        this.playTrack(track.preview);
    }

    loadAlbumTexture(coverUrl) {
        // Créer une URL plus grande pour une meilleure qualité
        const highResUrl = coverUrl.replace('56x56', '500x500');

        new THREE.TextureLoader().load(
            highResUrl,
            (texture) => {
                // Mettre à jour le matériau du vinyle
                this.vinyl.material.map = texture;
                this.vinyl.material.needsUpdate = true;

                // Ajouter un effet de bordure
                this.vinyl.material.bumpScale = 0.05;
                this.vinyl.material.normalScale.set(0.5, 0.5);
            },
            undefined,
            (err) => console.error('Erreur chargement texture:', err)
        );
    }

    disposeOldTexture() {
        if (this.vinyl.material.map) {
            this.vinyl.material.map.dispose();
        }
    }

    playTrack(previewUrl) {
        if (this.currentTrackUrl === previewUrl) {
            this.togglePlayback();
        } else {
            this.disposeOldTexture(); // Nettoyer l'ancienne texture
            this.currentTrackUrl = previewUrl;
            this.currentAudio?.pause();
            this.currentAudio = new Audio(previewUrl);
            this.setupAudioListeners();
            this.currentAudio.play().catch(error => this.showError(error.message));
        }
    }

    togglePlayback() {
        if (!this.currentAudio) return;

        this.currentAudio.paused
            ? this.currentAudio.play()
            : this.currentAudio.pause();

        this.updateUI();
    }

    setupAudioListeners() {
        if (!this.currentAudio) return;

        const update = () => {
            this.updateUI();
            this.vinyl.material.color.setHex(
                this.currentAudio.paused ? 0x666666 : 0xFFFFFF
            );
        };

        this.currentAudio.addEventListener('play', update);
        this.currentAudio.addEventListener('pause', update);
    }

    // Animation
    animate() {
        requestAnimationFrame(() => this.animate());

        // Animation des pétales
        const positions = this.petals.geometry.attributes.position.array;
        for (let i = 0; i < CONFIG.SCENE.PETALS.COUNT; i++) {
            positions[i * 3 + 1] -= this.petalsVelocities[i];
            if (positions[i * 3 + 1] < -10) {
                positions[i * 3 + 1] = Math.random() * CONFIG.SCENE.PETALS.RESPAWN_HEIGHT + 10;
            }
        }
        this.petals.geometry.attributes.position.needsUpdate = true;

        // Animation du vinyle
        if (this.currentAudio && !this.currentAudio.paused) {
            this.vinyl.rotation.z += 0.02;
        }

        // Mise à jour temps et éclairage
        let currentHour;
        if (this.userSelectedHour !== null) {
            currentHour = this.userSelectedHour;
        } else {
            const now = new Date();
            currentHour = now.getHours();
        }

        if (currentHour !== this.lastProcessedHour) {
            this.updateLighting(currentHour);
            this.lastProcessedHour = currentHour;
        }

        this.updateClock();

        this.controls.update();
        this.effectComposer.render();
    }

    // Utilitaires
    createPetalsGeometry() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(CONFIG.SCENE.PETALS.COUNT * 3);
        this.petalsVelocities = new Float32Array(CONFIG.SCENE.PETALS.COUNT);

        for (let i = 0; i < CONFIG.SCENE.PETALS.COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            this.petalsVelocities[i] = Math.random() *
                (CONFIG.SCENE.PETALS.VELOCITY_RANGE[1] - CONFIG.SCENE.PETALS.VELOCITY_RANGE[0]) +
                CONFIG.SCENE.PETALS.VELOCITY_RANGE[0];
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geometry;
    }

    updateUI() {
        const activeRow = document.querySelector(`tr[data-preview="${this.currentTrackUrl}"]`);
        if (activeRow) {
            activeRow.style.background = this.currentAudio?.paused
                ? 'rgba(255, 0, 0, 0.2)'
                : 'rgba(0, 255, 0, 0.2)';
        }
    }

    clearResults() {
        document.querySelector('#resultsTable tbody').innerHTML = '';
    }

    showError(message) {
        const tbody = document.querySelector('#resultsTable tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="color: #ff4444">
                    Error: ${message}
                </td>
            </tr>
        `;
    }
}

// Initialisation
new App();