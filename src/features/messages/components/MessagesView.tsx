"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings, ChevronLeft, Send, Clock, MapPin, Calendar, Heart, MessageSquare, X, ChevronDown, Camera, Mic, Check, FileText, Navigation } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    limit,
    Timestamp
} from 'firebase/firestore';
import { OrderDetails } from '@/features/orders/components/OrderCard';
import { getServiceVector, getSubServiceName } from '@/config/services_config';
import { uploadToCloudinary } from '@/lib/upload';
import { compressImageFileToDataUrl } from '@/lib/imageCompression';
import { format, parseISO } from 'date-fns';

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    text?: string;
    imageUrl?: string;
    audioUrl?: string;
    timestamp: any;
    isOwn: boolean;
}

interface Conversation {
    jobId: string;
    participantId: string;
    participantName: string;
    participantAvatar?: string;
    lastMessage: string;
    lastMessageTime: any;
    unreadCount?: number;
    jobTitle: string;
    jobSubService?: string;
    jobDates?: string;
    jobTime?: string;
    jobLocation?: string;
    jobDescription?: string;
    status: string;
    isUnread: boolean;
}

interface MessagesViewProps {
    orders: OrderDetails[];
    currentUser: any;
    initialSelectedJobId?: string | null;
    isModal?: boolean;
    onBackToOrders?: () => void;
    impersonateBricoler?: { id: string; name: string; avatar?: string };
}

const MessagesView: React.FC<MessagesViewProps> = ({
    orders, currentUser, initialSelectedJobId, isModal, onBackToOrders, impersonateBricoler
}) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [selectedJobId, setSelectedJobId] = useState<string | null>(initialSelectedJobId || null);

    useEffect(() => {
        if (initialSelectedJobId) {
            setSelectedJobId(initialSelectedJobId);
        }
    }, [initialSelectedJobId]);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeMessages, setActiveMessages] = useState<Message[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    // Staged image: local DataURL shown in preview before upload
    const [pendingImage, setPendingImage] = useState<{ dataUrl: string; file: File } | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#000000',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#717171' : '#B0B0B0',
        border: theme === 'light' ? '#EBEBEB' : '#2D2D2D',
        surface: theme === 'light' ? '#F7F7F7' : '#1A1A1A',
        accent: '#01A083'
    };

    const getTimeRemaining = () => {
        const conversation = conversations.find(c => c.jobId === selectedJobId);
        if (!conversation?.jobDates || !conversation?.jobTime) return null;

        try {
            const dateStr = conversation.jobDates;
            const timeStr = conversation.jobTime.split('-')[0].trim();
            const jobDateTime = new Date(`${dateStr}T${timeStr}:00`);
            const now = new Date();
            const diffMs = jobDateTime.getTime() - now.getTime();

            if (diffMs <= 0) return null;

            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            if (diffHours >= 24) {
                const diffDays = Math.floor(diffHours / 24);
                return `(${diffDays}j rest.)`;
            }

            return `(${diffHours}h ${diffMins}m rest.)`;
        } catch (e) {
            return null;
        }
    };

    if (!currentUser) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                <div style={{ padding: '60px 20px' }}>
                    <MessageSquare size={64} style={{ margin: '0 auto 24px', opacity: 0.1 }} />
                    <h2 style={{ fontSize: '24px', fontWeight: 550, color: c.text, marginBottom: '12px' }}>
                        {t({ en: 'Login to see messages', fr: 'Connectez-vous pour voir vos messages' })}
                    </h2>
                    <p style={{ color: c.textMuted, fontWeight: 400, marginBottom: '24px' }}>
                        {t({ en: 'Keep track of your conversations and project updates.', fr: 'Suivez vos conversations et les mises à jour de vos projets.' })}
                    </p>
                </div>
            </div>
        );
    }

    // Scroll to bottom helper
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeMessages]);

    // 1. Build Conversations List from Orders
    useEffect(() => {
        if (!orders || orders.length === 0) return;

        const unsubs: (() => void)[] = [];
        const chatOrders = orders.filter(o => o.id && (o.bricolerId || o.clientId));

        chatOrders.forEach(order => {
            const messagesRef = collection(db, 'jobs', order.id!, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));

            const unsub = onSnapshot(q, (snapshot) => {
                const lastMsgDoc = snapshot.docs[0];
                const lastMsgData = lastMsgDoc?.data();

                setConversations(prev => {
                    const participantId = currentUser.uid === order.clientId ? order.bricolerId : order.clientId;
                    if (!participantId) return prev;

                    const newConv: Conversation = {
                        jobId: order.id!,
                        participantId: participantId,
                        participantName: (currentUser.uid === order.clientId ? order.bricolerName : order.clientName) || 'User',
                        participantAvatar: (currentUser.uid === order.clientId ? order.bricolerAvatar : order.clientAvatar) || undefined,
                        lastMessage: lastMsgData?.text || t({ en: 'Send a message to start', fr: 'Envoyez un message pour commencer' }),
                        lastMessageTime: lastMsgData?.timestamp || null,
                        jobTitle: order.service,
                        jobSubService: order.subServiceDisplayName || getSubServiceName(order.serviceId || order.service, order.subService || '') || order.service,
                        jobDates: order.date,
                        jobTime: order.time,
                        jobLocation: order.city || order.area || order.location,
                        jobDescription: order.description || order.comment,
                        status: order.status || 'new',
                        isUnread: lastMsgData && lastMsgData.senderId !== currentUser.uid
                    };

                    const existingIdx = prev.findIndex(c => c.jobId === order.id);
                    let baseConversations = [...prev];
                    if (existingIdx > -1) {
                        baseConversations[existingIdx] = newConv;
                    } else {
                        baseConversations.push(newConv);
                    }

                    // GROUP BY participantId: Keep only the one with the latest lastMessageTime
                    const grouped: Record<string, Conversation> = {};
                    baseConversations.forEach(c => {
                        if (!grouped[c.participantId] || (c.lastMessageTime?.seconds || 0) > (grouped[c.participantId].lastMessageTime?.seconds || 0)) {
                            grouped[c.participantId] = c;
                        }
                    });

                    return Object.values(grouped).sort((a, b) => (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));
                });
            });
            unsubs.push(unsub);
        });

        return () => unsubs.forEach(u => u());
    }, [orders, currentUser, t]);

    // 2. Listen to Active Chat Messages
    useEffect(() => {
        if (!selectedJobId) {
            setActiveMessages([]);
            return;
        }

        const messagesRef = collection(db, 'jobs', selectedJobId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    text: data.text,
                    imageUrl: data.imageUrl,
                    audioUrl: data.audioUrl,
                    timestamp: data.timestamp,
                    isOwn: data.senderId === (impersonateBricoler ? impersonateBricoler.id : currentUser.uid)
                } as Message;
            });
            setActiveMessages(msgs);
        });

        return () => unsub();
    }, [selectedJobId, currentUser]);

    const handleSendMessage = async (customContent?: { text?: string, imageUrl?: string, audioUrl?: string }) => {
        if (!customContent && !messageInput.trim()) return;
        if (!selectedJobId) return;

        const text = customContent?.text || messageInput.trim();
        if (!customContent) setMessageInput('');

        try {
            const senderId = impersonateBricoler ? impersonateBricoler.id : currentUser.uid;
            const senderName = impersonateBricoler ? impersonateBricoler.name : (currentUser.displayName || 'You');

            const messageData: any = {
                senderId: senderId,
                senderName: senderName,
                timestamp: serverTimestamp()
            };

            if (text) messageData.text = text;
            if (customContent?.imageUrl) messageData.imageUrl = customContent.imageUrl;
            if (customContent?.audioUrl) messageData.audioUrl = customContent.audioUrl;

            await addDoc(collection(db, 'jobs', selectedJobId, 'messages'), messageData);

            // Notify the other participant
            const conversation = conversations.find(c => c.jobId === selectedJobId);
            if (conversation && conversation.participantId) {
                const recipientId = conversation.participantId;
                const isClient = orders.some(o => o.id === selectedJobId && o.clientId === recipientId);
                const notificationCollection = isClient ? 'client_notifications' : 'bricoler_notifications';

                let notificationText = text;
                if (!text && customContent?.imageUrl) notificationText = '📷 Sent a photo';
                if (!text && customContent?.audioUrl) notificationText = '🎤 Sent a voice message';

                await addDoc(collection(db, notificationCollection), {
                    [isClient ? 'clientId' : 'bricolerId']: recipientId,
                    type: 'new_message',
                    jobId: selectedJobId,
                    serviceName: conversation.jobTitle || 'Service',
                    senderName: senderName,
                    senderAvatar: impersonateBricoler ? (impersonateBricoler.avatar || null) : (currentUser.photoURL || null),
                    text: notificationText.length > 50 ? `${notificationText.substring(0, 50)}...` : notificationText,
                    read: false,
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    // handlePhotoUpload: stage the image locally; do NOT upload yet
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset input so same file can be re-selected if needed
        e.target.value = '';
        try {
            const dataUrl = await compressImageFileToDataUrl(file, { maxWidth: 1024, quality: 0.7 });
            setPendingImage({ dataUrl, file });
        } catch (err) {
            console.error('Image preview failed:', err);
        }
    };

    // Upload the staged image and send
    const handleSendPendingImage = async () => {
        if (!pendingImage || !selectedJobId) return;
        setIsUploading(true);
        try {
            const imageUrl = await uploadToCloudinary(
                pendingImage.dataUrl,
                `lbricol/chat/${selectedJobId}`,
                'lbricol_portfolio'
            );
            await handleSendMessage({ imageUrl });
            setPendingImage(null);
        } catch (error) {
            console.error('Photo upload failed:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setIsUploading(true);
                try {
                    // Convert blob to base64 for upload
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64Audio = reader.result as string;
                        // Use a generic name for the audio file in cloudinary
                        const audioUrl = await uploadToCloudinary(
                            base64Audio,
                            `lbricol/chat/${selectedJobId}/audio`,
                            'lbricol_portfolio'
                        );
                        await handleSendMessage({ audioUrl });
                        setIsUploading(false);
                    };
                } catch (error) {
                    console.error("Audio upload failed:", error);
                    setIsUploading(false);
                }

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Filter Logic
    const activeServices = Array.from(new Set(conversations.map(c => c.jobTitle)));
    const filters = [
        { id: 'all', label: t({ en: 'All', fr: 'Tout' }) },
        ...activeServices.map(s => ({ id: s.toLowerCase(), label: s }))
    ];

    const displayedConversations = conversations.filter(c => {
        const matchesFilter = activeFilter === 'all' || c.jobTitle.toLowerCase() === activeFilter;
        const matchesSearch = c.participantName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (selectedJobId) {
        const conversation = conversations.find((c) => c.jobId === selectedJobId);

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: '#FFFFFF',
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999
            }}>
                {/* Chat Header — Matching Screenshot */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderBottom: '1px solid #F0F0F0',
                    backgroundColor: '#FFFFFF',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                }}>
                    <button
                        onClick={() => {
                            if (selectedJobId && !isModal) {
                                setSelectedJobId(null);
                            } else if (onBackToOrders) {
                                onBackToOrders();
                            } else {
                                setSelectedJobId(null);
                            }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                    >
                        <X size={24} color="#333" />
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#000', margin: 0 }}>{t({ en: 'Chat', fr: 'Chat' })}</h2>
                    <div style={{ width: '40px' }} /> {/* Spacer to center title */}
                </div>

                {/* Mini Job Dashboard Header — Premium Refinement */}
                <div style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%)',
                    borderBottom: '1px solid #F0F0F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '52px',
                            height: '52px',
                            background: 'white',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFF',
                            overflow: 'hidden',
                            padding: '10px'
                        }}>
                            <img
                                src={getServiceVector(conversation?.jobTitle || '')}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                }}
                                alt={conversation?.jobTitle}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: 1000,
                                    margin: 0,
                                    color: '#000',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontFamily: 'Uber Move, var(--font-sans)',
                                    textTransform: 'capitalize'
                                }}>
                                    {conversation?.jobSubService || conversation?.jobTitle}
                                </h3>
                                {(() => {
                                    const status = conversation?.status || 'new';
                                    const isDone = status === 'done' || status === 'delivered';
                                    const isProgrammed = status === 'accepted' || status === 'programmed';
                                    return (
                                        <div style={{
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            backgroundColor: isDone ? '#E6F7F4' : isProgrammed ? '#EBF5FF' : '#FFF9E5',
                                            color: isDone ? '#01A083' : isProgrammed ? '#0064E0' : '#FFB800',
                                            fontSize: '11px',
                                            fontWeight: 900,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            border: `1px solid ${isDone ? '#01A08320' : isProgrammed ? '#0064E020' : '#FFB80020'}`
                                        }}>
                                            {status}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Calendar size={13} color="#999" strokeWidth={2.5} />
                                    <span style={{ fontSize: '13px', color: '#666', fontWeight: 700 }}>
                                        {conversation?.jobDates && conversation.jobDates !== 'flexible' ? format(parseISO(conversation.jobDates), 'd MMM') : 'Flexible'}
                                    </span>
                                </div>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#DDD' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Clock size={13} color="#999" strokeWidth={2.5} />
                                    <span style={{ fontSize: '13px', color: '#666', fontWeight: 700 }}>{conversation?.jobTime}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', fontSize: '11px', color: '#999', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>{t({ en: 'Budget', fr: 'Budget' })}</span>
                            <div style={{ fontSize: '20px', fontWeight: 1000, color: '#000', fontFamily: 'Uber Move, var(--font-sans)' }}>
                                {orders.find(o => o.id === selectedJobId)?.totalPrice || orders.find(o => o.id === selectedJobId)?.price || '--'}
                                <span style={{ fontSize: '12px', color: '#01A083', marginLeft: '4px' }}>MAD</span>
                            </div>
                        </div>
                    </div>

                    {/* Provider-only Quick Actions */}
                    {currentUser.uid !== (orders.find(o => o.id === selectedJobId)?.clientId) && (
                        <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    const order = orders.find(o => o.id === selectedJobId);
                                    if (!order) return;
                                    const query = order.coords ? `${order.coords.lat},${order.coords.lng}` : `${order.area || ''} ${order.city || ''}`;
                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`, '_blank');
                                }}
                                style={{
                                    flex: 1,
                                    height: '44px',
                                    borderRadius: '100px',
                                    backgroundColor: '#01A083',
                                    color: '#FFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    fontWeight: 900,
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <MapPin size={18} strokeWidth={2.5} />
                                {t({ en: 'Navigate', fr: 'Naviguer' })}
                            </motion.button>

                            {orders.find(o => o.id === selectedJobId)?.providerStatus !== 'heading' &&
                                (orders.find(o => o.id === selectedJobId)?.status === 'accepted' || orders.find(o => o.id === selectedJobId)?.status === 'programmed') && (
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={async () => {
                                            const order = orders.find(o => o.id === selectedJobId);
                                            if (!order || !order.id) return;

                                            // Find the provider status update function from parent if passed, 
                                            // or we can handle it here via direct firebase update if we had the context.
                                            // For now, let's assume we can trigger a message at least.
                                            const messageText = t({ en: "On my way! 🚀", fr: "Je suis en chemin ! 🚀" });
                                            await handleSendMessage({ text: messageText });

                                            // Note: In a real app, we'd call a prop to update the DB status too.
                                            try {
                                                const { doc, updateDoc } = await import('firebase/firestore');
                                                const jobRef = doc(db, 'jobs', order.id);
                                                await updateDoc(jobRef, { providerStatus: 'heading' });
                                            } catch (e) { console.error(e); }
                                        }}
                                        style={{
                                            flex: 1.2,
                                            height: '42px',
                                            borderRadius: '12px',
                                            backgroundColor: '#01A083',
                                            color: '#FFF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            fontWeight: 900,
                                            border: 'none',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(1, 160, 131, 0.2)'
                                        }}
                                    >
                                        <Navigation size={16} strokeWidth={2.5} />
                                        {t({ en: 'On My Way', fr: 'Je suis en route' })}
                                    </motion.button>
                                )}
                        </div>
                    )}
                </div>

                {/* Messages Container */}
                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
                    <div
                        style={{
                            padding: '10px 20px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                    >
                        {activeMessages.length === 0 && (
                            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#999', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <MessageSquare size={48} opacity={0.2} />
                                <p style={{ fontWeight: 600 }}>{t({ en: 'Start chatting about your service', fr: 'Commencez à discuter de votre service' })}</p>
                            </div>
                        )}

                        {activeMessages.map((message, index) => {
                            const msgDate = message.timestamp?.toDate();
                            const showDate = index === 0 ||
                                (msgDate && activeMessages[index - 1].timestamp?.toDate().toDateString() !== msgDate.toDateString());

                            const bubbleOwn = {
                                background: '#01A083',
                                color: '#ffffff',
                                borderRadius: '22px 22px 4px 22px',
                            };
                            const bubbleOther = {
                                background: '#FFC244',
                                color: '#1a1a1a',
                                borderRadius: '22px 22px 22px 4px',
                            };

                            return (
                                <React.Fragment key={message.id}>
                                    {showDate && msgDate && (
                                        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#999', margin: '16px 0', textTransform: 'uppercase' }}>
                                            {msgDate.toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), { day: 'numeric', month: 'long' })}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: message.isOwn ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end', marginBottom: '6px' }}>
                                        {!message.isOwn && (
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: `1px solid ${c.border}` }}>
                                                {conversation?.participantAvatar ? (
                                                    <img src={conversation.participantAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ fontSize: '12px', fontWeight: 900, color: c.textMuted }}>{conversation?.participantName?.[0]}</div>
                                                )}
                                            </div>
                                        )}
                                        <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0, y: 6 }}
                                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                                                style={{
                                                    padding: (message.imageUrl || message.audioUrl) ? '4px' : '12px 18px',
                                                    ...(message.isOwn ? bubbleOwn : bubbleOther),
                                                    fontSize: '15px',
                                                    lineHeight: '1.45',
                                                    fontWeight: 500,
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {message.imageUrl && (
                                                    <img
                                                        src={message.imageUrl}
                                                        style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '18px', display: 'block', objectFit: 'cover' }}
                                                        alt="Sent photo"
                                                    />
                                                )}
                                                {message.audioUrl && (
                                                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: message.isOwn ? 'rgba(255,255,255,0.2)' : '#01A08310', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Mic size={18} color={message.isOwn ? '#FFF' : '#01A083'} />
                                                        </div>
                                                        <audio src={message.audioUrl} controls style={{ height: '30px', width: '150px' }} />
                                                    </div>
                                                )}
                                                {message.text && <span>{message.text}</span>}
                                            </motion.div>
                                            <div style={{ fontSize: '11px', color: '#aaa', textAlign: message.isOwn ? 'right' : 'left', fontWeight: 600, padding: '0 4px' }}>
                                                {!message.isOwn && <span style={{ marginRight: '6px' }}>{message.senderName?.split(' ')[0]} ·</span>}
                                                {msgDate ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Message Input Area */}
                <div
                    style={{
                        borderTop: '1px solid #F0F0F0',
                        backgroundColor: '#FFFFFF',
                        paddingBottom: isModal ? '20px' : 'max(76px, calc(76px + env(safe-area-inset-bottom)))',
                        flexShrink: 0
                    }}
                >
                    {/* ── Pending Image Preview Strip ── */}
                    <AnimatePresence>
                        {pendingImage && (
                            <motion.div
                                key="img-preview"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ padding: '12px 20px 0', overflow: 'hidden' }}
                            >
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img
                                        src={pendingImage.dataUrl}
                                        alt="Preview"
                                        style={{ height: '120px', borderRadius: '14px', objectFit: 'cover', display: 'block', border: '2px solid #01A083' }}
                                    />
                                    <button
                                        onClick={() => { setPendingImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        style={{
                                            position: 'absolute', top: '-8px', right: '-8px',
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            background: '#FF385C', border: '2px solid #fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        <X size={12} color="#fff" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px 0' }}>
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || !!pendingImage}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#01A083', opacity: (isUploading || !!pendingImage) ? 0.4 : 1 }}
                        >
                            <Camera size={26} />
                        </button>

                        {isRecording ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#FFF0F0', borderRadius: '12px', padding: '10px 16px', border: '1.5px solid #FF385C' }}>
                                <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF385C' }} />
                                <span style={{ flex: 1, fontSize: '14px', fontWeight: 900, color: '#FF385C' }}>Recording... {formatDuration(recordingDuration)}</span>
                                <button onClick={stopRecording} style={{ background: '#FF385C', color: '#FFF', border: 'none', padding: '4px 12px', borderRadius: '8px', fontWeight: 900, fontSize: '12px' }}>STOP</button>
                            </div>
                        ) : (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: '#FFFFFF',
                                borderRadius: '12px',
                                padding: '10px 16px',
                                border: '1.5px solid #01A083',
                                opacity: isUploading ? 0.5 : 1
                            }}>
                                <input
                                    type="text"
                                    value={messageInput}
                                    disabled={isUploading}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (pendingImage ? handleSendPendingImage() : handleSendMessage())}
                                    placeholder={isUploading ? 'Sending...' : t({ en: 'Write a message...', fr: 'Écrire un message...' })}
                                    style={{
                                        flex: 1,
                                        background: 'none',
                                        border: 'none',
                                        color: '#000',
                                        fontSize: '16px',
                                        outline: 'none',
                                        fontWeight: 500
                                    }}
                                />
                            </div>
                        )}

                        {/* Right action button: Send (if text or pending image) | Mic */}
                        {(messageInput.trim() || pendingImage) ? (
                            <button
                                onClick={() => pendingImage ? handleSendPendingImage() : handleSendMessage()}
                                disabled={isUploading}
                                style={{
                                    width: '42px', height: '42px', borderRadius: '50%',
                                    background: isUploading ? '#ccc' : 'linear-gradient(135deg, #01A083, #00c9a7)',
                                    border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(1,160,131,0.35)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {isUploading
                                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />
                                    : <Send size={18} color="#fff" />
                                }
                            </button>
                        ) : !isRecording ? (
                            <button
                                onClick={startRecording}
                                disabled={isUploading}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#01A083', opacity: isUploading ? 0.5 : 1 }}
                            >
                                <Mic size={26} />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    // Inbox View
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: c.bg }}>
            {/* Header */}
            <div
                style={{
                    padding: '24px 20px 16px',
                    borderBottom: `1px solid ${c.border}`,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                    {!isModal && (
                        <h1 style={{ fontSize: '32px', fontWeight: 950, color: c.text, margin: 0, textAlign: 'left', fontFamily: 'Uber Move, var(--font-sans)', letterSpacing: '-0.03em' }}>
                            {t({ en: 'Messages', fr: 'Messages' })}
                        </h1>
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: c.surface, borderRadius: '100px', padding: '12px 16px', border: `1px solid ${c.border}`, width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                        <Search size={18} color={c.textMuted} />
                        <input
                            type="text"
                            placeholder={t({ en: 'Search...', fr: 'Rechercher...' })}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                color: c.text,
                                fontSize: '15px',
                                fontWeight: 600,
                                width: '100%'
                            }}
                        />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    {filters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '100px',
                                border: activeFilter === filter.id ? '1.5px solid #01A083' : `1.5px solid ${c.border}`,
                                backgroundColor: activeFilter === filter.id ? '#01A083' : 'transparent',
                                color: activeFilter === filter.id ? '#FFF' : c.text,
                                fontSize: '13px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                textTransform: 'capitalize'
                            }}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conversations List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: isModal ? '16px' : '80px' }}>
                {displayedConversations.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: c.textMuted }}>
                        <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.1 }} />
                        <p style={{ fontWeight: 700, fontSize: '18px', color: c.text }}>{t({ en: 'No messages yet', fr: 'Aucun message pour l\'instant' })}</p>
                        <p style={{ fontSize: '14px', marginTop: '4px' }}>{t({ en: 'Messages about your services will appear here.', fr: 'Les messages concernant vos services apparaîtront ici.' })}</p>
                    </div>
                ) : (
                    displayedConversations.map((conversation) => (
                        <motion.div
                            key={conversation.jobId}
                            onClick={() => setSelectedJobId(conversation.jobId)}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                display: 'flex',
                                gap: '16px',
                                padding: '20px',
                                borderBottom: `1px solid ${c.border}`,
                                cursor: 'pointer',
                                backgroundColor: conversation.isUnread ? (theme === 'light' ? '#F9F9F9' : '#111111') : 'transparent',
                                borderLeft: conversation.isUnread ? `4px solid ${c.accent}` : '4px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    backgroundColor: c.surface,
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                    border: `1px solid ${c.border}`
                                }}
                            >
                                {conversation.participantAvatar ? (
                                    <img
                                        src={conversation.participantAvatar}
                                        alt={conversation.participantName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '20px', color: c.textMuted }}>
                                        {conversation.participantName[0]}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                    <div style={{ fontSize: '17px', fontWeight: conversation.isUnread ? 950 : 800, color: c.text, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {conversation.participantName}
                                        {conversation.isUnread && (
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.accent }} />
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: c.textMuted, fontWeight: 700 }}>
                                        {conversation.lastMessageTime ? (
                                            conversation.lastMessageTime.toDate().toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit'
                                            })
                                        ) : ''}
                                    </div>
                                </div>

                                <div style={{
                                    fontSize: '14px',
                                    color: c.text,
                                    fontWeight: conversation.isUnread ? 900 : 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    marginBottom: '6px',
                                    opacity: conversation.isUnread ? 1 : 0.8
                                }}>
                                    {conversation.lastMessage}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#01A083', backgroundColor: '#01A08310', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                        {conversation.jobTitle}
                                    </div>
                                    <div style={{ fontSize: '11px', color: c.textMuted, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={10} /> {conversation.jobLocation}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MessagesView;
