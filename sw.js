// sw.js - Service Worker for virtual HTTP server
self.addEventListener('install', (event) => {
    console.log('Service Worker installing');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Virtual API endpoints
    if (url.pathname === '/files') {
        event.respondWith(new Response(JSON.stringify({
            message: 'File listing endpoint',
            files: ['file1.txt', 'file2.jpg', 'document.pdf']
        }), {
            headers: { 'Content-Type': 'application/json' }
        }));
    }
    
    if (url.pathname.startsWith('/download/')) {
        const filename = url.pathname.split('/download/')[1];
        const content = `Virtual download of: ${filename}`;
        event.respondWith(new Response(content, {
            headers: { 
                'Content-Type': 'text/plain',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        }));
    }
});