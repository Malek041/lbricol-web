"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { MapPin, Search, Shield, User as UserIcon, Star, Phone, Plus, Edit2, EyeOff, Eye, Trash2, Calendar, Save, Check } from 'lucide-react';
import OnboardingPopup from '@/features/onboarding/components/OnboardingPopup';
import AvailabilityCalendarView from '@/features/calendar/components/AvailabilityCalendarView';
import { cn } from '@/lib/utils';

interface AdminBricolersViewProps {
  t: (vals: { en: string; fr: string; ar?: string }) => string;
}

const AdminBricolersView: React.FC<AdminBricolersViewProps> = ({ t }) => {
  const [selectedBricolerForSchedule, setSelectedBricolerForSchedule] = useState<any | null>(null);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);

  const [bricolers, setBricolers] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [editingBricoler, setEditingBricoler] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'receivables'>('list');

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this Bricoler?')) {
      await deleteDoc(doc(db, 'bricolers', id));
    }
  };

  const toggleStatus = async (b: any, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'bricolers', b.id), { isActive: !b.isActive });
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bricolers'), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setBricolers(list);
    });
    return () => unsub();
  }, []);

  const cities = useMemo(() => {
    const set = new Set<string>();
    bricolers.forEach((b) => {
      if (b.city) set.add(b.city);
    });
    return ['all', ...Array.from(set)];
  }, [bricolers]);

  const filtered = useMemo(() => {
    return bricolers.filter((b) => {
      if (selectedCity !== 'all' && b.city !== selectedCity) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        (b.name || '').toLowerCase().includes(q) ||
        (b.phone || '').toLowerCase().includes(q) ||
        (Array.isArray(b.services) ? b.services.join(' ') : '').toLowerCase().includes(q)
      );
    });
  }, [bricolers, selectedCity, searchQuery]);

  const receivables = useMemo(() => {
    return bricolers
      .filter((b) => (b.totalEarnings || 0) > 0)
      .map((b) => ({
        ...b,
        owed: Math.round((b.totalEarnings || 0) * 0.15)
      }))
      .sort((a, b) => {
        if (a.commissionPaid === b.commissionPaid) return b.owed - a.owed;
        return a.commissionPaid ? 1 : -1;
      });
  }, [bricolers]);

  const handleMarkAsPaid = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'bricolers', id), {
      commissionPaid: !currentStatus,
      commissionPaidAt: !currentStatus ? new Date().toISOString() : null
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl pt-12 pb-4 px-5 border-b border-neutral-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-black">
              {t({ en: 'Bricolers', fr: 'Bricoleurs', ar: 'المحترفون' })}
            </h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-neutral-100 p-1 rounded-2xl mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              "flex-1 py-2 text-xs font-black rounded-xl transition-all",
              activeTab === 'list' ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            {t({ en: 'Bricolers', fr: 'Bricoleurs' })}
          </button>
          <button
            onClick={() => setActiveTab('receivables')}
            className={cn(
              "flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'receivables' ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            {t({ en: 'Receivables', fr: 'À encaisser' })}
            {receivables.filter(r => !r.commissionPaid).length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">
                {receivables.filter(r => !r.commissionPaid).length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'list' && (
          <>
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCity === city
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    }`}
                >
                  {city === 'all' ? t({ en: 'All Cities', fr: 'Toutes les villes' }) : city}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t({ en: 'Search phone, services…', fr: 'Rechercher téléphone, services…' })}
                className="w-full h-11 bg-neutral-100 rounded-2xl pl-10 pr-4 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-black transition-all outline-none"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {activeTab === 'list' ? (
          filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-neutral-50 mx-auto mb-4 flex items-center justify-center">
                <UserIcon size={28} className="text-neutral-300" />
              </div>
              <p className="text-neutral-400 text-sm font-medium">
                {t({ en: 'No bricolers found.', fr: 'Aucun bricoleur trouvé.' })}
              </p>
            </div>
          ) : (
            filtered.map((b) => (
              <BricolerCard
                key={b.id}
                b={b}
                t={t}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                toggleStatus={toggleStatus}
                handleDelete={handleDelete}
                onEdit={() => { setEditingBricoler(b); setShowPopup(true); }}
                onSchedule={() => { setSelectedBricolerForSchedule(b); setIsAvailabilityOpen(true); }}
              />
            ))
          )
        ) : (
          receivables.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-neutral-50 mx-auto mb-4 flex items-center justify-center">
                <Shield size={28} className="text-neutral-300" />
              </div>
              <p className="text-neutral-400 text-sm font-medium">
                {t({ en: 'No pending receivables.', fr: 'Aucun encaissement en attente.' })}
              </p>
            </div>
          ) : (
            receivables.map((b) => (
              <ReceivableCard key={b.id} b={b} t={t} onMarkAsPaid={handleMarkAsPaid} />
            ))
          )
        )}
      </div>

      <button
        onClick={() => { setEditingBricoler(null); setShowPopup(true); }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus size={24} strokeWidth={3} />
      </button>

      <OnboardingPopup
        isOpen={showPopup}
        onClose={() => { setShowPopup(false); setEditingBricoler(null); }}
        mode={editingBricoler ? 'admin_edit' : 'admin_add'}
        userData={editingBricoler || undefined}
        onComplete={() => { }}
      />

      {isAvailabilityOpen && selectedBricolerForSchedule && (
        <AvailabilityCalendarView
          bricolerId={selectedBricolerForSchedule.id}
          bricolerName={selectedBricolerForSchedule.fullName}
          onClose={() => setIsAvailabilityOpen(false)}
        />
      )}
    </div>
  );
};

const BricolerCard = ({ b, t, expandedId, setExpandedId, toggleStatus, handleDelete, onEdit, onSchedule }: any) => {
  const isClaimed = !!b.uid;
  const rating = typeof b.rating === 'number' ? b.rating : 5.0;
  const jobs = b.numReviews || b.completedJobs || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
      className={cn(
        "bg-white rounded-[24px] p-5 border border-neutral-100 shadow-sm flex flex-col gap-3 cursor-pointer transition-all",
        !b.isActive && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center overflow-hidden">
          {b.photoURL || b.avatar ? (
            <img src={b.photoURL || b.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={20} className="text-neutral-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-black text-neutral-900">{b.name || 'Bricoler'}</h2>
              <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-0.5">
                <MapPin size={11} />
                <span>{b.city || 'Unknown'}</span>
                {!b.isActive && <span className="text-red-500 font-bold ml-2">(Unlisted)</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1",
                isClaimed ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-600"
              )}>
                <Shield size={11} />
                {isClaimed ? 'Claimed' : 'Shadow'}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-neutral-600">
                <Star size={11} className="text-[#FFC244] fill-[#FFC244]" />
                <span className="font-bold">{rating.toFixed(1)}</span>
                <span className="text-neutral-400">({jobs} jobs)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isClaimed && b.claimCode && expandedId !== b.id && (
        <div className="pt-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mr-2">CODE:</span>
          <span className="text-[14px] font-mono font-bold text-[#00A082]">{b.claimCode}</span>
        </div>
      )}

      <AnimatePresence>
        {expandedId === b.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-2 border-t border-neutral-50 space-y-3">
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <Phone size={12} />
                <span>{b.phone || b.whatsappNumber || 'No phone'}</span>
              </div>
              {!isClaimed && b.claimCode && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Activation Code</span>
                    <span className="text-[15px] font-mono font-bold text-[#00A082]">{b.claimCode}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(b.claimCode); }} className="w-8 h-8 rounded-full bg-white border border-neutral-100 flex items-center justify-center text-neutral-400 hover:text-black transition-colors"><Save size={14} /></button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <ActionBtn icon={<Edit2 size={16} />} label="Edit" onClick={onEdit} />
                <ActionBtn icon={<Calendar size={16} />} label="Dispo" onClick={onSchedule} />
                <ActionBtn icon={b.isActive ? <EyeOff size={16} /> : <Eye size={16} />} label={b.isActive ? 'Unlist' : 'List'} onClick={(e: any) => toggleStatus(b, e)} />
                <ActionBtn icon={<Trash2 size={16} />} label="Delete" onClick={(e: any) => handleDelete(b.id, e)} danger />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ActionBtn = ({ icon, label, onClick, danger }: any) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    className={cn(
      "flex-1 py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors",
      danger ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
    )}
  >
    {icon}
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

const ReceivableCard = ({ b, t, onMarkAsPaid }: any) => (
  <div className={cn("bg-white rounded-[24px] p-5 border border-neutral-100 shadow-sm flex flex-col gap-4", b.commissionPaid && "opacity-60 bg-neutral-50")}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center overflow-hidden">
          {b.photoURL || b.avatar ? <img src={b.photoURL || b.avatar} alt="Profile" className="w-full h-full object-cover" /> : <UserIcon size={24} className="text-neutral-500" />}
        </div>
        <div>
          <h3 className="font-black text-black">{b.name}</h3>
          <p className="text-xs text-neutral-500">{b.city} • {b.phone}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Dû Net</p>
        <p className="text-xl font-black text-black">{b.owed} MAD</p>
      </div>
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
      <div className="flex flex-col">
        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Gains Bruts</p>
        <p className="text-xs font-bold text-neutral-600">{Math.round(b.totalEarnings || 0)} MAD</p>
      </div>
      <button
        onClick={(e) => onMarkAsPaid(b.id, b.commissionPaid, e)}
        className={cn("h-10 px-5 rounded-xl text-xs font-black transition-all flex items-center gap-2", b.commissionPaid ? "bg-green-50 text-green-600" : "bg-black text-white shadow-lg shadow-black/5")}
      >
        {b.commissionPaid ? <><Check size={14} strokeWidth={3} /> Payé</> : 'Marquer comme payé'}
      </button>
    </div>
  </div>
);

export default AdminBricolersView;
