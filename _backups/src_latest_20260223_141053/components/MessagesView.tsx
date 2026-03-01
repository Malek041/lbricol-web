"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings, ChevronLeft, Send, Clock, MapPin, Calendar, Heart, MessageSquare } from 'lucide-react';
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
import { OrderDetails } from './OrderCard';

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
    jobLocation?: string;
    status: string;
    isUnread: boolean;
}

interface MessagesViewProps {
    orders: OrderDetails[];
    currentUser: any;
    initialSelectedJobId?: string | null;
    isModal?: boolean;
}

const MessagesView: React.FC<MessagesViewProps> = ({ orders, currentUser, initialSelectedJobId, isModal }) => {
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
                        jobLocation: order.city || order.location,
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
                    isOwn: data.senderId === currentUser.uid
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
            await addDoc(collection(db, 'jobs', selectedJobId, 'messages'), {
                senderId: currentUser.uid,
                senderName: currentUser.displayName || 'You',
                text: text,
                timestamp: serverTimestamp()
            });
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: c.bg }}>
                {/* Chat Header */}
                <div style={{ backgroundColor: c.bg, flexShrink: 0 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px',
                            borderBottom: `1px solid ${c.border}`,
                            backgroundColor: c.bg,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                onClick={() => setSelectedJobId(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <ChevronLeft size={24} color={c.text} />
                            </button>
                            <div
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '14px',
                                    backgroundColor: c.surface,
                                    overflow: 'hidden',
                                    border: `1.5px solid ${c.border}`
                                }}
                            >
                                {conversation?.participantAvatar ? (
                                    <img
                                        src={conversation.participantAvatar}
                                        alt={conversation.participantName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: c.textMuted }}>
                                        {conversation?.participantName[0]}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '17px', fontWeight: 900, color: c.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {conversation?.participantName}
                                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#06C167' }} />
                                </div>
                                <div style={{ fontSize: '12px', color: c.textMuted, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {conversation?.jobTitle} {conversation?.jobSubService && `· ${conversation.jobSubService}`}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Job Context Mini-Bar */}
                    <div style={{ padding: '8px 16px', backgroundColor: c.surface, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontWeight: 700, color: c.textMuted }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} /> {conversation?.jobDates?.split(' at ')[0]}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={14} /> {conversation?.jobLocation}
                        </div>
                        <div style={{ marginLeft: 'auto', color: '#007AFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {conversation?.status}
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        backgroundImage: theme === 'light'
                            ? 'radial-gradient(#F0F0F0 1px, transparent 1px)'
                            : 'radial-gradient(#1A1A1A 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                >
                    {activeMessages.length === 0 && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: c.textMuted, gap: '12px' }}>
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
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            color: c.textMuted,
                                            margin: '12px 0',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                    >
                                        {msgDate.toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), {
                                            day: 'numeric',
                                            month: 'long'
                                        })}
                                    </div>
                                )}
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: message.isOwn ? 'row-reverse' : 'row',
                                        gap: '10px',
                                        alignItems: 'flex-end',
                                    }}
                                >
                                    <div
                                        style={{
                                            maxWidth: '80%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                        }}
                                    >
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            style={{
                                                backgroundColor: message.isOwn ? '#000000' : '#FFFFFF',
                                                color: message.isOwn ? '#FFFFFF' : '#000000',
                                                padding: '12px 16px',
                                                borderRadius: message.isOwn ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                                fontSize: '15px',
                                                lineHeight: '1.5',
                                                whiteSpace: 'pre-wrap',
                                                fontWeight: 500,
                                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                                border: message.isOwn ? 'none' : `1px solid ${c.border}`
                                            }}
                                        >
                                            {message.text}
                                        </motion.div>
                                        <div style={{ fontSize: '10px', color: c.textMuted, textAlign: message.isOwn ? 'right' : 'left', fontWeight: 700 }}>
                                            {msgDate ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input Area */}
                <div
                    style={{
                        padding: '16px',
                        borderTop: `1px solid ${c.border}`,
                        backgroundColor: c.bg,
                        paddingBottom: isModal ? '16px' : 'max(85px, calc(85px + env(safe-area-inset-bottom)))',
                        flexShrink: 0
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: c.surface,
                        borderRadius: '28px',
                        padding: '6px 6px 6px 16px',
                        border: `1.5px solid ${c.border}`,
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={t({ en: 'Type a message...', fr: 'Tapez un message...' })}
                            style={{
                                flex: 1,
                                background: 'none',
                                border: 'none',
                                color: c.text,
                                fontSize: '15px',
                                outline: 'none',
                                padding: '8px 0',
                                fontWeight: 600
                            }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim()}
                            style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                backgroundColor: messageInput.trim() ? '#000' : 'transparent',
                                border: 'none',
                                cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                transform: messageInput.trim() ? 'scale(1)' : 'scale(0.9)',
                            }}
                        >
                            <Send size={20} color={messageInput.trim() ? '#FFF' : c.textMuted} />
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
