import React, { useState } from 'react';
import { XIcon, HelpCircleIcon, BookOpenIcon, ShieldCheckIcon, MessageCircleIcon, ChevronRightIcon, BotMessageSquareIcon, SparklesIcon, ZapIcon, UsersIcon, CheckSquareIcon, GitHubIcon, MessageSquareIcon } from './Icons';

interface InfoHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'guide' | 'faq' | 'privacy' | 'terms' | 'contact';
}

const Accordion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-white/5 rounded-xl overflow-hidden mb-3">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-5 py-4 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
            >
                <span className="text-sm font-bold text-gray-200 text-left">{title}</span>
                <ChevronRightIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-90 text-emerald-400' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-5 py-4 bg-[#0D1117] text-xs text-gray-400 leading-relaxed border-t border-white/5">
                    {children}
                </div>
            )}
        </div>
    );
};

export const InfoHubModal: React.FC<InfoHubModalProps> = ({ isOpen, onClose, initialTab = 'guide' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);

    if (!isOpen) return null;

    const tabs = [
        { id: 'guide', label: 'How-to Guide', icon: <BookOpenIcon className="w-4 h-4" /> },
        { id: 'faq', label: 'FAQ', icon: <HelpCircleIcon className="w-4 h-4" /> },
        { id: 'terms', label: 'Terms & Conditions', icon: <SparklesIcon className="w-4 h-4" /> },
        { id: 'privacy', label: 'Privacy Policy', icon: <ShieldCheckIcon className="w-4 h-4" /> },
        { id: 'contact', label: 'Contact', icon: <MessageCircleIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-[#131C1B] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-white/5 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center flex-shrink-0 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                            <HelpCircleIcon className="w-5 h-5" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Neural Info Hub</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                    {/* Sidebar Tabs */}
                    <aside className="w-full md:w-64 border-r border-white/5 bg-[#0D1117]/50 p-4 space-y-1 flex-shrink-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </aside>

                    {/* Content Area */}
                    <main className="flex-grow overflow-y-auto custom-scrollbar p-8">
                        {activeTab === 'guide' && (
                            <div className="space-y-8 animate-in slide-in-from-right-2 duration-500">
                                <div>
                                    <h3 className="text-xl font-black text-white mb-2 tracking-tight">System Manual</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed">Master the Graphynovus neural interface for peak project orchestration.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><ZapIcon className="w-5 h-5"/></div>
                                        <h4 className="text-sm font-bold text-white mb-2">Neural Nexus</h4>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Open the Neural Nexus from any board to generate complex project structures from simple text descriptions or data files.</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/20 transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><UsersIcon className="w-5 h-5"/></div>
                                        <h4 className="text-sm font-bold text-white mb-2">Mesh Connectivity</h4>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Add team members to project nodes to enable real-time chat, task assignment, and workload balancing across the global mesh.</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><CheckSquareIcon className="w-5 h-5"/></div>
                                        <h4 className="text-sm font-bold text-white mb-2">Cycle Management</h4>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Use Sprints to segment your work into actionable time-bounded cycles. Complete cycles to roll over incomplete tasks automatically.</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/20 transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><BotMessageSquareIcon className="w-5 h-5"/></div>
                                        <h4 className="text-sm font-bold text-white mb-2">Voice Synthesis</h4>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Activate the Neural Link using the microphone icon. Direct the board verbally to create tasks or navigate different project sectors.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'faq' && (
                            <div className="space-y-6 animate-in slide-in-from-right-2 duration-500">
                                <h3 className="text-xl font-black text-white mb-6 tracking-tight">Frequently Asked</h3>
                                <Accordion title="How do I get a Gemini API key?">
                                    Visit the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Google AI Studio</a>. You can generate a free tier key that works perfectly with our system. We support Gemini 1.5 Flash and Pro models.
                                </Accordion>
                                <Accordion title="Is my API key safe?">
                                    Absolutely. Your Gemini API key is stored exclusively in your browser's LocalStorage. It is never sent to our servers or processed by anything other than your local instance of the application during direct SDK calls.
                                </Accordion>
                                <Accordion title="Can I import data from Jira or Trello?">
                                    Yes! Export your project as a CSV and drop it into the Project Canvas. Our AI will analyze the headers and structure your tasks automatically into the Neural Mesh.
                                </Accordion>
                                <Accordion title="How does the 'Neural' search work?">
                                    Unlike standard keyword search, our Neural Search uses LLM embeddings to understand intent. Searching for "bugs assigned to me" will resolve correctly even if those exact words aren't in the title.
                                </Accordion>
                            </div>
                        )}

                        {activeTab === 'terms' && (
                            <div className="space-y-6 animate-in slide-in-from-right-2 duration-500 text-xs text-gray-400 leading-relaxed">
                                <h3 className="text-xl font-black text-white mb-4 tracking-tight">Terms of Activation</h3>
                                <p>By accessing Graphynovus, you agree to comply with our neural protocols. This platform is provided "as is" to facilitate project orchestration.</p>
                                <h4 className="text-white font-bold uppercase tracking-widest mt-4">1. Access and Security</h4>
                                <p>Users are responsible for maintaining the confidentiality of their neural credentials and API keys. Any unauthorized access detected may lead to session termination.</p>
                                <h4 className="text-white font-bold uppercase tracking-widest mt-4">2. AI Usage</h4>
                                <p>Generated content (tasks, descriptions, plans) is synthesized by third-party models (Google Gemini). Graphynovus is not responsible for the accuracy or output of these models.</p>
                                <h4 className="text-white font-bold uppercase tracking-widest mt-4">3. Prohibited Conduct</h4>
                                <p>The transmission of malicious data packets, attempts to breach the neural mesh, or harvesting of other user credentials is strictly prohibited.</p>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div className="space-y-6 animate-in slide-in-from-right-2 duration-500 text-xs text-gray-400 leading-relaxed">
                                <h3 className="text-xl font-black text-white mb-4 tracking-tight">Privacy Protocol</h3>
                                <p>We prioritize data sovereignty. Your workspace data is protected via Supabase Row-Level Security.</p>
                                <h4 className="text-white font-bold uppercase tracking-widest mt-4">Data Collection</h4>
                                <p>We collect essential telemetry (email, name) to maintain your project array. Your project content is stored securely on decentralized clusters.</p>
                                <h4 className="text-white font-bold uppercase tracking-widest mt-4">AI Link Privacy</h4>
                                <p>When direct Neural Links (BYOK) are active, your data is sent directly to Google Cloud endpoints. We do not intercept or log these data streams.</p>
                            </div>
                        )}

                        {activeTab === 'contact' && (
                            <div className="space-y-8 animate-in slide-in-from-right-2 duration-500">
                                <h3 className="text-xl font-black text-white mb-4 tracking-tight">Direct Uplink</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Neural Support</p>
                                        <p className="text-sm text-white font-bold mb-1">support@graphynovus.io</p>
                                        <p className="text-xs text-gray-500">Typical response latency: 24h</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Protocol Updates</p>
                                        <div className="flex gap-4">
                                            {/* FIX: GitHubIcon and MessageSquareIcon were missing from imports */}
                                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><GitHubIcon className="w-5 h-5"/></a>
                                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><MessageSquareIcon className="w-5 h-5"/></a>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                    <h4 className="text-sm font-bold text-emerald-400 mb-2">Want to report a bug?</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed mb-4">Use the floating beacon icon (life buoy) in the bottom right corner of the dashboard for instant neural issue tracking.</p>
                                </div>
                            </div>
                        )}
                    </main>
                </div>

                <footer className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-center">
                    <p className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.3em]">Graphynovus Labs | Global Deployment v3.0.4</p>
                </footer>
            </div>
        </div>
    );
};

export default InfoHubModal;