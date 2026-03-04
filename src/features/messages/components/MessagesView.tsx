"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings, ChevronLeft, Send, Clock, MapPin, Calendar, Heart, MessageSquare, X, ChevronDown, Camera, Check, FileText } from 'lucide-react';
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
import { getServiceVector } from '@/config/services_config';

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    text: string;
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
    impersonateBricoler?: { id: string; name: string };
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#000000',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#717171' : '#B0B0B0',
        border: theme === 'light' ? '#EBEBEB' : '#2D2D2D',
        surface: theme === 'light' ? '#F7F7F7' : '#1A1A1A',
        accent: '#FF385C'
    };

    if (!currentUser) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                <div style={{ padding: '60px 20px' }}>
                    <MessageSquare size={64} style={{ margin: '0 auto 24px', opacity: 0.1 }} />
                    <h2 style={{ fontSize: '24px', fontWeight: 950, color: c.text, marginBottom: '12px' }}>
                        {t({ en: 'Login to see messages', fr: 'Connectez-vous pour voir vos messages' })}
                    </h2>
                    <p style={{ color: c.textMuted, fontWeight: 600, marginBottom: '24px' }}>
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
                        participantAvatar: currentUser.uid === order.clientId ? order.bricolerAvatar : order.clientAvatar,
                        lastMessage: lastMsgData?.text || t({ en: 'Send a message to start', fr: 'Envoyez un message pour commencer' }),
                        lastMessageTime: lastMsgData?.timestamp || null,
                        jobTitle: order.service,
                        jobSubService: order.subServiceDisplayName,
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
                    timestamp: data.timestamp,
                    isOwn: data.senderId === (impersonateBricoler ? impersonateBricoler.id : currentUser.uid)
                } as Message;
            });
            setActiveMessages(msgs);
        });

        return () => unsub();
    }, [selectedJobId, currentUser]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedJobId) return;

        const text = messageInput.trim();
        setMessageInput('');

        try {
            const senderId = impersonateBricoler ? impersonateBricoler.id : currentUser.uid;
            const senderName = impersonateBricoler ? impersonateBricoler.name : (currentUser.displayName || 'You');

            await addDoc(collection(db, 'jobs', selectedJobId, 'messages'), {
                senderId: senderId,
                senderName: senderName,
                text: text,
                timestamp: serverTimestamp()
            });

            // Notify the other participant
            const conversation = conversations.find(c => c.jobId === selectedJobId);
            if (conversation && conversation.participantId) {
                const recipientId = conversation.participantId;
                const isClient = orders.some(o => o.id === selectedJobId && o.clientId === recipientId);
                const notificationCollection = isClient ? 'client_notifications' : 'bricoler_notifications';

                await addDoc(collection(db, notificationCollection), {
                    [isClient ? 'clientId' : 'bricolerId']: recipientId,
                    type: 'new_message',
                    jobId: selectedJobId,
                    serviceName: conversation.jobTitle || 'Service',
                    senderName: impersonateBricoler ? impersonateBricoler.name : (currentUser.displayName || 'User'),
                    text: text.length > 50 ? `${text.substring(0, 50)}...` : text,
                    read: false,
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FFFFFF' }}>
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
                            if (onBackToOrders) {
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

                {/* Messages & Task Info Container */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Relevant Task info card — matching screenshot layout */}
                    <div style={{ padding: '20px 20px 10px' }}>
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '16px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #F0F0F0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '12px',
                                backgroundColor: '#F9F9F9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #F0F0F0',
                                overflow: 'hidden'
                            }}>
                                <img
                                    src={getServiceVector(conversation?.jobTitle)}
                                    style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <div style={{
                                        backgroundColor: '#06C16710',
                                        color: '#06C167',
                                        fontSize: '10px',
                                        fontWeight: 900,
                                        padding: '2px 8px',
                                        borderRadius: '4px'
                                    }}>
                                        {conversation?.status?.replace('_', ' ').toUpperCase() || 'ON TIME'}
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {conversation?.jobTitle?.toLowerCase() || 'service'} › {conversation?.jobSubService || 'General'}
                                    </span>
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#666', marginRight: '8px' }}>
                                        {conversation?.jobDates ? new Date(conversation.jobDates).toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), { day: 'numeric', month: 'short' }) : t({ en: 'Flexible', fr: 'Flexible' })}
                                    </span>
                                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>
                                        {conversation?.jobTime || t({ en: 'Flexible', fr: 'Flexible' })}
                                    </span>
                                    {conversation?.status === 'confirmed' && (
                                        <span style={{ fontSize: '13px', color: '#06C167', fontWeight: 700, marginLeft: '6px' }}>({t({ en: 'On track', fr: 'Sur la bonne voie' })})</span>
                                    )}
                                </div>
                                <div style={{ width: '100%', height: '4px', backgroundColor: '#F0F0F0', borderRadius: '2px', overflow: 'hidden' }}>
                                </div>
                            </div>
                        </div>

                        {conversation?.jobDescription && (
                            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <FileText size={14} color="#00A082" />
                                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#333' }}>{t({ en: 'TASK DESCRIPTION', fr: 'DESCRIPTION DE LA MISSION' })}</span>
                                </div>
                                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{conversation.jobDescription}</p>
                            </div>
                        )}
                    </div>

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

                            return (
                                <React.Fragment key={message.id}>
                                    {showDate && msgDate && (
                                        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#999', margin: '16px 0', textTransform: 'uppercase' }}>
                                            {msgDate.toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), { day: 'numeric', month: 'long' })}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: message.isOwn ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-start', marginBottom: message.isOwn ? '4px' : '8px' }}>
                                        {!message.isOwn && (
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFC244', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: '14px', flexShrink: 0 }}>
                                                <img src="/Images/Logos/Lbricol_icon_black.png" style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
                                            </div>
                                        )}
                                        <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                style={{
                                                    backgroundColor: message.isOwn ? '#00A082' : '#FFFFFF',
                                                    color: message.isOwn ? '#FFFFFF' : '#000000',
                                                    padding: '12px 18px',
                                                    borderRadius: message.isOwn ? '22px 22px 4px 22px' : '22px 22px 22px 4px',
                                                    fontSize: '16px',
                                                    lineHeight: '1.4',
                                                    fontWeight: 500,
                                                    boxShadow: message.isOwn ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
                                                    border: message.isOwn ? 'none' : '1px solid #F0F0F0'
                                                }}
                                            >
                                                {message.text}
                                            </motion.div>
                                            <div style={{ fontSize: '11px', color: '#999', textAlign: message.isOwn ? 'right' : 'left', fontWeight: 600, padding: '0 4px' }}>
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

                {/* Message Input Area — Matching Screenshot */}
                <div
                    style={{
                        padding: '12px 20px',
                        borderTop: '1px solid #F0F0F0',
                        backgroundColor: '#FFFFFF',
                        paddingBottom: isModal ? '16px' : 'max(85px, calc(85px + env(safe-area-inset-bottom)))',
                        flexShrink: 0
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00A082' }}>
                            <Camera size={26} />
                        </button>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            border: '1.5px solid #00A082',
                        }}>
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={t({ en: 'Write a message...', fr: 'Écrire un message...' })}
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
                        <button
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim()}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                                color: messageInput.trim() ? '#00A082' : '#999',
                                transition: 'all 0.2s',
                                transform: messageInput.trim() ? 'scale(1.1)' : 'scale(1)',
                            }}
                        >
                            <Send size={26} fill={messageInput.trim() ? '#00A08220' : 'none'} />
                        </button>
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: c.surface, borderRadius: '14px', padding: '12px 16px', border: `1px solid ${c.border}`, width: '100%', maxWidth: '500px', margin: '0 auto' }}>
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
                                border: activeFilter === filter.id ? '1.5px solid #000' : `1.5px solid ${c.border}`,
                                backgroundColor: activeFilter === filter.id ? '#000' : 'transparent',
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
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: isModal ? '16px' : '90px' }}>
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
                                    borderRadius: '16px',
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
                                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#007AFF', backgroundColor: '#007AFF10', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
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
