import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppLogo, BotMessageSquareIcon, SparklesIcon, UsersIcon, LayoutDashboardIcon, ArrowLeftIcon, RocketIcon, ZapIcon, ShieldCheckIcon, ChevronRightIcon, CheckSquareIcon, TrendingUpIcon } from './Icons';
import { LoginPage } from '../pages/LoginPage';

const ParallaxBackground: React.FC = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({
                x: (e.clientX / window.innerWidth - 0.5) * 40,
                y: (e.clientY / window.innerHeight - 0.5) * 40
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div 
                className="absolute inset-0 opacity-[0.03]" 
                style={{ 
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px',
                    transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`
                }} 
            />
            <div 
                className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"
                style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
            />
            <div 
                className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]"
                style={{ transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)` }}
            />
        </div>
    );
};

export const LandingPage: React.FC<{ onShowPrivacy: () => void }> = ({ onShowPrivacy }) => {
    const loginSectionRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const scrollToLogin = () => {
        loginSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const imgFront = "https://zcxsscvheqidzvkhlnwz.supabase.co/storage/v1/object/public/Default%20image/image%2012.png";

    return (
        <div className="min-h-screen bg-[#1C2326] selection:bg-gray-500 selection:text-white overflow-x-hidden">
            <style>{`
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px) translateX(0px); }
                    50% { transform: translateY(-20px) translateX(10px); }
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                }
                .perspective-container {
                    perspective: 2000px;
                }
            `}</style>

            <ParallaxBackground />
            
            {/* Navigation Header */}
            <nav className="fixed top-0 w-full z-50 px-6 py-6 flex justify-between items-center backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-3">
                    <AppLogo className="w-10 h-10" />
                    <span className="text-xl font-bold tracking-tighter text-white">Graphynovus</span>
                </div>
                <button 
                    onClick={scrollToLogin}
                    className="px-5 py-2 text-sm font-semibold bg-white text-black rounded-full hover:bg-gray-200 transition-all shadow-xl shadow-white/5"
                >
                    Sign In
                </button>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-48 pb-64 px-6 flex flex-col items-center text-center overflow-visible">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-gray-400 mb-8 animate-fade-in">
                    <SparklesIcon className="w-3 h-3 text-emerald-400" />
                    Powered by Gemini 3.0 Pro
                </div>
                <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight leading-[0.9] mb-8 max-w-4xl">
                    Experience Neural <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">Flow.</span>
                </h1>
                <p className="text-lg text-gray-400 max-w-xl mb-12 leading-relaxed">
                    Graphynovus orchestrates your most complex projects with advanced neural reasoning and real-time mesh connectivity.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center mb-40">
                    <button 
                        onClick={scrollToLogin}
                        className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-all flex items-center gap-2 shadow-2xl shadow-white/10 group"
                    >
                        Initialize Workflow
                        <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Minimalist 3D Terminal Preview */}
                <div className="relative w-full max-w-5xl mt-12 perspective-container">
                    
                    {/* Background Glow Pulse */}
                    <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" 
                        style={{ animation: 'pulse-glow 8s infinite ease-in-out' }}
                    />

                    <div 
                        className="relative z-20 transition-transform duration-300 ease-out"
                        style={{ 
                            transform: `rotateX(${10 - mousePos.y * 0.5}deg) rotateY(${mousePos.x * 0.5}deg)`
                        }}
                    >
                        {/* Main Glass Frame */}
                        <div className="p-1 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/20 backdrop-blur-3xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
                             {/* Bezel / Window Controls */}
                             <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="w-2/3 h-full bg-emerald-500/50" />
                                    </div>
                                    <div className="text-[9px] font-mono text-emerald-500/50 uppercase tracking-widest">System Active</div>
                                </div>
                            </div>
                            
                            <img 
                                src={imgFront} 
                                alt="Graphynovus Terminal" 
                                className="w-full h-auto grayscale-[0.2] contrast-[1.1] brightness-[0.9]"
                            />
                        </div>

                        {/* Floating Satellite 1 - Performance Card */}
                        <div 
                            className="absolute -top-12 -left-12 p-5 rounded-xl bg-[#131C1B]/80 border border-emerald-500/20 backdrop-blur-2xl shadow-2xl hidden md:block"
                            style={{ 
                                animation: 'float-slow 6s infinite ease-in-out',
                                transform: `translateZ(100px)`
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                    <TrendingUpIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Efficiency</p>
                                    <p className="text-sm font-bold text-white">Neural Load 98%</p>
                                </div>
                            </div>
                        </div>

                        {/* Floating Satellite 2 - User Status */}
                        <div 
                            className="absolute -bottom-10 -right-10 p-5 rounded-xl bg-[#131C1B]/80 border border-blue-500/20 backdrop-blur-2xl shadow-2xl hidden md:block"
                            style={{ 
                                animation: 'float-slow 5s infinite ease-in-out',
                                animationDelay: '-2s',
                                transform: `translateZ(80px)`
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/30">
                                        G
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#131C1B]" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Project Sync</p>
                                    <p className="text-sm font-bold text-white">Gemini Online</p>
                                </div>
                            </div>
                        </div>

                        {/* Floating Satellite 3 - Quick Action */}
                        <div 
                            className="absolute top-1/4 -right-16 p-4 rounded-xl bg-[#131C1B]/80 border border-white/10 backdrop-blur-2xl shadow-2xl hidden lg:block"
                            style={{ 
                                animation: 'float-slow 7s infinite ease-in-out',
                                animationDelay: '-1s',
                                transform: `translateZ(120px)`
                            }}
                        >
                            <div className="flex items-center gap-3 text-white/50">
                                <ZapIcon className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Critical Path Detected</span>
                            </div>
                        </div>
                    </div>

                    {/* Ground Reflection / Gradient Fade-out */}
                    <div className="absolute -bottom-40 left-0 w-full h-80 bg-gradient-to-t from-[#1C2326] via-transparent to-transparent z-30 pointer-events-none" />
                </div>
            </header>

            {/* Metrics Section */}
            <section className="py-32 border-y border-white/5 bg-[#131C1B]/20 backdrop-blur-lg relative z-10">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                    <div>
                        <div className="text-4xl font-bold text-white mb-2">65%</div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest">Planning Efficiency</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-white mb-2">12k</div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest">Neural Insights</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-white mb-2">100%</div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest">Mesh Stability</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-white mb-2">&lt;10ms</div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest">Global Latency</div>
                    </div>
                </div>
            </section>

            {/* Login Section Wrapper - Full screen destination */}
            <section ref={loginSectionRef} className="relative z-10 min-h-screen flex items-center justify-center py-24 px-6 bg-[#0D1117]/40 backdrop-blur-sm">
                <div className="w-full max-w-lg bg-[#131C1B]/80 p-10 rounded-xl border border-gray-800 backdrop-blur-3xl shadow-2xl transition-all duration-500 hover:border-gray-700 ring-1 ring-white/5">
                    <div className="text-center mb-10">
                        <AppLogo className="w-20 h-20 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                            Graphynovus <span className="text-gray-500 font-light mx-1">|</span> <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">Gemini Project Board</span>
                        </h2>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-[0.2em]">Secure Session Initialization</p>
                    </div>
                    <LoginPage onShowPrivacy={onShowPrivacy} />
                </div>
            </section>

            <footer className="py-12 border-t border-white/5 text-center px-6 bg-[#131C1B]/40 backdrop-blur-md">
                <div className="flex items-center justify-center gap-3 mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                    <AppLogo className="w-6 h-6" />
                    <span className="font-bold text-white tracking-tighter">Graphynovus</span>
                </div>
                <p className="text-[10px] text-gray-600 font-mono">
                    &copy; {new Date().getFullYear()} Graphynovus Labs. Neural Workflow Systems.
                </p>
            </footer>
        </div>
    );
};