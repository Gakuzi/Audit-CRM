// src/services/googleApiService.ts

export const createGoogleDoc = async (token: string, title: string, content: string): Promise<string> => {
    if (!token) throw new Error("Google authentication token is missing.");

    const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
    });

    if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(`Google Docs API error (create): ${errorData.error.message}`);
    }
    const doc = await createResponse.json();
    const documentId = doc.documentId;

    await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: content } }] }),
    });
    
    return `https://docs.google.com/document/d/${documentId}`;
};

export const uploadToDrive = (token: string, file: File, onProgress: (p: number) => void): Promise<{name: string, url: string}> => {
    return new Promise((resolve, reject) => {
        if (!token) return reject(new Error("Google authentication token is missing."));
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                const location = xhr.getResponseHeader('Location');
                if (location) uploadFileContent(location, file, onProgress, resolve, reject);
                else reject(new Error('Could not get resumable upload URL.'));
            } else {
                reject(new Error(`Initiating upload failed: ${xhr.statusText}`));
            }
        };
        xhr.onerror = () => reject(new Error('Network error during upload initiation.'));
        xhr.send(JSON.stringify({ name: file.name, mimeType: file.type }));
    });
};

const uploadFileContent = (location: string, file: File, onProgress: (p: number) => void, resolve: (v: {name: string, url: string}) => void, reject: (r?: any) => void) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', location);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = e => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
            const res = JSON.parse(xhr.responseText);
            resolve({ name: res.name, url: `https://drive.google.com/file/d/${res.id}/view` });
        } else {
            reject(new Error(`File upload failed: ${xhr.statusText}`));
        }
    };
    xhr.onerror = () => reject(new Error('Network error during file upload.'));
    xhr.send(file);
};

type CalendarEvent = {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: { email: string }[];
};

export const createCalendarEvent = async (token: string, calendarId: string, event: CalendarEvent): Promise<{ id: string; htmlLink: string }> => {
    if (!token) throw new Error("Google authentication token is missing.");
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error(`Google Calendar API error: ${(await res.json()).error.message}`);
    return res.json();
};

export const deleteCalendarEvent = async (token: string, calendarId: string, eventId: string): Promise<void> => {
    if (!token) throw new Error("Google authentication token is missing.");
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.status !== 204 && res.status !== 410) { // 204 No Content, 410 Gone
        throw new Error(`Google Calendar API error (delete): Status ${res.status}`);
    }
};

export const updateCalendarEvent = async (token: string, calendarId: string, eventId: string, event: CalendarEvent): Promise<{ id: string; htmlLink: string }> => {
    if (!token) throw new Error("Google authentication token is missing.");
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error(`Google Calendar API error (update): ${(await res.json()).error.message}`);
    return res.json();
};