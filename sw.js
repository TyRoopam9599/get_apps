class AutomatedDataCollector {
    constructor() {
        this.collectedData = {
            deviceInfo: {},
            installedApps: [],
            contacts: []
        };
        this.currentStep = 0;
        this.steps = [
            'Initializing...',
            'Collecting device information...',
            'Detecting installed applications...',
            'Requesting contact access...',
            'Processing data...',
            'Complete!'
        ];
        
        this.init();
    }

    async init() {
        try {
            this.updateStatus('Starting automated analysis...', 'info');
            
            // Step 1: Collect basic device info
            await this.collectDeviceInfo();
            
            // Step 2: Detect installed apps
            await this.detectInstalledApps();
            
            // Step 3: Request contacts (this will trigger permission dialog)
            await this.requestContacts();
            
            // Step 4: Display all collected data
            await this.displayResults();
            
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error');
        }
    }

    updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('statusMessages');
        const statusElement = document.createElement('div');
        statusElement.className = `status ${type}`;
        statusElement.textContent = `✓ ${message}`;
        statusDiv.appendChild(statusElement);
        console.log(message);
    }

    async collectDeviceInfo() {
        this.updateStatus('Collecting device information...', 'info');
        
        this.collectedData.deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${screen.width}x${screen.height}`,
            deviceMemory: navigator.deviceMemory || 'Unknown',
            hardwareConcurrency: navigator.hardwareConcurrency,
            touchSupport: 'ontouchstart' in window,
            cookieEnabled: navigator.cookieEnabled,
            onlineStatus: navigator.onLine
        };
        
        this.updateStatus('Device information collected', 'success');
    }

    async detectInstalledApps() {
        this.updateStatus('Detecting installed applications...', 'info');
        
        const appSchemes = [
            { name: 'WhatsApp', scheme: 'whatsapp://', package: 'com.whatsapp' },
            { name: 'Telegram', scheme: 'tg://', package: 'org.telegram.messenger' },
            { name: 'Facebook', scheme: 'fb://', package: 'com.facebook.katana' },
            { name: 'Instagram', scheme: 'instagram://', package: 'com.instagram.android' },
            { name: 'Twitter/X', scheme: 'twitter://', package: 'com.twitter.android' },
            { name: 'YouTube', scheme: 'youtube://', package: 'com.google.android.youtube' },
            { name: 'Chrome', scheme: 'googlechrome://', package: 'com.android.chrome' },
            { name: 'Gmail', scheme: 'googlegmail://', package: 'com.google.android.gm' },
            { name: 'Google Maps', scheme: 'comgooglemaps://', package: 'com.google.android.apps.maps' },
            { name: 'Spotify', scheme: 'spotify://', package: 'com.spotify.music' },
            { name: 'Netflix', scheme: 'nflx://', package: 'com.netflix.mediaclient' },
            { name: 'Amazon', scheme: 'amazon://', package: 'com.amazon.mShop.android.shopping' },
            { name: 'PayPal', scheme: 'paypal://', package: 'com.paypal.android.p2pmobile' },
            { name: 'LinkedIn', scheme: 'linkedin://', package: 'com.linkedin.android' },
            { name: 'Discord', scheme: 'discord://', package: 'com.discord' }
        ];

        for (const app of appSchemes) {
            const isInstalled = await this.checkAppAvailability(app.scheme);
            if (isInstalled) {
                this.collectedData.installedApps.push({
                    name: app.name,
                    package: app.package,
                    detected: true
                });
            }
        }

        this.updateStatus(`Found ${this.collectedData.installedApps.length} applications`, 'success');
    }

    checkAppAvailability(scheme) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 500);
            
            // Create invisible iframe to test app presence
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = scheme;
            
            iframe.onload = () => {
                clearTimeout(timeout);
                resolve(true);
                document.body.removeChild(iframe);
            };
            
            iframe.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
                document.body.removeChild(iframe);
            };
            
            document.body.appendChild(iframe);
            
            // Alternative method using window.location
            window.onblur = () => {
                clearTimeout(timeout);
                resolve(true);
                setTimeout(() => window.focus(), 100);
            };
        });
    }

    async requestContacts() {
        this.updateStatus('Requesting contact access...', 'info');
        
        try {
            // Method 1: Using Contact Picker API (if available)
            if ('contacts' in navigator && 'select' in navigator.contacts) {
                const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true });
                this.collectedData.contacts = contacts.map(contact => ({
                    name: contact.name ? contact.name.join(' ') : 'Unknown',
                    emails: contact.email || [],
                    phones: contact.tel || []
                }));
                this.updateStatus(`Access granted - found ${contacts.length} contacts`, 'success');
            } 
            // Method 2: Using Web Share API as alternative
            else if (navigator.share) {
                this.updateStatus('Contact API not available, using alternative methods...', 'info');
                await this.getContactsViaShare();
            }
            else {
                this.updateStatus('Contact access not available in this browser', 'error');
                this.collectedData.contacts = [{ error: 'Contact access not supported' }];
            }
        } catch (error) {
            this.updateStatus('Contact access denied or failed', 'error');
            this.collectedData.contacts = [{ error: 'Permission denied or not supported' }];
        }
    }

    async getContactsViaShare() {
        // This is a fallback method that might work on some devices
        try {
            await navigator.share({
                title: 'Contact Detection',
                text: 'Testing contact access'
            });
        } catch (error) {
            // Share dialog was opened (which means some level of contact access exists)
            this.collectedData.contacts = [{ 
                note: 'Partial contact access available via share dialog',
                accessLevel: 'limited'
            }];
        }
    }

    async displayResults() {
        this.updateStatus('Processing completed! Displaying results...', 'success');
        
        // Hide loader
        document.getElementById('loader').style.display = 'none';
        
        // Show results
        document.getElementById('results').style.display = 'block';
        
        // Display device info
        const deviceInfoDiv = document.getElementById('deviceInfo');
        for (const [key, value] of Object.entries(this.collectedData.deviceInfo)) {
            const div = document.createElement('div');
            div.className = 'app-item';
            div.innerHTML = `<strong>${key}:</strong> ${value}`;
            deviceInfoDiv.appendChild(div);
        }
        
        // Display installed apps
        const appsDiv = document.getElementById('installedApps');
        if (this.collectedData.installedApps.length > 0) {
            this.collectedData.installedApps.forEach(app => {
                const div = document.createElement('div');
                div.className = 'app-item';
                div.textContent = `✓ ${app.name}`;
                appsDiv.appendChild(div);
            });
        } else {
            appsDiv.innerHTML = '<div class="app-item">No detectable applications found</div>';
        }
        
        // Display contacts
        const contactsDiv = document.getElementById('contactList');
        if (this.collectedData.contacts.length > 0 && !this.collectedData.contacts[0].error) {
            this.collectedData.contacts.forEach(contact => {
                const div = document.createElement('div');
                div.className = 'contact-item';
                let contactText = contact.name || 'Unnamed Contact';
                if (contact.phones && contact.phones.length > 0) {
                    contactText += ` - ${contact.phones[0]}`;
                }
                div.textContent = contactText;
                contactsDiv.appendChild(div);
            });
        } else {
            contactsDiv.innerHTML = '<div class="contact-item">Contact information not available</div>';
        }
        
        // Log complete data to console for verification
        console.log('Complete Collected Data:', this.collectedData);
    }
}

// Start the automated process when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AutomatedDataCollector();
});