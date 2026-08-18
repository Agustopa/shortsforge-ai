import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Film,
  Music,
  UploadCloud,
  Trash2,
  ExternalLink,
  Sparkles,
  Check
} from 'lucide-react';
import { MediaAsset } from '../types/index';

interface MediaLibraryViewProps {
  assets: MediaAsset[];
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({
  assets,
  onUpload,
  onDelete
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'video' | 'image' | 'music'>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const filtered = assets.filter(a => {
    if (activeFilter === 'all') return true;
    return a.type === activeFilter;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Asset Vault</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
            Media Library
          </h2>
          <p className="text-slate-400 text-sm">
            Curated 4K stock video footage, AI-generated visuals, user uploads, and background audio tracks.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/40 flex items-center gap-2 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Custom Media</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {(['all', 'video', 'image', 'music'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeFilter === tab
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab === 'all' ? 'All Assets' : `${tab}s`}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(asset => (
          <div
            key={asset.id}
            className="group rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between shadow-md"
          >
            <div className="relative aspect-[9/14] bg-slate-950 overflow-hidden flex items-center justify-center">
              {asset.type === 'image' ? (
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              ) : asset.type === 'video' ? (
                <div className="w-full h-full relative">
                  <img
                    src={asset.thumbnailUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80'}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                    <Film className="w-8 h-8 text-white/80" />
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <Music className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <span className="text-[11px] text-slate-400">Audio Track</span>
                </div>
              )}

              {/* Source badge */}
              <div className="absolute top-2 left-2">
                <span className="px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-[9px] font-bold text-slate-300 uppercase">
                  {asset.source}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 truncate pr-2" title={asset.name}>
                {asset.name}
              </span>
              {asset.source === 'user' && (
                <button
                  onClick={() => onDelete(asset.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
