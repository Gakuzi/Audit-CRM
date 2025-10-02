// src/hooks/useGooglePicker.ts
import { useState, useEffect, useCallback } from 'react';

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

interface PickerFile {
    id: string;
    name: string;
    url: string;
    mimeType: string;
}

interface UseGooglePickerOptions {
    token: string | null;
    onFilesSelected: (files: PickerFile[]) => void;
}

export const useGooglePicker = ({ token, onFilesSelected }: UseGooglePickerOptions) => {
    const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(false);

    useEffect(() => {
        if (window.gapi && window.google) {
            setIsPickerApiLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.gapi.load('picker', () => {
                setIsPickerApiLoaded(true);
            });
        };
        document.body.appendChild(script);

        return () => {
            // It's generally safe to leave the script in the document, 
            // but if cleanup is needed, it can be handled here.
        };
    }, []);

    const openPicker = useCallback(() => {
        if (!isPickerApiLoaded) {
            alert('Google Picker API еще не загружен. Пожалуйста, подождите.');
            return;
        }
        if (!token) {
            alert('Вы не авторизованы через Google. Пожалуйста, войдите, чтобы использовать Google Drive.');
            return;
        }

        const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
        view.setMimeTypes("image/png,image/jpeg,image/jpg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        
        const picker = new window.google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(token)
            // No developer key is set, assuming the origin is authorized in the Google Cloud project.
            .setCallback((data: any) => {
                if (data.action === window.google.picker.Action.PICKED) {
                    const files: PickerFile[] = data.docs.map((doc: any) => ({
                        id: doc.id,
                        name: doc.name,
                        url: doc.url,
                        mimeType: doc.mimeType,
                    }));
                    onFilesSelected(files);
                }
            })
            .build();
        picker.setVisible(true);
    }, [isPickerApiLoaded, token, onFilesSelected]);

    return { openPicker, isPickerReady: isPickerApiLoaded && !!token };
};
