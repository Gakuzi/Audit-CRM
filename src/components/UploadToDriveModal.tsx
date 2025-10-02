import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Spinner } from './ui/Spinner';
import * as googleApiService from '../services/googleApiService';
import { FaGoogleDrive, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

interface UploadToDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  providerToken: string;
  onUploadComplete: (link: { name: string; url: string }) => void;
}

const UploadToDriveModal: React.FC<UploadToDriveModalProps> = ({ isOpen, onClose, file, providerToken, onUploadComplete }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [driveLink, setDriveLink] = useState<{name: string, url: string} | null>(null);

  useEffect(() => {
    if (isOpen && uploadStatus === 'idle') {
      handleUpload();
    }
  }, [isOpen, uploadStatus]);

  const handleUpload = async () => {
    setUploadStatus('uploading');
    setError('');
    setProgress(0);
    try {
      const link = await googleApiService.uploadToDrive(providerToken, file, setProgress);
      setDriveLink(link);
      setUploadStatus('success');
    } catch (err: any) {
      setError(err.message);
      setUploadStatus('error');
    }
  };
  
  const handleConfirmAndClose = () => {
    if (driveLink) onUploadComplete(driveLink);
    onClose();
  }

  const renderContent = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-700">Загрузка в Google Drive...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
            <p className="text-sm font-bold">{Math.round(progress)}%</p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center">
            <FaCheckCircle className="text-5xl text-green-500 mx-auto mb-4" />
            <p className="font-semibold">Файл успешно загружен!</p>
            <a href={driveLink?.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{driveLink?.url}</a>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
            <FaExclamationCircle className="text-5xl text-red-500 mx-auto mb-4" />
            <p className="font-semibold">Ошибка загрузки</p>
            <p className="text-sm text-gray-600 bg-red-100 p-2 rounded">{error}</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleConfirmAndClose} title="Загрузка большого файла">
      <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-md mb-4">
        <FaGoogleDrive className="text-2xl text-gray-500" />
        <div>
            <p className="font-semibold break-all">{file.name}</p>
            <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      </div>
      <div className="my-6 min-h-[120px] flex items-center justify-center">{renderContent()}</div>
      <div className="flex justify-end gap-2">
        {uploadStatus === 'error' && <button onClick={handleUpload} className="btn-secondary">Попробовать снова</button>}
        <button onClick={handleConfirmAndClose} className="btn-primary">{uploadStatus === 'success' ? 'Прикрепить и закрыть' : 'Закрыть'}</button>
      </div>
    </Modal>
  );
};

export default UploadToDriveModal;
