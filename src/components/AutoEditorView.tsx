import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wand2,
  UploadCloud,
  FileVideo,
  Image as ImageIcon,
  Sparkles,
  Play,
  Pause,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Music,
  Type,
  Layers,
  Scissors,
  Eye,
  Sliders,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  FileText,
  Volume2,
  Film,
  Maximize2,
  Loader2
} from 'lucide-react';
import {
  AutoEditorProject,
  AutoEditorStyle,
  VideoDuration,
  MusicCategory,
  SubtitlePreset,
  UploadedMediaItem,
  AutoEditorCut
} from '../types/index';
import { safeFetchJson } from '../utils/apiClient';

interface AutoEditorViewProps {
  onOpenProject?: (projectId: string) => void;
}

export const AutoEditorView: React.FC<AutoEditorViewProps> = () => {
  // State for Upload and Configuration
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ name: string; size: string; type: string; url: string }[]>([]);
  const [style, setStyle] = useState<AutoEditorStyle>('Professional');
  const [targetDuration, setTargetDuration] = useState<VideoDuration>('AUTO');
  const [autoCta, setAutoCta] = useState<boolean>(true);
  const [musicCategory, setMusicCategory] = useState<MusicCategory>('General');
  const [subtitlePreset, setSubtitlePreset] = useState<SubtitlePreset>('Viral');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Active Project State
  const [activeProject, setActiveProject] = useState<AutoEditorProject | null>(null);
  const [projectsList, setProjectsList] = useState<AutoEditorProject[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'result' | 'history'>('create');
  
  // Video Player Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Copy Feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit Result Mode
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');

  // Fetch History of Auto Editor Projects
  const fetchProjects = useCallback(async () => {
    const data = await safeFetchJson<{ success: boolean; projects?: AutoEditorProject[] }>('/api/v1/auto-editor/projects');
    if (data?.success && data.projects) {
      setProjectsList(data.projects);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Polling for active project processing
  useEffect(() => {
    if (!activeProject || ['COMPLETED', 'FAILED', 'CANCELLED'].includes(activeProject.status)) {
      return;
    }

    const interval = setInterval(async () => {
      const data = await safeFetchJson<{ success: boolean; project?: AutoEditorProject }>(`/api/v1/auto-editor/projects/${activeProject.id}`);
      if (data?.success && data.project) {
        setActiveProject(data.project);
        if (data.project.status === 'COMPLETED') {
          setActiveTab('result');
          setEditedTitle(data.project.videoTitle || data.project.title);
          fetchProjects();
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeProject, fetchProjects]);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      setSelectedFiles(files);

      const previews = files.map((file: File) => ({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type.startsWith('video') ? 'Video' : 'Image',
        url: URL.createObjectURL(file)
      }));
      setFilePreviews(previews);
      setUploadError(null);
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: File[] = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);

      const previews = files.map((file: File) => ({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type.startsWith('video') ? 'Video' : 'Image',
        url: URL.createObjectURL(file)
      }));
      setFilePreviews(previews);
      setUploadError(null);
    }
  };

  // Helper to upload single file in safe 2.5MB chunks (bypasses any proxy size limits)
  const uploadSingleFileChunked = async (file: File, fileIndex: number, totalFiles: number): Promise<UploadedMediaItem> => {
    const CHUNK_SIZE = 2.5 * 1024 * 1024; // 2.5MB safe chunk size
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const uploadId = `up_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const start = chunkIdx * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);

      const pct = Math.round(((chunkIdx + 1) / totalChunks) * 100);
      setUploadProgressText(`Uploading ${file.name} (${fileIndex + 1}/${totalFiles}) — ${pct}%`);

      const chunkForm = new FormData();
      chunkForm.append('chunk', chunkBlob, `${file.name}.part${chunkIdx}`);
      chunkForm.append('uploadId', uploadId);
      chunkForm.append('chunkIndex', chunkIdx.toString());
      chunkForm.append('totalChunks', totalChunks.toString());
      chunkForm.append('fileName', file.name);

      const res = await fetch('/api/v1/auto-editor/upload-chunk', {
        method: 'POST',
        body: chunkForm
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
      } else {
        const text = await res.text().catch(() => '');
        throw new Error(`Upload returned HTTP ${res.status}: ${text.slice(0, 100)}`);
      }

      if (!res.ok || !data || !data.success) {
        throw new Error(data?.error || `Error uploading file chunk (HTTP ${res.status})`);
      }

      if (data.isComplete && data.mediaItem) {
        return data.mediaItem as UploadedMediaItem;
      }
    }

    throw new Error(`Failed to complete upload for ${file.name}`);
  };

  // Execute Auto Edit Process
  const handleStartAutoEdit = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one video or image file to auto edit.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgressText('Preparing media upload...');

    try {
      // 1. Upload files in chunks
      const uploadedMediaItems: UploadedMediaItem[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const item = await uploadSingleFileChunked(selectedFiles[i], i, selectedFiles.length);
        uploadedMediaItems.push(item);
      }

      setUploadProgressText('Initializing AI Auto Editor project...');

      // 2. Create Project with uploaded media
      const projectRes = await fetch('/api/v1/auto-editor/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaItems: uploadedMediaItems,
          style,
          duration: targetDuration,
          autoCta
        })
      });

      let projectData: any = null;
      const projContentType = projectRes.headers.get('content-type') || '';
      if (projContentType.includes('application/json')) {
        projectData = await projectRes.json().catch(() => null);
      } else {
        const text = await projectRes.text().catch(() => '');
        throw new Error(`Server returned HTTP ${projectRes.status}: ${text.slice(0, 100)}`);
      }

      if (!projectRes.ok || !projectData || !projectData.success || !projectData.project) {
        throw new Error(projectData?.error || `Failed to initialize project (HTTP ${projectRes.status})`);
      }

      const proj: AutoEditorProject = projectData.project;
      setActiveProject(proj);
      setActiveTab('create'); // Keep on main view to see progress

      setUploadProgressText('Starting AI Auto Edit Pipeline...');

      // 3. Trigger Auto-Edit Job
      const processRes = await fetch('/api/v1/auto-editor/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: proj.id,
          jobId: proj.jobId,
          style,
          duration: targetDuration,
          autoCta,
          musicCategory: musicCategory === 'General' ? undefined : musicCategory,
          subtitlePreset
        })
      });

      let processData: any = null;
      const procContentType = processRes.headers.get('content-type') || '';
      if (procContentType.includes('application/json')) {
        processData = await processRes.json().catch(() => null);
      } else {
        const text = await processRes.text().catch(() => '');
        throw new Error(`Server returned HTTP ${processRes.status}: ${text.slice(0, 100)}`);
      }

      if (!processRes.ok || !processData || !processData.success) {
        throw new Error(processData?.error || `Failed to start auto editing (HTTP ${processRes.status})`);
      }

      setIsUploading(false);
      setUploadProgressText('');
    } catch (err: any) {
      console.error('Auto edit start failed:', err);
      setUploadError(
        err?.name === 'TypeError' && err?.message?.includes('fetch')
          ? 'Network communication error during upload. Check your connection or try with a smaller file or click "Try Sample Footage".'
          : err?.message || 'Error initiating AI Auto Edit'
      );
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Test Auto Edit with pre-configured sample footage
  const handleStartWithSample = async (sampleTopic: string = 'Deep Ocean Secrets') => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const sampleRes = await fetch('/api/v1/auto-editor/create-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleTopic, style })
      });

      let sampleData: any = null;
      const contentType = sampleRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        sampleData = await sampleRes.json();
      } else {
        const text = await sampleRes.text();
        throw new Error(`Server returned HTTP ${sampleRes.status}: ${text.slice(0, 100)}`);
      }

      if (!sampleRes.ok || !sampleData?.success || !sampleData?.project) {
        throw new Error(sampleData?.error || 'Failed to initialize sample project');
      }

      const proj: AutoEditorProject = sampleData.project;
      setActiveProject(proj);
      setActiveTab('create');

      // Trigger Processing
      const processRes = await fetch('/api/v1/auto-editor/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: proj.id,
          jobId: proj.jobId,
          style,
          duration: targetDuration,
          autoCta,
          musicCategory: musicCategory === 'General' ? undefined : musicCategory,
          subtitlePreset
        })
      });

      let processData: any = null;
      const procContentType = processRes.headers.get('content-type') || '';
      if (procContentType.includes('application/json')) {
        processData = await processRes.json().catch(() => null);
      } else {
        const text = await processRes.text().catch(() => '');
        throw new Error(`Server returned HTTP ${processRes.status}: ${text.slice(0, 100)}`);
      }

      if (!processRes.ok || !processData?.success) {
        throw new Error(processData?.error || `Failed to start AI Auto Editing (HTTP ${processRes.status})`);
      }

      setIsUploading(false);
    } catch (err: any) {
      console.error('Sample auto edit error:', err);
      setUploadError(err?.message || 'Failed to start sample auto edit');
      setIsUploading(false);
    }
  };

  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveEdits = async () => {
    if (!activeProject) return;
    try {
      const data = await safeFetchJson<{ success: boolean; project?: AutoEditorProject }>(`/api/v1/auto-editor/projects/${activeProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: editedTitle,
          title: editedTitle
        })
      });
      if (data?.success && data.project) {
        setActiveProject(data.project);
        setIsEditingMode(false);
        fetchProjects();
      }
    } catch (e) {
      console.error('Failed to update project edits:', e);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await safeFetchJson(`/api/v1/auto-editor/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
      if (activeProject?.id === id) {
        setActiveProject(null);
        setActiveTab('create');
      }
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-950 text-slate-100">
      {/* Top Banner Navigation */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 px-8 py-5 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-950/40">
            <Wand2 className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">AI Auto Editor</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Automatic 9:16 Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Upload raw media &rarr; AI analyzes, cuts, reframes 9:16, generates subtitles, ducked music & b-roll.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            id="tab-autoedit-create"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Editor & Upload
          </button>
          {activeProject && (
            <button
              id="tab-autoedit-result"
              onClick={() => setActiveTab('result')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'result'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Current Result
            </button>
          )}
          <button
            id="tab-autoedit-history"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            History ({projectsList.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8 max-w-7xl mx-auto w-full flex-1">
        {/* ============================================================== */}
        {/* TAB 1: CREATE / UPLOAD & PROCESSING VIEW                       */}
        {/* ============================================================== */}
        {activeTab === 'create' && (
          <div className="space-y-8">
            {/* Live Progress Bar if active job is running */}
            {activeProject && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(activeProject.status) && (
              <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-6 shadow-2xl shadow-amber-950/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center animate-spin">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">
                        {activeProject.stageName || 'Processing Video...'}
                      </h3>
                      <p className="text-xs text-amber-300/80 font-mono">
                        Job ID: {activeProject.jobId} &bull; {activeProject.statusMessage}
                      </p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {activeProject.progress}%
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${activeProject.progress}%` }}
                  />
                </div>

                {/* Processing Steps Checklist */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${activeProject.progress >= 20 ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> <span>1. Speech Analysis</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${activeProject.progress >= 40 ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> <span>2. Smart Cut & Hook</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${activeProject.progress >= 60 ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> <span>3. B-Roll & Reframe</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${activeProject.progress >= 85 ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> <span>4. Ducking & 9:16 MP4</span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Box & Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Cols: Media Upload Dropzone */}
              <div className="lg:col-span-2 space-y-6">
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                    selectedFiles.length > 0
                      ? 'border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="video/mp4,video/quicktime,video/webm,video/x-m4v,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-1">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} file(s) selected`
                      : 'Upload Raw Video or Images'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    Drag and drop your raw footage or photos here, or click to browse. Supports MP4, MOV, WEBM, JPG, PNG, WEBP.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      Select From Computer
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartWithSample('Deep Ocean Secrets');
                      }}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Try Sample Footage</span>
                    </button>
                  </div>
                </div>

                {/* Previews of Selected Files */}
                {filePreviews.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Selected Files ({filePreviews.length})
                      </h4>
                      <button
                        onClick={() => {
                          setSelectedFiles([]);
                          setFilePreviews([]);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {filePreviews.map((p, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3 overflow-hidden"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
                            {p.type === 'Video' ? (
                              <FileVideo className="w-5 h-5 text-amber-400" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-indigo-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-200 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-500">{p.size} &bull; {p.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Right Col: AI Configuration & Primary CTA */}
              <div className="space-y-6">
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Auto Edit Strategy</span>
                  </h3>

                  {/* Editing Style */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Editing Style</label>
                    <select
                      id="select-autoedit-style"
                      value={style}
                      onChange={e => setStyle(e.target.value as AutoEditorStyle)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="Professional">Professional (Clean & Balanced)</option>
                      <option value="Viral Shorts">Viral Shorts (Fast Paced & Punchy)</option>
                      <option value="Cinematic">Cinematic (Atmospheric & Smooth)</option>
                      <option value="Clean">Clean (Minimalist)</option>
                      <option value="Educational">Educational (Informative & Clear)</option>
                      <option value="Product Promo">Product Promo (High Conversion)</option>
                      <option value="Storytelling">Storytelling (Narrative Flow)</option>
                      <option value="Funny">Funny (Playful & Humorous)</option>
                      <option value="Fast Paced">Fast Paced (High Energy)</option>
                    </select>
                  </div>

                  {/* Target Duration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Target Duration</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['AUTO', 30, 45, 60, 90] as VideoDuration[]).map(dur => (
                        <button
                          key={dur.toString()}
                          id={`btn-dur-${dur}`}
                          type="button"
                          onClick={() => setTargetDuration(dur)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            targetDuration === dur
                              ? 'bg-amber-500 text-slate-950 shadow-md'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {dur === 'AUTO' ? 'AUTO' : `${dur}s`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtitle Style Preset */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Auto Subtitle Style</label>
                    <select
                      id="select-autoedit-subtitles"
                      value={subtitlePreset}
                      onChange={e => setSubtitlePreset(e.target.value as SubtitlePreset)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="Viral">Viral (Bold with Yellow Keyword Pop)</option>
                      <option value="Bold">Bold (Heavy Impact)</option>
                      <option value="Clean">Clean (Modern Sans)</option>
                      <option value="Karaoke">Karaoke (Word-by-word Flow)</option>
                      <option value="Documentary">Documentary (Classic Subtitle)</option>
                    </select>
                  </div>

                  {/* Music Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Background Music Match</label>
                    <select
                      id="select-autoedit-music"
                      value={musicCategory}
                      onChange={e => setMusicCategory(e.target.value as MusicCategory)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="General">Auto Detect from Content</option>
                      <option value="Energetic">Energetic / Upbeat</option>
                      <option value="Health">Calm / Health</option>
                      <option value="Corporate">Professional Corporate</option>
                      <option value="Technology">Tech / Modern</option>
                      <option value="Cinematic">Cinematic</option>
                      <option value="Scary">Mystery / Scary</option>
                      <option value="Funny">Playful / Comedy</option>
                      <option value="Education">Documentary / Facts</option>
                    </select>
                  </div>

                  {/* Auto CTA Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Auto Call-to-Action</p>
                      <p className="text-[11px] text-slate-500">Adds viral outro CTA for engagement</p>
                    </div>
                    <button
                      id="toggle-auto-cta"
                      type="button"
                      onClick={() => setAutoCta(!autoCta)}
                      className={`w-11 h-6 rounded-full transition-colors flex items-center p-1 cursor-pointer ${
                        autoCta ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-slate-950 shadow-sm`} />
                    </button>
                  </div>

                  {/* Primary One-Click Auto Edit Action */}
                  <button
                    id="btn-trigger-auto-edit"
                    onClick={handleStartAutoEdit}
                    disabled={isUploading || selectedFiles.length === 0}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all ${
                      isUploading || selectedFiles.length === 0
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 shadow-orange-950/40 hover:shadow-orange-900/60'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 text-slate-950" />
                    <span>{isUploading ? (uploadProgressText || 'Uploading & Processing...') : '✨ AUTO EDIT (1-Click)'}</span>
                  </button>

                  {isUploading && uploadProgressText && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                      <p className="text-xs font-semibold text-amber-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{uploadProgressText}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: COMPLETED RESULT & TIMELINE VIEW                        */}
        {/* ============================================================== */}
        {activeTab === 'result' && activeProject && (
          <div className="space-y-8">
            {/* Top Header Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Video Ready &bull; 9:16
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Job: {activeProject.jobId}</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {activeProject.videoTitle || activeProject.title}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {activeProject.outputVideoUrl && (
                  <a
                    id="btn-download-video"
                    href={activeProject.outputVideoUrl}
                    download={`ShortsForge_${activeProject.jobId}.mp4`}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-950/30 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>Download MP4</span>
                  </a>
                )}
                {activeProject.outputThumbnailUrl && (
                  <a
                    id="btn-download-thumbnail"
                    href={activeProject.outputThumbnailUrl}
                    download={`Thumbnail_${activeProject.jobId}.jpg`}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Thumbnail</span>
                  </a>
                )}
                <button
                  id="btn-toggle-edit"
                  onClick={() => setIsEditingMode(!isEditingMode)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <Scissors className="w-4 h-4" />
                  <span>{isEditingMode ? 'Close Edit' : 'Edit Result'}</span>
                </button>
              </div>
            </div>

            {/* Quick Edit Drawer if enabled */}
            {isEditingMode && (
              <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  <span>Edit Video Details & Title</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs text-slate-400">Video Headline / Title</label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={e => setEditedTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSaveEdits}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Save Title Updates
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2 Columns: Video Player (Left) + Analysis & Metadata (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: 9:16 Video Player Card (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[340px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl relative flex items-center justify-center group">
                  {activeProject.outputVideoUrl ? (
                    <video
                      ref={videoRef}
                      src={activeProject.outputVideoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                      poster={activeProject.outputThumbnailUrl}
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Film className="w-10 h-10 text-slate-700 mx-auto" />
                      <p className="text-xs text-slate-500">Video rendering in progress...</p>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  1080x1920 &bull; 9:16 Portrait &bull; Spoken Audio 100% + BGM Ducked 12%
                </p>
              </div>

              {/* Right Column: AI Analysis, Timeline & Social Package (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Content Analysis Card */}
                {activeProject.analysis && (
                  <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>AI Content Analysis</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Topic</span>
                        <span className="font-semibold text-slate-200">{activeProject.analysis.topic}</span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Category</span>
                        <span className="font-semibold text-slate-200">{activeProject.analysis.suggestedCategory}</span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Final Duration</span>
                        <span className="font-semibold text-amber-400 font-mono">{activeProject.finalDuration || 30}s</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Suggested Hook (00:00)</span>
                      <p className="text-amber-300 font-medium italic">&ldquo;{activeProject.analysis.suggestedHook}&rdquo;</p>
                    </div>
                  </div>
                )}

                {/* Interactive Editing Timeline */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Editing Timeline ({activeProject.cuts.length} Scenes)</span>
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {activeProject.cuts.map((cut, idx) => (
                      <div
                        key={cut.id || idx}
                        className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              cut.type === 'HOOK'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : cut.type === 'B_ROLL'
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : cut.type === 'CTA'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {cut.type}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            {cut.startTime}s &ndash; {cut.endTime}s ({cut.duration}s)
                          </span>
                        </div>
                        <p className="text-slate-300 truncate max-w-[200px] font-medium">
                          {cut.transcriptText}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                          <span>Score {cut.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Package & Copy Section */}
                {activeProject.socialPackage && (
                  <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Social Media Captions & Hashtags</span>
                    </h3>

                    {/* TikTok Caption */}
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-500">TikTok / Reels Caption</span>
                        <button
                          onClick={() => handleCopyText(activeProject.socialPackage?.tiktokCaption || '', 'tiktok')}
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold text-[11px]"
                        >
                          {copiedField === 'tiktok' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === 'tiktok' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs whitespace-pre-line">
                        {activeProject.socialPackage.tiktokCaption}
                      </p>
                    </div>

                    {/* Hashtags */}
                    <div className="flex flex-wrap gap-1.5">
                      {activeProject.socialPackage.hashtags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 border border-slate-800 text-[11px] font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PROJECT HISTORY VIEW                                    */}
        {/* ============================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Auto Edited Video History</h2>
                <p className="text-xs text-slate-400">All automated short video projects created with AI Auto Editor.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setFilePreviews([]);
                  setActiveTab('create');
                }}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>+ New Auto Edit</span>
              </button>
            </div>

            {projectsList.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <Wand2 className="w-10 h-10 text-slate-700 mx-auto" />
                <h3 className="font-bold text-slate-300 text-sm">No Auto Edited Videos Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Upload raw videos or photos on the Editor tab to automatically generate polished 9:16 shorts.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectsList.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p);
                      setActiveTab('result');
                    }}
                    className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 space-y-3 cursor-pointer transition-all duration-200 group relative"
                  >
                    {/* Thumbnail Preview */}
                    <div className="aspect-[9/16] w-full max-h-56 bg-slate-950 rounded-xl overflow-hidden relative flex items-center justify-center">
                      {p.outputThumbnailUrl ? (
                        <img
                          src={p.outputThumbnailUrl}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Film className="w-8 h-8 text-slate-700" />
                      )}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
                        {p.finalDuration || 30}s
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-100 truncate group-hover:text-amber-400 transition-colors">
                        {p.videoTitle || p.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Style: {p.style} &bull; {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          p.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {p.status}
                      </span>
                      <button
                        onClick={e => handleDeleteProject(p.id, e)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
