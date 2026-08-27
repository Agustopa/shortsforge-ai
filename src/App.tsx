import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CreateVideoView } from './components/CreateVideoView';
import { AutoEditorView } from './components/AutoEditorView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { BatchGeneratorView } from './components/BatchGeneratorView';
import { ContentIdeasView } from './components/ContentIdeasView';
import { MediaLibraryView } from './components/MediaLibraryView';
import { SettingsView } from './components/SettingsView';
import { GenerationProgressModal } from './components/GenerationProgressModal';
import { safeFetchJson } from './utils/apiClient';
import {
  LayoutDashboard,
  Clapperboard,
  Wand2,
  FolderKanban,
  Settings,
  Plus
} from 'lucide-react';
import {
  Project,
  ContentIdea,
  MediaAsset,
  AppSettings,
  ProviderStatus,
  LanguageCode,
  VideoPlatform,
  AspectRatio,
  VideoDuration,
  ContentStyle,
  VoiceGender,
  VoiceStyle,
  SubtitlePreset,
  MusicCategory,
  VisualMode,
  QualityMode
} from './types/index';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    defaultLanguage: 'id',
    defaultDuration: 30,
    defaultVoiceGender: 'Male',
    defaultSubtitlePreset: 'Viral',
    defaultMusicCategory: 'Cinematic',
    geminiApiKeyConfigured: true,
    mockModeEnabled: false,
    maxConcurrentJobs: 3
  });
  const [providers, setProviders] = useState<ProviderStatus[]>([]);

  // Active Project Detail
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Initial Topic for Create Screen
  const [initialCreateTopic, setInitialCreateTopic] = useState<string>('');

  // Active Generating Job / Modal Tracking
  const [activeJobProjectId, setActiveJobProjectId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const isPollingRef = useRef(false);

  // Fetch initial data safely
  const fetchProjects = useCallback(async () => {
    const data = await safeFetchJson<{ success: boolean; projects?: Project[] }>('/api/v1/projects');
    if (data?.success && data.projects) {
      setProjects(data.projects);
    }
  }, []);

  const fetchIdeas = useCallback(async () => {
    const data = await safeFetchJson<{ success: boolean; ideas?: ContentIdea[] }>('/api/v1/ideas');
    if (data?.success && data.ideas) {
      setIdeas(data.ideas);
    }
  }, []);

  const fetchMedia = useCallback(async () => {
    const data = await safeFetchJson<{ success: boolean; assets?: MediaAsset[] }>('/api/v1/media');
    if (data?.success && data.assets) {
      setMediaAssets(data.assets);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    const data = await safeFetchJson<{ success: boolean; providers?: ProviderStatus[] }>('/api/v1/providers/status');
    if (data?.success && data.providers) {
      setProviders(data.providers);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    const data = await safeFetchJson<{ success: boolean; settings?: AppSettings }>('/api/v1/settings');
    if (data?.success && data.settings) {
      setSettings(data.settings);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchIdeas();
    fetchMedia();
    fetchProviders();
    fetchSettings();
  }, [fetchProjects, fetchIdeas, fetchMedia, fetchProviders, fetchSettings]);

  // Dynamic high-frequency polling for active video jobs (800ms) and idle polling (3000ms)
  useEffect(() => {
    const hasRunning = projects.some(p => !['COMPLETED', 'FAILED', 'CANCELLED', 'DRAFT'].includes(p.status));
    const intervalMs = (hasRunning || activeJobProjectId) ? 800 : 3000;

    const interval = setInterval(async () => {
      if (isPollingRef.current) return;
      if (hasRunning || activeJobProjectId) {
        isPollingRef.current = true;
        try {
          await fetchProjects();
        } finally {
          isPollingRef.current = false;
        }
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [projects, activeJobProjectId, fetchProjects]);

  // Handle Video Generation Start
  const handleGenerateVideo = async (payload: {
    topic: string;
    language: LanguageCode;
    platform: VideoPlatform;
    aspectRatio: AspectRatio;
    duration: VideoDuration;
    contentStyle: ContentStyle;
    voiceGender: VoiceGender;
    voiceStyle: VoiceStyle;
    subtitlePreset: SubtitlePreset;
    musicCategory: MusicCategory;
    autoMode: boolean;
    visualMode: VisualMode;
    qualityMode: QualityMode;
  }) => {
    try {
      const data = await safeFetchJson<{ success: boolean; project?: Project }>('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, autoGenerate: true })
      });
      if (data?.success && data.project) {
        setProjects(prev => [data.project!, ...prev]);
        setActiveJobProjectId(data.project.id);
        setIsModalOpen(true);
        setSelectedProjectId(data.project.id);
      }
    } catch (e) {
      console.error('Error starting video generation:', e);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJobProjectId) return;
    try {
      await safeFetchJson(`/api/v1/projects/${activeJobProjectId}/cancel`, { method: 'POST' });
      fetchProjects();
    } catch (e) {
      console.error('Error cancelling job:', e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await safeFetchJson(`/api/v1/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProjectId === id) setSelectedProjectId(null);
    } catch (e) {
      console.error('Error deleting project:', e);
    }
  };

  const handleDuplicateProject = async (id: string) => {
    try {
      const data = await safeFetchJson<{ success: boolean; project?: Project }>(`/api/v1/projects/${id}/duplicate`, { method: 'POST' });
      if (data?.success && data.project) {
        setProjects(prev => [data.project!, ...prev]);
      }
    } catch (e) {
      console.error('Error duplicating project:', e);
    }
  };

  const handleGenerateVariations = async () => {
    if (!selectedProjectId) return;
    try {
      const data = await safeFetchJson<{ success: boolean; variations?: Project[] }>(`/api/v1/projects/${selectedProjectId}/variations`, { method: 'POST' });
      if (data?.success && data.variations) {
        setProjects(prev => [...data.variations!, ...prev]);
        fetchProjects();
      }
    } catch (e) {
      console.error('Error generating variations:', e);
    }
  };

  const handleStartBatch = async (
    topics: string[],
    config: { language: LanguageCode; duration: VideoDuration; contentStyle: ContentStyle }
  ) => {
    try {
      const data = await safeFetchJson<{ success: boolean; projects?: Project[] }>('/api/v1/batch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics, ...config })
      });
      if (data?.success && data.projects) {
        setProjects(prev => [...data.projects!, ...prev]);
      }
    } catch (e) {
      console.error('Error starting batch:', e);
    }
  };

  const handleRefreshIdeas = async (niche: string) => {
    try {
      const data = await safeFetchJson<{ success: boolean; ideas?: ContentIdea[] }>('/api/v1/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: niche === 'All' ? 'Facts' : niche, count: 9 })
      });
      if (data?.success && data.ideas) {
        setIdeas(data.ideas);
      }
    } catch (e) {
      console.error('Error generating ideas:', e);
    }
  };

  const handleUploadMedia = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const data = await safeFetchJson<{ success: boolean; asset?: MediaAsset }>('/api/v1/media/upload', {
        method: 'POST',
        body: formData
      });
      if (data?.success && data.asset) {
        setMediaAssets(prev => [data.asset!, ...prev]);
      }
    } catch (e) {
      console.error('Error uploading media:', e);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    try {
      await safeFetchJson(`/api/v1/media/${id}`, { method: 'DELETE' });
      setMediaAssets(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error('Error deleting media:', e);
    }
  };

  const handleSaveSettings = async (updated: Partial<AppSettings>) => {
    try {
      const data = await safeFetchJson<{ success: boolean; settings?: AppSettings }>('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (data?.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.error('Error updating settings:', e);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const activeJobProject = projects.find(p => p.id === activeJobProjectId);

  const getPageTitle = () => {
    if (selectedProjectId && selectedProject) return selectedProject.title || selectedProject.topic;
    switch (currentTab) {
      case 'dashboard':
        return 'Dashboard & Studio';
      case 'create':
        return 'Create Short Video';
      case 'autoedit':
        return 'AI Auto Editor';
      case 'batch':
        return 'Batch Video Generator';
      case 'ideas':
        return 'Viral Content Radar';
      case 'projects':
        return 'All Video Projects';
      case 'media':
        return 'Media Asset Library';
      case 'settings':
        return 'Settings & Provider Status';
      default:
        return 'ShortsForge AI';
    }
  };

  const navigateToTab = (tab: NavTab) => {
    setSelectedProjectId(null);
    setCurrentTab(tab);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onSelectTab={tab => {
          setSelectedProjectId(null);
          setCurrentTab(tab);
        }}
        onQuickCreate={() => {
          setSelectedProjectId(null);
          setInitialCreateTopic('');
          setCurrentTab('create');
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Global Header */}
        <Header
          title={getPageTitle()}
          subtitle="Autonomous short-form video generation platform"
          providers={providers}
          onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
        />

        {/* View Body */}
        <main className="flex-1 overflow-y-auto bg-slate-950 relative pb-16 lg:pb-0">
          {selectedProjectId && selectedProject ? (
            <ProjectDetailView
              project={selectedProject}
              onUpdateProject={updated => {
                setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
              }}
              onRegenerateAll={() => {
                setActiveJobProjectId(selectedProject.id);
                setIsModalOpen(true);
                fetch(`/api/v1/projects/${selectedProject.id}/generate`, { method: 'POST' });
              }}
              onDuplicate={() => handleDuplicateProject(selectedProject.id)}
              onGenerateVariations={handleGenerateVariations}
              onBack={() => setSelectedProjectId(null)}
            />
          ) : currentTab === 'dashboard' ? (
            <DashboardView
              projects={projects}
              ideas={ideas}
              onCreateNew={topic => {
                if (topic) setInitialCreateTopic(topic);
                setCurrentTab('create');
              }}
              onOpenProject={id => setSelectedProjectId(id)}
              onDeleteProject={handleDeleteProject}
              onDuplicateProject={handleDuplicateProject}
            />
          ) : currentTab === 'create' ? (
            <CreateVideoView
              initialTopic={initialCreateTopic}
              onGenerate={handleGenerateVideo}
              isGenerating={Boolean(activeJobProjectId && isModalOpen)}
            />
          ) : currentTab === 'autoedit' ? (
            <AutoEditorView
              onOpenProject={id => setSelectedProjectId(id)}
            />
          ) : currentTab === 'batch' ? (
            <BatchGeneratorView
              projects={projects}
              onStartBatch={handleStartBatch}
              onOpenProject={id => setSelectedProjectId(id)}
            />
          ) : currentTab === 'ideas' ? (
            <ContentIdeasView
              ideas={ideas}
              onSelectIdea={(topic) => {
                setInitialCreateTopic(topic);
                setCurrentTab('create');
              }}
              onRefreshIdeas={handleRefreshIdeas}
            />
          ) : currentTab === 'projects' ? (
            <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">All Projects ({projects.length})</h2>
                  <p className="text-xs text-slate-400">Manage, edit, and export your short-form video projects</p>
                </div>
                <button
                  onClick={() => {
                    setInitialCreateTopic('');
                    setCurrentTab('create');
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {projects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer group flex flex-col justify-between transition-all"
                  >
                    <div className="aspect-[9/14] rounded-xl bg-slate-950 overflow-hidden mb-3 flex items-center justify-center relative">
                      {p.thumbnailUrl ? (
                        <img src={p.thumbnailUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                      ) : p.scenes[0]?.visual_url ? (
                        <img src={p.scenes[0].visual_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-xs text-slate-600 font-mono">1080x1920</span>
                      )}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-amber-300 font-bold">
                        {p.duration}s
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200 line-clamp-1 group-hover:text-amber-400">{p.title || p.topic}</h4>
                      <p className="text-xs text-slate-500 mt-1">{p.duration}s · {p.language.toUpperCase()} · {p.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : currentTab === 'media' ? (
            <MediaLibraryView
              assets={mediaAssets}
              onUpload={handleUploadMedia}
              onDelete={handleDeleteMedia}
            />
          ) : currentTab === 'settings' ? (
            <SettingsView
              settings={settings}
              providers={providers}
              onSaveSettings={handleSaveSettings}
            />
          ) : null}
        </main>

        {/* Mobile Bottom Navigation Bar (Visible on mobile screens < lg) */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around"
          aria-label="Mobile Navigation"
        >
          <button
            type="button"
            onClick={() => navigateToTab('dashboard')}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 py-1 rounded-xl text-[10px] font-medium transition-colors ${
              currentTab === 'dashboard' && !selectedProjectId
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigateToTab('autoedit')}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 py-1 rounded-xl text-[10px] font-medium transition-colors ${
              currentTab === 'autoedit' && !selectedProjectId
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-5 h-5 mb-0.5" />
            <span>AutoEdit</span>
          </button>

          {/* Center Prominent Create Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedProjectId(null);
              setInitialCreateTopic('');
              setCurrentTab('create');
              setMobileSidebarOpen(false);
            }}
            className="flex flex-col items-center justify-center -mt-4 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 text-slate-950 shadow-lg shadow-orange-950/60 font-bold transition-transform active:scale-95"
            aria-label="Create Video"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>

          <button
            type="button"
            onClick={() => navigateToTab('projects')}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 py-1 rounded-xl text-[10px] font-medium transition-colors ${
              currentTab === 'projects' || selectedProjectId
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderKanban className="w-5 h-5 mb-0.5" />
            <span>Projects</span>
          </button>

          <button
            type="button"
            onClick={() => navigateToTab('settings')}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 py-1 rounded-xl text-[10px] font-medium transition-colors ${
              currentTab === 'settings' && !selectedProjectId
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Real-time Generation Progress Modal */}
      {isModalOpen && activeJobProject && (
        <GenerationProgressModal
          project={activeJobProject}
          onClose={() => setIsModalOpen(false)}
          onCancel={handleCancelJob}
          onOpenResult={id => {
            setIsModalOpen(false);
            setSelectedProjectId(id);
          }}
        />
      )}
    </div>
  );
}
export default App;
