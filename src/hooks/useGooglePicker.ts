// src/hooks/useGooglePicker.ts
import { useState, useEffect, useCallback } from 'react';

// Fix: Add global declarations for Google APIs to resolve 'Cannot find name' errors.
declare const gapi: any;
declare const google: any;

interface GooglePickerConfig {
    clientId: string;
    developerKey: string;
    token: string | null;
    onSelect: (files: any[]) => void;
}

let gapiLoaded = false;
let gapiLoading = false;

export const useGooglePicker = ({ clientId, developerKey, token, onSelect }: GooglePickerConfig) => {
    const [isPickerReady, setIsPickerReady] = useState(false);

    const loadGapi = useCallback(() => {
        if (gapiLoaded) {
            gapi.load('picker', { 'callback': () => { setIsPickerReady(true); } });
            return;
        }

        if (gapiLoading) {
            return;
        }

        gapiLoading = true;
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapiLoaded = true;
            gapiLoading = false;
            gapi.load('picker', { 'callback': () => { setIsPickerReady(true); } });
        };
        script.onerror = () => {
            gapiLoading = false;
            console.error("Failed to load Google API script.");
        }
        document.body.appendChild(script);
    }, []);

    useEffect(() => {
        if (token) {
            loadGapi();
        }
    }, [token, loadGapi]);

    const openPicker = useCallback(() => {
        if (!isPickerReady || !token) {
            console.error("Picker is not ready or token is missing.");
            // Attempt to load GAPI if it failed before
            if (!gapiLoaded) {
                loadGapi();
            }
            return;
        }
        
        if (!developerKey) {
            console.error("Google Picker API developer key is missing.");
            alert("Ошибка конфигурации: отсутствует ключ разработчика Google API.");
            return;
        }

        const view = new google.picker.View(google.picker.ViewId.DOCS);
        view.setMimeTypes("image/png,image/jpeg,image/jpg,application/pdf,application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet");

        const picker = new google.picker.PickerBuilder()
            .enableFeature(google.picker.Feature.NAV_HIDDEN)
            .setOAuthToken(token)
            .addView(view)
            .setDeveloperKey(developerKey)
            .setCallback((data: any) => {
                if (data[google.picker.Action.PICKED]) {
                    onSelect(data[google.picker.Response.DOCUMENTS]);
                }
            })
            .setOrigin(window.location.origin)
            .build();
        picker.setVisible(true);

    }, [isPickerReady, token, clientId, developerKey, onSelect, loadGapi]);

    return { openPicker, isPickerReady };
};
