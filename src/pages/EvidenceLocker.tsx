import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Clock,
  Trash2,
  X,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEvidence } from '../hooks/useEvidence';
import { useI18n } from '../lib/i18n';
import { extractText } from '../lib/ocr';
import { classifyTransaction } from '../lib/classifier';
import { parseWithGemini } from '../lib/geminiParser';
import { uploadEvidenceImage } from '../lib/storage';
import { EvidenceCard } from '../components/EvidenceCard';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import type {
  TransactionCategory,
  Direction,
  ProvenanceLabel,
  EvidenceRecord,
} from '../types/database';

export const EvidenceLocker: React.FC = () => {
  const { user } = useAuth();
  const { evidence, loading, pendingSyncCount, addEvidence, deleteEvidence } = useEvidence();
  const { t } = useI18n();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'ocr' | 'manual'>('ocr');
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrStep, setOcrStep] = useState<'reading' | 'classifying' | 'done' | 'idle'>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [direction, setDirection] = useState<Direction>('in');
  const [category, setCategory] = useState<TransactionCategory>('wages');
  const [provenanceLabel, setProvenanceLabel] = useState<ProvenanceLabel>('declared');
  const [rawText, setRawText] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const categories: TransactionCategory[] = [
    'crop_sale',
    'shop_sale',
    'transport_income',
    'wages',
    'remittance',
    'groceries',
    'rent',
    'medical',
    'education',
    'loan_repayment',
    'utility',
    'other',
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setShowModal(true);
    setModalMode('ocr');
    setOcrProcessing(true);
    setOcrStep('reading');

    try {
      // Step 1: Client-side OCR via Tesseract.js
      const extracted = await extractText(file);
      setRawText(extracted);
      setOcrStep('classifying');

      // Step 2: Gemini structuring (Edge -> direct -> rule-based fallback)
      let result = await parseWithGemini(extracted);
      if (!result || !result.amount) {
        result = classifyTransaction(extracted);
      }
      setDate(result.date);
      setAmount(result.amount || '');
      setDirection(result.direction);
      setCategory(result.category);
      setProvenanceLabel(result.provenance_label);
      setConfidence(result.confidence);
      setOcrStep('done');
    } catch (err) {
      console.error('OCR Error:', err);
      setOcrStep('idle');
    } finally {
      setOcrProcessing(false);
    }
  };

  const openManualModal = () => {
    setImagePreview(null);
    setPendingImageFile(null);
    setRawText('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setDirection('in');
    setCategory('wages');
    setProvenanceLabel('declared');
    setConfidence(0);
    setModalMode('manual');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !user) return;

    // Upload original image to Supabase Storage if present
    let imageUrl: string | null = null;
    if (pendingImageFile && modalMode === 'ocr') {
      imageUrl = await uploadEvidenceImage(pendingImageFile, user.id);
      // Fallback to local preview data URL if storage not configured
      if (!imageUrl && imagePreview) imageUrl = imagePreview;
    }

    await addEvidence({
      user_id: user.id,
      type: modalMode === 'ocr' ? 'image' : 'manual',
      raw_text: rawText || null,
      amount: Number(amount),
      direction,
      category,
      provenance_label: provenanceLabel,
      date,
      image_url: imageUrl,
      parsed_meta: { confidence, gemini: confidence >= 0.7 },
    });

    setPendingImageFile(null);
    setShowModal(false);
  };

  // Quick preset sample receipt for instant desktop demo testing
  const handleLoadSampleUPI = () => {
    const sampleText = 'PhonePe: Paid ₹18,500 to Lakshmi Devi from Kisan Mandi for Cotton Harvest. UPI Ref: 449102839102. Date: 12/08/2026';
    setRawText(sampleText);
    const result = classifyTransaction(sampleText);
    setDate(result.date);
    setAmount(result.amount);
    setDirection(result.direction);
    setCategory(result.category);
    setProvenanceLabel(result.provenance_label);
    setConfidence(result.confidence);
    setModalMode('ocr');
    setShowModal(true);
    setOcrStep('done');
  };

  return (
    <div className="page-container space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t('evidence.title')}</h1>
          <p className="text-xs text-slate-400">{t('evidence.subtitle')}</p>
        </div>

        {pendingSyncCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
            <Clock size={12} />
            <span>{pendingSyncCount} queued</span>
          </div>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary flex-col !py-4 gap-1.5 text-center shadow-lg shadow-amber-500/20"
        >
          <Camera size={22} />
          <span className="text-xs font-bold">{t('evidence.upload')}</span>
        </button>

        <button
          type="button"
          onClick={openManualModal}
          className="btn-secondary flex-col !py-4 gap-1.5 text-center"
        >
          <Plus size={22} className="text-amber-400" />
          <span className="text-xs font-bold">{t('evidence.manual')}</span>
        </button>
      </div>

      {/* Quick Demo Receipt Scanner Link */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleLoadSampleUPI}
          className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
        >
          ⚡ Try demo UPI Receipt scanner sample
        </button>
      </div>

      {/* Evidence List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
          <span>{t('passport.source_evidence')}</span>
          <span>{evidence.length} {t('evidence.count')}</span>
        </div>

        {evidence.length === 0 ? (
          <div className="glass-card text-center py-10 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Camera size={24} />
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {t('evidence.empty')}
            </p>
          </div>
        ) : (
          evidence.map((rec) => (
            <EvidenceCard
              key={rec.id}
              record={rec}
              onDelete={deleteEvidence}
              showRawText={true}
            />
          ))
        )}
      </div>

      {/* Entry Modal (OCR confirmation or Manual entry) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto p-5 border-amber-500/30 space-y-4 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                {modalMode === 'ocr' ? (
                  <>
                    <FileCheck size={18} className="text-emerald-400" />
                    <span>{t('evidence.confirm')}</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} className="text-amber-400" />
                    <span>{t('evidence.manual')}</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* OCR Processing State */}
            {ocrProcessing && (
              <div className="py-8 text-center space-y-3">
                <div className="spinner mx-auto" />
                <p className="text-sm font-semibold text-amber-400">
                  {ocrStep === 'reading' ? t('evidence.ocr') : t('evidence.classifying')}
                </p>
              </div>
            )}

            {!ocrProcessing && (
              <form onSubmit={handleSave} className="space-y-4">
                {/* Image & OCR preview snippet */}
                {rawText && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 font-mono break-words max-h-24 overflow-y-auto">
                    <span className="text-[10px] font-bold text-emerald-400 block uppercase mb-0.5">
                      Extracted Text:
                    </span>
                    {rawText}
                  </div>
                )}

                {/* Amount & Direction */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    {t('evidence.amount')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 15000"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value) || '')}
                      className="input-field !pl-8 text-lg font-bold"
                    />
                  </div>
                </div>

                {/* Direction Toggle (Money In vs Money Out) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    {t('evidence.direction')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('in')}
                      className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        direction === 'in'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                          : 'bg-slate-800/80 border-white/10 text-slate-400'
                      }`}
                    >
                      <ArrowDownLeft size={16} />
                      <span>{t('evidence.direction.in')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDirection('out')}
                      className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        direction === 'out'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md'
                          : 'bg-slate-800/80 border-white/10 text-slate-400'
                      }`}
                    >
                      <ArrowUpRight size={16} />
                      <span>{t('evidence.direction.out')}</span>
                    </button>
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    {t('evidence.category')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                    className="select-field text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {t(`category.${cat}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    {t('evidence.date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>

                {/* Provenance Tag Display */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-white/5">
                  <span className="text-xs text-slate-400">Assigned Provenance:</span>
                  <ProvenanceBadge label={provenanceLabel} size="md" />
                </div>

                {/* Submit Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    {t('evidence.cancel')}
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {t('evidence.save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
