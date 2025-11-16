// sw.js - Dynamic Service Worker HTTP Server
let fileCache = new Map();

self.addEventListener('install', (event) => {
    console.log('Service Worker installing');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating');
    event.waitUntil(self.clients.claim());
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
    if (event.data.type === 'FILE_CACHE_UPDATE') {
        fileCache = new Map(event.data.files);
        console.log('Service Worker: File cache updated with', fileCache.size, 'files');
        
        // Notify all clients that cache is ready
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'CACHE_READY',
                    fileCount: fileCache.size
                });
            });
        });
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const pathname = url.pathname;
    
    // Serve dynamic file listings
    if (pathname === '/files' || pathname === '/') {
        event.respondWith(handleFilesRequest());
    }
    
    // Serve individual files
    else if (pathname.startsWith('/file/')) {
        const filename = decodeURIComponent(pathname.split('/file/')[1]);
        event.respondWith(handleFileRequest(filename));
    }
    
    // Serve folder listing
    else if (pathname === '/folders') {
        event.respondWith(handleFoldersRequest());
    }
    
    // Serve file info
    else if (pathname === '/info') {
        event.respondWith(handleInfoRequest());
    }
});

function handleFilesRequest() {
    const files = Array.from(fileCache.values()).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        downloadUrl: `/file/${encodeURIComponent(file.name)}`
    }));

    const response = {
        success: true,
        count: files.length,
        files: files,
        timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

function handleFileRequest(filename) {
    if (!fileCache.has(filename)) {
        return new Response(JSON.stringify({
            error: 'File not found',
            filename: filename,
            availableFiles: Array.from(fileCache.keys())
        }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const file = fileCache.get(filename);
    
    return new Response(file.content, {
        headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': file.size,
            'Access-Control-Allow-Origin': '*'
        }
    });
}

function handleFoldersRequest() {
    // Group files by extension for folder-like structure
    const folders = {};
    
    fileCache.forEach(file => {
        const extension = file.name.split('.').pop() || 'no-extension';
        if (!folders[extension]) {
            folders[extension] = [];
        }
        folders[extension].push(file.name);
    });

    const response = {
        success: true,
        folderCount: Object.keys(folders).length,
        folders: folders,
        timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

function handleInfoRequest() {
    const totalSize = Array.from(fileCache.values()).reduce((sum, file) => sum + file.size, 0);
    
    const response = {
        success: true,
        fileCount: fileCache.size,
        totalSize: totalSize,
        totalSizeFormatted: formatFileSize(totalSize),
        fileTypes: [...new Set(Array.from(fileCache.values()).map(f => f.type))],
        timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}