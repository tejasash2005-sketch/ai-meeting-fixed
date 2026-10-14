import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mic, Brain, Zap, Shield, Users, BarChart3,
  ChevronRight, Play, CheckCircle2, Globe,
  MessageSquare, Star, ArrowRight, Github
} from 'lucide-react';
import { useAuthStore } from '../../context/authStore';

const Nav = () => {
  const { isAuthenticated } = useAuthStore();
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              AI Meeting
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-primary-600 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-primary-600 transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-primary-600 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary py-2 px-5">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-primary-600">Log in</Link>
                <Link to="/register" className="btn-primary py-2 px-5 rounded-full shadow-lg shadow-primary-200">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, color }) => (
  <div className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
  </div>
);

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-bold mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>V2.0 is now live with Second Brain AI</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
            Transform Meetings into <span className="text-primary-600">Collective Intelligence.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            The AI-first workspace that transcribes, summarizes, and extracts action items from every conversation across your organization.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="btn-primary text-lg py-4 px-10 rounded-full shadow-xl shadow-primary-200 flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Start Your Free Trial <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-white hover:bg-slate-50 text-slate-900 font-bold py-4 px-10 rounded-full border border-slate-200 flex items-center gap-2 transition-all w-full sm:w-auto justify-center">
              <Play className="w-5 h-5 fill-current" /> Watch Demo
            </button>
          </div>

          {/* App Preview Mockup */}
          <div className="mt-20 relative max-w-6xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-purple-500 rounded-[2rem] blur opacity-20"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden aspect-[16/9] flex flex-col">
              {/* Browser Bar */}
              <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-1.5 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <div className="mx-auto bg-white border border-slate-200 rounded px-10 py-0.5 text-[10px] text-slate-400 font-mono">app.aimeeting.com/dashboard</div>
              </div>
              {/* Dashboard Realistic Preview */}
              <div className="flex-1 relative bg-slate-900 overflow-hidden group">
                {/* Real office meeting background */}
                <img
                  src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=2070"
                  alt="Professional Meeting Intelligence"
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />

                {/* Modern UI Overlays */}
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/60 via-transparent to-primary-600/20"></div>

                {/* Live Transcription Card */}
                <div className="absolute top-6 left-6 p-4 bg-white/95 rounded-2xl shadow-2xl border border-white/20 w-64 backdrop-blur-md animate-fade-in hidden sm:block">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Transcription</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-800">Jane Smith</p>
                    <p className="text-xs text-slate-500 leading-relaxed italic">"Our Q4 growth targets are achievable if we automate the feedback loop..."</p>
                    <div className="flex gap-1 pt-1">
                       <div className="h-1 w-8 bg-primary-500 rounded-full"></div>
                       <div className="h-1 w-4 bg-slate-200 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* AI Insights Card */}
                <div className="absolute bottom-6 right-6 p-4 bg-white/95 rounded-2xl shadow-2xl border border-white/20 w-72 backdrop-blur-md animate-fade-in delay-500 hidden md:block">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">AI Intelligence Pulse</span>
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                       <p className="text-[10px] text-slate-400">Sentiment</p>
                       <p className="text-xs font-bold text-emerald-600">Positive</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                       <p className="text-[10px] text-slate-400">Engagement</p>
                       <p className="text-xs font-bold text-primary-600">92%</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded bg-emerald-100 flex items-center justify-center">
                         <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded bg-slate-100"></div>
                      <div className="h-1.5 w-3/4 bg-slate-50 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Central Play/Interaction Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="relative">
                      <div className="absolute inset-0 bg-primary-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                      <button className="relative w-24 h-24 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-full border border-white/40 flex items-center justify-center shadow-2xl transition-all hover:scale-110 group cursor-pointer">
                        <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center shadow-xl group-hover:bg-primary-500 transition-colors">
                          <Play className="w-6 h-6 text-white fill-current ml-1" />
                        </div>
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-y border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">TRUSTED BY TEAMS AT</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale">
            <div className="text-2xl font-black text-slate-800">GITHUB</div>
            <div className="text-2xl font-black text-slate-800">LINEAR</div>
            <div className="text-2xl font-black text-slate-800">NOTION</div>
            <div className="text-2xl font-black text-slate-800">STRIPE</div>
            <div className="text-2xl font-black text-slate-800">FIGMA</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Powerful AI Modules</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Everything you need to turn spoken words into documented progress.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={Brain}
              color="bg-purple-600"
              title="AI Second Brain"
              desc="Chat with your entire meeting history. Ask questions across months of conversations."
            />
            <FeatureCard
              icon={Zap}
              color="bg-primary-600"
              title="Real-time Insights"
              desc="Get live sentiment analysis and engagement scores during your video calls."
            />
            <FeatureCard
              icon={BarChart3}
              color="bg-emerald-600"
              title="Predictive Analytics"
              desc="Track team productivity patterns and project risks before they become issues."
            />
            <FeatureCard
              icon={Shield}
              color="bg-amber-600"
              title="Enterprise Security"
              desc="Military-grade encryption for all your recordings and transcripts."
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-4 bg-white relative overflow-hidden">
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex gap-1 mb-6 text-amber-400">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-current" />)}
              </div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
                "This changed how we handle engineering sprints entirely."
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Before AI Meeting, we lost 30% of our decisions in the 'forgotten void' of Slack messages. Now, every decision is tracked, assigned, and searchable.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200"></div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">Alex Rivard</p>
                  <p className="text-slate-500">CTO at TechFlow</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-3xl font-bold text-primary-600">95%</p>
                  <p className="text-sm text-slate-500 font-medium">Accuracy rate</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-3xl font-bold text-primary-600">10k+</p>
                  <p className="text-sm text-slate-500 font-medium">Teams active</p>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-3xl font-bold text-primary-600">2M+</p>
                  <p className="text-sm text-slate-500 font-medium">Transcribed mins</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-3xl font-bold text-primary-600">4.9/5</p>
                  <p className="text-sm text-slate-500 font-medium">User rating</p>
                </div>
              </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-slate-900 text-white px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold">AI Meeting</span>
              </div>
              <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">
                Building the future of collective intelligence. We help teams work smarter by capturing and analyzing every spoken word.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"><Github className="w-5 h-5" /></div>
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"><Globe className="w-5 h-5" /></div>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6">Product</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="hover:text-white transition-colors cursor-pointer">Live Rooms</li>
                <li className="hover:text-white transition-colors cursor-pointer">Second Brain</li>
                <li className="hover:text-white transition-colors cursor-pointer">AI Insights</li>
                <li className="hover:text-white transition-colors cursor-pointer">Security</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="hover:text-white transition-colors cursor-pointer">About Us</li>
                <li className="hover:text-white transition-colors cursor-pointer">Careers</li>
                <li className="hover:text-white transition-colors cursor-pointer">Privacy</li>
                <li className="hover:text-white transition-colors cursor-pointer">Contact</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
            © 2024 AI Meeting Intelligence v2. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

const Sparkles = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);
