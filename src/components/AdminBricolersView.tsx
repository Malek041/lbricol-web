"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { MapPin, Search, Shield, User as UserIcon, Star, Phone, Plus, Edit2, EyeOff, Eye, Trash2, Calendar } from 'lucide-react';
import OnboardingPopup from '@/components/OnboardingPopup';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface AdminBricolersViewProps {
  t: (vals: { en: string; fr: string; ar?: string }) => string;
}

const AdminBricolersView: React.FC<AdminBricolersViewProps> = ({ t }) => {
  const [bricolers, setBricolers] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [editingBricoler, setEditingBricoler] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        (b.services || []).join(' ').toLowerCase().includes(q)
      );
    });
  }, [bricolers, selectedCity, searchQuery]);

  return (
    <div className="flex flex-col h-[100dvh] bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl pt-12 pb-4 px-5 border-b border-neutral-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-black">
              {t({ en: 'Bricolers', fr: 'Bricoleurs', ar: 'المحترفون' })}
            </h1>
            <p className="text-neutral-500 text-sm font-medium">
              {t({
                en: 'Shadow profiles and claimed accounts by city.',
                fr: 'Profils pré-créés et comptes revendiqués par ville.',
              })}
            </p>
          </div>
        </div>

        {/* City filter */}
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

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t({
              en: 'Search bricolers, phone, services…',
              fr: 'Rechercher bricoleurs, téléphone, services…',
            })}
            className="w-full h-11 bg-neutral-100 rounded-2xl pl-10 pr-4 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-black transition-all outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-neutral-50 mx-auto mb-4 flex items-center justify-center">
              <UserIcon size={28} className="text-neutral-300" />
            </div>
            <p className="text-neutral-400 text-sm font-medium">
              {t({ en: 'No bricolers yet in this view.', fr: 'Aucun bricoleur pour le moment.' })}
            </p>
          </div>
        ) : (
          filtered.map((b) => {
            const isClaimed = !!b.uid;
            const rating = typeof b.rating === 'number' ? b.rating : 5.0;
            const jobs = b.numReviews || b.completedJobs || 0;
            const label = isClaimed
              ? t({ en: 'Claimed account', fr: 'Compte revendiqué' })
              : t({ en: 'Shadow profile', fr: 'Profil provisoire' });

            return (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                className={`bg-white rounded-[24px] p-5 border border-neutral-100 shadow-sm flex flex-col gap-3 cursor-pointer transition-all ${!b.isActive ? 'opacity-50' : ''}`}
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
                        <h2 className="text-[16px] font-black text-neutral-900">
                          {b.name || 'Bricoler'}
                        </h2>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-0.5">
                          <MapPin size={11} />
                          <span>{b.city || t({ en: 'Unknown city', fr: 'Ville inconnue' })}</span>
                          {!b.isActive && (
                            <span className="text-red-500 font-bold ml-2">({t({ en: 'Unlisted', fr: 'Non listé' })})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${isClaimed
                            ? 'bg-green-50 text-green-700'
                            : 'bg-neutral-100 text-neutral-600'
                            }`}
                        >
                          <Shield size={11} />
                          {label}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-600">
                          <Star size={11} className="text-[#FFC244] fill-[#FFC244]" />
                          <span className="font-bold">{rating.toFixed(1)}</span>
                          <span className="text-neutral-400">
                            ({jobs} {t({ en: 'jobs', fr: 'jobs' })})
                          </span>
                        </div>
                      </div>
                    </div>

                    {b.services && b.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {b.services.slice(0, 4).map((s: any) => (
                          <span
                            key={s.subServiceId || s}
                            className="px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-200 text-[10px] font-bold text-neutral-600"
                          >
                            {s.subServiceName || s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <Phone size={12} />
                    <span>{b.phone || b.whatsappNumber || t({ en: 'No phone set', fr: 'Téléphone manquant' })}</span>
                  </div>
                  {!isClaimed && b.claimCode && (
                    <div className="text-[11px] font-mono text-neutral-500">
                      <span className="font-bold text-neutral-800 mr-1">CODE</span>
                      {b.claimCode}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {expandedId === b.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 pt-3 mt-2 border-t border-neutral-50">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingBricoler(b); setShowPopup(true); }}
                          className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex flex-col items-center justify-center gap-1 text-neutral-700 transition-colors"
                        >
                          <Edit2 size={16} />
                          <span className="text-[10px] font-bold">{t({ en: 'Edit', fr: 'Modifier' })}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); /* TODO schedule */ alert('Schedule feature pending implementation.'); }}
                          className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex flex-col items-center justify-center gap-1 text-neutral-700 transition-colors"
                        >
                          <Calendar size={16} />
                          <span className="text-[10px] font-bold">{t({ en: 'Schedule', fr: 'Dispo' })}</span>
                        </button>
                        <button
                          onClick={(e) => toggleStatus(b, e)}
                          className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex flex-col items-center justify-center gap-1 text-neutral-700 transition-colors"
                        >
                          {b.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                          <span className="text-[10px] font-bold">{b.isActive ? t({ en: 'Unlist', fr: 'Masquer' }) : t({ en: 'List', fr: 'Afficher' })}</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(b.id, e)}
                          className="flex-1 py-2 bg-red-50 hover:bg-red-100 rounded-xl flex flex-col items-center justify-center gap-1 text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                          <span className="text-[10px] font-bold">{t({ en: 'Delete', fr: 'Supprimer' })}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Floating Create Button */}
      <button
        onClick={() => { setEditingBricoler(null); setShowPopup(true); }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus size={24} strokeWidth={3} />
      </button>

      {/* Onboarding Popup for Creation/Editing */}
      <OnboardingPopup
        isOpen={showPopup}
        onClose={() => { setShowPopup(false); setEditingBricoler(null); }}
        mode={editingBricoler ? 'admin_edit' : 'admin_add'}
        userData={editingBricoler || undefined}
        onComplete={() => { /* data updates reactively from firestore */ }}
      />
    </div>
  );
};

export default AdminBricolersView;

