import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppLogo, BotMessageSquareIcon, SparklesIcon, UsersIcon, LayoutDashboardIcon, ArrowLeftIcon, RocketIcon, ZapIcon, ShieldCheckIcon, ChevronRightIcon } from './Icons';
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

    const scrollToLogin = () => {
        loginSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const imgBack = "https://zcxsscvheqidzvkhlnwz.supabase.co/storage/v1/object/public/Default%20image/image%202.png";
    const imgMid = "https://zcxsscvheqidzvkhlnwz.supabase.co/storage/v1/object/public/Default%20image/image%203.png";
    const imgFront = "https://zcxsscvheqidzvkhlnwz.supabase.co/storage/v1/object/public/Default%20image/image%2010.png";

    return (
        <div className="min-h-screen bg-[#1C2326] selection:bg-gray-500 selection:text-white overflow-x-hidden">
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotateX(25deg) rotateY(-10deg) rotateZ(1deg); }
                    50% { transform: translateY(-20px) rotateX(25deg) rotateY(-10deg) rotateZ(1deg); }
                }
                @keyframes float-reverse {
                    0%, 100% { transform: translateY(0px) rotateX(25deg) rotateY(10deg) rotateZ(-1deg); }
                    50% { transform: translateY(-15px) rotateX(25deg) rotateY(10deg) rotateZ(-1deg); }
                }
                .perspective-container {
                    perspective: 2000px;
                }
                .dashboard-card {
                    transform-style: preserve-3d;
                    transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
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
                <div className="flex flex-col sm:flex-row gap-4 items-center mb-32">
                    <button 
                        onClick={scrollToLogin}
                        className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-all flex items-center gap-2 shadow-2xl shadow-white/10 group"
                    >
                        Initialize Workflow
                        <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* 3D Tilted Stack Dashboard Preview */}
                <div className="relative w-full max-w-6xl mt-12 perspective-container group">
                    <div className="relative h-[400px] md:h-[600px] w-full">
                        
                        {/* Shadow Base */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 w-[80%] h-32 bg-black/40 blur-[100px] rounded-full pointer-events-none" />

                        {/* Back Layer (Image 2) */}
                        <div 
                            className="absolute left-[5%] top-0 w-[60%] md:w-[50%] dashboard-card z-10 opacity-40 group-hover:opacity-60 transition-all duration-700"
                            style={{ animation: 'float-reverse 8s infinite ease-in-out' }}
                        >
                            <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full" />
                            <div className="p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden">
                                <img src={imgBack} alt="UI Layer 1" className="w-full h-auto rounded-xl" />
                            </div>
                        </div>

                        {/* Middle Layer (Image 3) */}
                        <div 
                            className="absolute right-[5%] top-[10%] w-[60%] md:w-[50%] dashboard-card z-20 opacity-60 group-hover:opacity-80 transition-all duration-700"
                            style={{ animation: 'float 7s infinite ease-in-out', animationDelay: '-1s' }}
                        >
                            <div className="absolute -inset-4 bg-purple-500/20 blur-3xl rounded-full" />
                            <div className="p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden">
                                <img src={imgMid} alt="UI Layer 2" className="w-full h-auto rounded-xl" />
                            </div>
                        </div>

                        {/* Front Main Layer (Image 10) */}
                        <div 
                            className="absolute left-1/2 top-[20%] -translate-x-1/2 w-[85%] md:w-[70%] dashboard-card z-30 transition-all duration-700 group-hover:scale-105"
                            style={{ 
                                animation: 'float 6s infinite ease-in-out', 
                                animationDelay: '-2s',
                                transform: 'rotateX(20deg) rotateY(0deg) rotateZ(0deg)'
                            }}
                        >
                            <div className="absolute -inset-10 bg-emerald-500/10 blur-[100px] rounded-full opacity-50" />
                            <div className="p-1.5 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden">
                                {/* Window Chrome */}
                                <div className="flex gap-1.5 px-4 py-3 bg-white/5 border-b border-white/5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                                </div>
                                <img src={imgFront} alt="Graphynovus Interface" className="w-full h-auto rounded-b-2xl" />
                            </div>
                        </div>

                    </div>

                    {/* Gradient Fade-out at bottom of hero */}
                    <div className="absolute -bottom-32 left-0 w-full h-64 bg-gradient-to-t from-[#1C2326] via-transparent to-transparent z-40 pointer-events-none" />
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
                <div className="w-full max-w-lg bg-[#131C1B]/80 p-10 rounded-[2.5rem] border border-gray-800 backdrop-blur-3xl shadow-2xl transition-all duration-500 hover:border-gray-700 ring-1 ring-white/5">
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