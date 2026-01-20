class FlashlightApp {
    constructor() {
        this.isOn = false;
        this.strobeInterval = null;
        this.sosInterval = null;
        this.currentStream = null;
        this.brightness = 1.0;
        
        this.init();
    }
    
    async init() {
        // Referencias a elementos del DOM
        this.torchButton = document.getElementById('torchButton');
        this.flashlightArea = document.getElementById('flashlightArea');
        this.statusText = document.getElementById('statusText');
        this.permissionAlert = document.getElementById('permissionAlert');
        this.requestPermissionBtn = document.getElementById('requestPermissionBtn');
        this.strobeButton = document.getElementById('strobeButton');
        this.morseButton = document.getElementById('morseButton');
        this.brightnessButton = document.getElementById('brightnessButton');
        this.sosButton = document.getElementById('sosButton');
        this.batteryIndicator = document.getElementById('batteryIndicator');
        this.batteryLevel = document.getElementById('batteryLevel');
        
        // Event listeners
        this.torchButton.addEventListener('click', () => this.toggleFlashlight());
        this.requestPermissionBtn.addEventListener('click', () => this.requestPermission());
        this.strobeButton.addEventListener('click', () => this.toggleStrobe());
        this.morseButton.addEventListener('click', () => this.toggleSOS());
        this.brightnessButton.addEventListener('click', () => this.adjustBrightness());
        this.sosButton.addEventListener('click', () => this.emergencySOS());
        
        // Detectar cambios de batería
        if ('getBattery' in navigator) {
            this.initBatteryMonitor();
        }
        
        // Verificar si ya tenemos permisos
        this.checkPermission();
        
        // Configurar PWA
        this.setupPWA();
    }
    
    async checkPermission() {
        try {
            // Intentar acceder a la cámara para verificar permisos
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: "environment" } }
            });
            
            // Si tenemos acceso, ocultar alerta y detener stream
            this.permissionAlert.classList.add('hidden');
            stream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        } catch (error) {
            console.log('Permiso no concedido o dispositivo no compatible');
            this.permissionAlert.classList.remove('hidden');
        }
    }
    
    async requestPermission() {
        try {
            // Solicitar permiso para cámara trasera (requerido para linterna en iOS)
            this.currentStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: "environment" } }
            });
            
            this.permissionAlert.classList.add('hidden');
            console.log('Permiso concedido para linterna');
            
            // Apagar la linterna inicialmente
            await this.turnOff();
            
        } catch (error) {
            console.error('Error al solicitar permiso:', error);
            alert('Se requiere acceso a la cámara para usar la linterna. Por favor, permite el acceso en la configuración de tu dispositivo.');
        }
    }
    
    async toggleFlashlight() {
        if (!this.currentStream) {
            await this.requestPermission();
            return;
        }
        
        if (this.isOn) {
            await this.turnOff();
        } else {
            await this.turnOn();
        }
    }
    
    async turnOn() {
        try {
            if (!this.currentStream) return;
            
            // En iOS/Safari, encender la linterna usando los tracks de video
            const track = this.currentStream.getVideoTracks()[0];
            
            // Intentar aplicar configuración de linterna
            await track.applyConstraints({
                advanced: [{ torch: true }]
            });
            
            this.isOn = true;
            this.updateUI();
            console.log('Linterna ENCENDIDA');
            
        } catch (error) {
            console.error('Error al encender linterna:', error);
            
            // Fallback para dispositivos que no soportan linterna
            this.useScreenAsFlashlight();
        }
    }
    
    async turnOff() {
        try {
            if (!this.currentStream) return;
            
            const track = this.currentStream.getVideoTracks()[0];
            
            // Apagar linterna
            await track.applyConstraints({
                advanced: [{ torch: false }]
            });
            
            this.isOn = false;
            this.updateUI();
            console.log('Linterna APAGADA');
            
        } catch (error) {
            console.error('Error al apagar linterna:', error);
            
            // Fallback: apagar pantalla blanca
            this.flashlightArea.classList.remove('flashlight-on');
            this.flashlightArea.classList.add('flashlight-off');
        }
    }
    
    useScreenAsFlashlight() {
        // Fallback: usar la pantalla como linterna
        this.isOn = true;
        this.flashlightArea.classList.remove('flashlight-off');
        this.flashlightArea.classList.add('flashlight-on');
        this.updateUI();
    }
    
    updateUI() {
        if (this.isOn) {
            this.torchButton.classList.add('on');
            this.statusText.textContent = 'ENCENDIDO';
            this.flashlightArea.classList.remove('flashlight-off');
            this.flashlightArea.classList.add('flashlight-on');
        } else {
            this.torchButton.classList.remove('on');
            this.statusText.textContent = 'APAGADO';
            this.flashlightArea.classList.remove('flashlight-on');
            this.flashlightArea.classList.add('flashlight-off');
        }
    }
    
    toggleStrobe() {
        if (this.strobeInterval) {
            clearInterval(this.strobeInterval);
            this.strobeInterval = null;
            this.strobeButton.innerHTML = '<i class="fas fa-bolt"></i><span>Strobe</span>';
        } else {
            this.strobeInterval = setInterval(() => {
                if (this.isOn) {
                    this.turnOff();
                } else {
                    this.turnOn();
                }
            }, 200); // 5Hz strobe
            this.strobeButton.innerHTML = '<i class="fas fa-stop"></i><span>Detener</span>';
        }
    }
    
    toggleSOS() {
        if (this.sosInterval) {
            clearInterval(this.sosInterval);
            this.sosInterval = null;
            this.morseButton.innerHTML = '<i class="fas fa-code"></i><span>SOS</span>';
            this.sosButton.classList.remove('sos-active');
        } else {
            this.playSOS();
            this.morseButton.innerHTML = '<i class="fas fa-stop"></i><span>Detener</span>';
            this.sosButton.classList.add('sos-active');
        }
    }
    
    playSOS() {
        const sosPattern = [
            { on: true, duration: 200 },  // S .
            { on: false, duration: 200 },
            { on: true, duration: 200 },  // S .
            { on: false, duration: 200 },
            { on: true, duration: 200 },  // S .
            { on: false, duration: 400 },
            
            { on: true, duration: 600 },  // O -
            { on: false, duration: 200 },
            { on: true, duration: 600 },  // O -
            { on: false, duration: 200 },
            { on: true, duration: 600 },  // O -
            { on: false, duration: 400 },
            
            { on: true, duration: 200 },  // S .
            { on: false, duration: 200 },
            { on: true, duration: 200 },  // S .
            { on: false, duration: 200 },
            { on: true, duration: 200 },  // S .
            { on: false, duration: 1000 } // Pausa larga
        ];
        
        let step = 0;
        
        const playStep = async () => {
            if (step >= sosPattern.length) {
                step = 0; // Repetir
            }
            
            const pattern = sosPattern[step];
            
            if (pattern.on && !this.isOn) {
                await this.turnOn();
            } else if (!pattern.on && this.isOn) {
                await this.turnOff();
            }
            
            step++;
            this.sosInterval = setTimeout(playStep, pattern.duration);
        };
        
        playStep();
    }
    
    emergencySOS() {
        if (!this.sosInterval) {
            this.toggleSOS();
        } else {
            this.toggleSOS();
        }
    }
    
    adjustBrightness() {
        // En navegadores web, el brillo es limitado
        // Esta función es más útil en apps nativas
        const brightnessLevels = [0.25, 0.5, 0.75, 1.0];
        const currentIndex = brightnessLevels.indexOf(this.brightness);
        const nextIndex = (currentIndex + 1) % brightnessLevels.length;
        
        this.brightness = brightnessLevels[nextIndex];
        
        // Aplicar brillo visual (solo efecto en pantalla)
        this.flashlightArea.style.opacity = this.brightness;
        
        // Mostrar notificación
        const levelsText = ['Bajo', 'Medio', 'Alto', 'Máximo'];
        alert(`Brillo ajustado a: ${levelsText[nextIndex]}`);
    }
    
    async initBatteryMonitor() {
        try {
            const battery = await navigator.getBattery();
            
            const updateBatteryLevel = () => {
                const level = Math.round(battery.level * 100);
                this.batteryLevel.textContent = `${level}%`;
                
                // Cambiar icono según nivel
                const batteryIcon = this.batteryIndicator.querySelector('i');
                let iconClass = 'fa-battery-full';
                
                if (level <= 20) iconClass = 'fa-battery-empty';
                else if (level <= 40) iconClass = 'fa-battery-quarter';
                else if (level <= 60) iconClass = 'fa-battery-half';
                else if (level <= 80) iconClass = 'fa-battery-three-quarters';
                
                batteryIcon.className = `fas ${iconClass}`;
                
                // Advertencia si la batería es baja
                if (level <= 15 && this.isOn) {
                    this.batteryIndicator.style.color = '#ff3b30';
                    this.showLowBatteryWarning();
                } else {
                    this.batteryIndicator.style.color = level > 50 ? '#4cd964' : '#ffcc00';
                }
            };
            
            battery.addEventListener('levelchange', updateBatteryLevel);
            battery.addEventListener('chargingchange', updateBatteryLevel);
            
            updateBatteryLevel();
            
        } catch (error) {
            console.log('API de batería no soportada');
            this.batteryIndicator.style.display = 'none';
        }
    }
    
    showLowBatteryWarning() {
        if (!this.lowBatteryWarningShown) {
            alert('⚠️ Batería baja. La linterna puede apagarse pronto.');
            this.lowBatteryWarningShown = true;
            
            setTimeout(() => {
                this.lowBatteryWarningShown = false;
            }, 30000);
        }
    }
    
    setupPWA() {
        // Registrar service worker si está soportado
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registrado:', registration.scope);
                    })
                    .catch(error => {
                        console.log('Error al registrar ServiceWorker:', error);
                    });
            });
        }
        
        // Detectar si la app está instalada como PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('Ejecutando como PWA instalada');
        }
        
        // Prevenir recarga al deslizar en iOS
        document.addEventListener('touchmove', (e) => {
            if (e.scale !== 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Limpiar recursos cuando la app se cierre
    cleanup() {
        if (this.strobeInterval) clearInterval(this.strobeInterval);
        if (this.sosInterval) clearTimeout(this.sosInterval);
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }
    }
}

// Inicializar la app cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.flashlightApp = new FlashlightApp();
});

// Manejar cuando la app se cierre
window.addEventListener('beforeunload', () => {
    if (window.flashlightApp) {
        window.flashlightApp.cleanup();
    }
});

// Detectar tecla de volumen para controlar linterna (solo en apps nativas)
document.addEventListener('keydown', (e) => {
    if (e.key === 'VolumeUp' || e.key === 'VolumeDown') {
        e.preventDefault();
        if (window.flashlightApp) {
            window.flashlightApp.toggleFlashlight();
        }
    }
});