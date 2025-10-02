// src/services/googleApiService.ts

export const createGoogleDoc = async (token: string, title: string, content: string): Promise<string> => {
    if (!token) {
        throw new Error("Google authentication token is missing.");
    }

    // 1. Create an empty Google Doc
    const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
    });

    if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(`Google Docs API error (create): ${errorData.error.message}`);
    }

    const doc = await createResponse.json();
    const documentId = doc.documentId;

    // 2. Insert the content into the doc
    const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [{
                insertText: {
                    location: { index: 1 },
                    text: content,
                }
            }]
        }),
    });

    if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        // Best effort: still return the link to the (empty) doc
        console.error(`Google Docs API error (update): ${errorData.error.message}`);
    }
    
    return `https://docs.google.com/document/d/${documentId}`;
};

export const uploadToDrive = (token: string, file: File, onProgress: (p: number) => void): Promise<{name: string, url: string}> => {
    return new Promise((resolve, reject) => {
        if (!token) {
            return reject(new Error("Google authentication token is missing."));
        }
        
        const metadata = { name: file.name, mimeType: file.type };
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                const location = xhr.getResponseHeader('Location');
                if (location) {
                    uploadFileContent(location, file, onProgress, resolve, reject);
                } else {
                    reject(new Error('Could not get resumable upload URL.'));
                }
            } else {
                reject(new Error(`Initiating upload failed: ${xhr.statusText}`));
            }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload initiation.'));
        
        xhr.send(JSON.stringify(metadata));
    });
};

const uploadFileContent = (location: string, file: File, onProgress: (p: number) => void, resolve: (value: {name: string, url: string}) => void, reject: (reason?: any) => void) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', location);
    xhr.setRequestHeader('Content-Type', file.type);
    
    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percentage = (event.loaded / event.total) * 100;
            onProgress(percentage);
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            const fileUrl = `https://drive.google.com/file/d/${response.id}/view`;
            resolve({ name: response.name, url: fileUrl });
        } else {
            reject(new Error(`File upload failed: ${xhr.statusText}`));
        }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload.'));
    
    xhr.send(file);
};

export const createCalendarEvent = async (
    token: string,
    calendarId: string,
    event: {
        summary: string;
        description: string;
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        attendees?: { email: string }[];
    }
): Promise<{ id: string; htmlLink: string }> => {
     if (!token) {
        throw new Error("Google authentication token is missing.");
    }
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Calendar API error: ${errorData.error.message}`);
    }
    
    const createdEvent = await response.json();
    return { id: createdEvent.id, htmlLink: createdEvent.htmlLink };
};

export const deleteCalendarEvent = async (token: string, calendarId: string, eventId: string): Promise<void> => {
     if (!token) {
        throw new Error("Google authentication token is missing.");
    }
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (response.status !== 204 && response.status !== 410) { // 204 No Content, 410 Gone
        try {
            const errorData = await response.json();
            throw new Error(`Google Calendar API error (delete): ${errorData.error.message}`);
        } catch(e) {
            throw new Error(`Google Calendar API error (delete): Status ${response.status}`);
        }
    }
};

export const updateCalendarEvent = async (
    token: string,
    calendarId: string,
    eventId: string,
    event: {
        summary: string;
        description: string;
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        attendees?: { email: string }[];
    }
): Promise<{ id: string; htmlLink: string }> => {
    if (!token) {
        throw new Error("Google authentication token is missing.");
    }
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Calendar API error (update): ${errorData.error.message}`);
    }
    
    const updatedEvent = await response.json();
    return { id: updatedEvent.id, htmlLink: updatedEvent.htmlLink };
};
