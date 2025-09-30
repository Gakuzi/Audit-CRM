import React, { useState, useEffect, useRef } from 'react';
import Modal from './ui/Modal';
import { generateStageDescription } from '../services/geminiService';
import { Spinner } from './ui/Spinner';
import { FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

interface AiChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (description: string) => void;
    initialContext: string;
}

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose, onConfirm, initialContext }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const lastAiResponse = useRef<string>('');
    const chatBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setInput(initialContext);
            setMessages([]);
            lastAiResponse.current = '';
        }
    }, [isOpen, initialContext]);
    
    useEffect(() => {
        // Scroll to bottom when new messages are added
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const aiResponseText = await generateStageDescription(input);
            const aiMessage: Message = { sender: 'ai', text: aiResponseText };
            lastAiResponse.current = aiResponseText;
            setMessages(prev => [...prev, aiMessage]);
        } catch (error: any) {
            const errorMessage: Message = { sender: 'ai', text: `Произошла ошибка: ${error.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };
    
    const handleConfirm = () => {
        if (lastAiResponse.current) {
            onConfirm(lastAiResponse.current);
        } else {
            // If user wants to use their initial prompt without generation
            onConfirm(initialContext);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI-ассистент для описания этапа">
            <div className="flex flex-col h-[60vh]">
                <div ref={chatBodyRef} className="flex-grow overflow-y-auto bg-gray-50 p-4 rounded-md space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 border'}`}>
                                <ReactMarkdown className="prose prose-sm">{msg.text}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {loading && (
                         <div className="flex justify-start">
                            <div className="max-w-xs p-3 rounded-lg bg-white border">
                                <Spinner size="sm" />
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        className="w-full input"
                        placeholder="Задайте вопрос или опишите цель..."
                        disabled={loading}
                    />
                    <button onClick={handleSend} disabled={loading || !input.trim()} className="btn-primary p-3">
                        <FaPaperPlane />
                    </button>
                </div>
            </div>
             <div className="mt-4 pt-4 border-t flex justify-end">
                <button onClick={handleConfirm} className="btn-primary" disabled={!lastAiResponse.current && messages.length > 0}>
                    Использовать этот текст
                </button>
            </div>
        </Modal>
    );
};

export default AiChatModal;
