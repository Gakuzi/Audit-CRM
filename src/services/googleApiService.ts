// src/services/googleApiService.ts

const FOLDER_NAME = "AuditFlow CRM Files";

const findOrCreateFolder = async (token: string): Promise<string> => {
    // 1. Search for the folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchRes = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!searchRes.ok) throw new Error('Could not search for Google Drive folder.');
    const searchData = await searchRes.json();
    if (searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    // 2. If not found, create it
    const createUrl = `https://www.googleapis.com/drive/v3/files`;
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    if (!createRes.ok) throw new Error('Could not create Google Drive folder.');
    const createData = await createRes.json();
    return createData.id;
};

export const uploadToDrive = async (token: string, file: File, onProgress: (p: number) => void): Promise<{ name: string, url: string }> => {
    const folderId = await findOrCreateFolder(token);

    const metadata = {
        name: file.name,
        parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                onProgress(percentComplete);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
                const fileUrl = `https://drive.google.com/file/d/${response.id}/view`;
                resolve({ name: file.name, url: fileUrl });
            } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed due to a network error.')));
        
        xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(form);
    });
};

export const createCalendarEvent = async (token: string, title: string, description: string): Promise<{ hangoutLink: string, eventLink: string }> => {
    const event = {
        summary: title,
        description: description,
        start: { dateTime: new Date().toISOString(), timeZone: 'UTC' },
        end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), timeZone: 'UTC' }, // 1 hour later
        conferenceData: {
            createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: "hangoutsMeet" }
            }
        }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Calendar API error: ${error.error.message}`);
    }

    const data = await response.json();
    return { hangoutLink: data.hangoutLink, eventLink: data.htmlLink };
};

export const createGoogleDoc = async (token: string, title: string, reportContent: string): Promise<string> => {
    const metadata = {
        name: title,
        mimeType: 'application/vnd.google-apps.document'
    };
    
    // Convert Markdown to plain text for the body
    const plainTextContent = reportContent.replace(/###/g, '').replace(/##/g, '').replace(/#/g, '').replace(/\*\*/g, '').replace(/\*/g, '');

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([plainTextContent], { type: 'text/plain' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=webViewLink', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Drive API error: ${error.error.message}`);
    }
    
    const data = await response.json();
    return data.webViewLink;
};
