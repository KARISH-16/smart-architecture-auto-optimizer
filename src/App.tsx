import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Zap, 
  Layers, 
  ChevronRight, 
  BarChart3, 
  Info, 
  Monitor,
  CheckCircle2,
  Activity,
  Gauge
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Cell
} from 'recharts';

// Types
interface Architecture {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  image: string;
  color: string;
  accent: string;
  features: string[];
}

interface Metrics {
  execution_time: number;
  cpi: number;
  speedup: number;
}

interface SimulationResults {
  best_architecture: string;
  metrics: Record<string, Metrics>;
  detected_characteristics: {
    instruction_count: number;
    memory_usage: number;
    parallelism: number;
    operation_type: string;
  };
  analysis_summary?: {
    arithmeticHits: number;
    memoryHits: number;
    controlHits: number;
    loopHits: number;
  };
}

const ARCHITECTURES: Architecture[] = [
  {
    id: 'CPU',
    name: 'Intel-Class x86 CPU',
    description: 'High-speed sequential logic processing with advanced branch prediction.',
    longDescription: 'Central Processing Units are optimized for low-latency sequential execution and complex general-purpose computing.',
    image: '',
    color: 'bg-blue-600',
    accent: 'text-blue-600',
    features: ['Out-of-Order Execution', 'Multi-Level Cache', 'Complex Control Logic']
  },
  {
    id: 'GPU',
    name: 'NVIDIA-Class Vector GPU',
    description: 'Ultra-wide parallel throughput for mathematical and tensor-intensive workloads.',
    longDescription: 'Graphics Processing Units feature massive arrays of cores designed for highly data-parallel tasks.',
    image: '',
    color: 'bg-emerald-600',
    accent: 'text-emerald-600',
    features: ['Warp Scheduling', 'High Bandwidth VRAM', 'Tensor-Core Acceleration']
  },
  {
    id: 'RISC',
    name: 'ARM-Class RISC Chip',
    description: 'Minimal cycle overhead via uniform, single-clock instruction sets.',
    longDescription: 'Reduced Instruction Set Computer focusing on simple, power-efficient, and fast execution patterns.',
    image: '',
    color: 'bg-violet-600',
    accent: 'text-violet-600',
    features: ['Hardwired Control', 'Single-Cycle Exec', 'Energy Efficient']
  },
  {
    id: 'CISC',
    name: 'Legacy CISC Microcode',
    description: 'High instruction density using complex, multi-operational micro-instructions.',
    longDescription: 'Complex Instruction Set Computer designed to minimize code size by packing more work into single instructions.',
    image: '',
    color: 'bg-slate-700',
    accent: 'text-slate-700',
    features: ['Variable Length Ops', 'Compact Binaries', 'Multi-Clock Operations']
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'analyze' | 'results'>('home');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SimulationResults | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    code: `// Sample Analysis Subject: Vector Matrix Multiplication
void multiply(float* a, float* b, float* c, int n) {
  for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
      c[i*n + j] = a[i*n + j] * b[i*n + j];
    }
  }
}`,
    instruction_count: 5000,
    memory_usage: 128,
    parallelism: 'Medium',
    operation_type: 'Arithmetic'
  });

  const analyzeCodeSnippet = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('//'));
    const count = lines.length;
    
    // Heuristic detection for UI feedback
    const arithmeticKeywords = ['add', 'sub', 'mul', 'div', 'math', 'calc', '+', '*', '/'];
    const dataKeywords = ['load', 'store', 'mov', 'mem', 'push', 'pop', '[', ']', 'ptr'];
    const controlKeywords = ['if', 'goto', 'jmp', 'call', 'ret', 'loop', 'for', 'while'];
    
    let aCount = 0, dCount = 0, cCount = 0;
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (arithmeticKeywords.some(k => lower.includes(k))) aCount++;
      if (dataKeywords.some(k => lower.includes(k))) dCount++;
      if (controlKeywords.some(k => lower.includes(k))) cCount++;
    });

    let type = 'Arithmetic';
    if (dCount > aCount && dCount > cCount) type = 'Data';
    if (cCount > aCount && cCount > dCount) type = 'Control';

    setFormData(prev => ({ 
      ...prev, 
      code: text,
      instruction_count: Math.max(count * 100, 100),
      operation_type: type
    }));
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          memory_usage: formData.memory_usage,
          parallelism: formData.parallelism === 'High' ? 128 : formData.parallelism === 'Medium' ? 32 : 4,
          operation_type: formData.operation_type.toLowerCase()
        })
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setTimeout(() => {
        setResults(data);
        setLoading(false);
        setActiveTab('results');
      }, 1500);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const chartData = results ? Object.entries(results.metrics).map(([name, data]) => {
    const metricsData = data as Metrics;
    return {
      name,
      time: parseFloat(metricsData.execution_time.toFixed(4)),
      speedup: parseFloat(metricsData.speedup.toFixed(2)),
      cpi: metricsData.cpi
    };
  }) : [];

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 font-sans selection:bg-blue-100">
      {/* Navigation */}
      <nav className="border-b border-slate-300 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-widest">
            {['home', 'analyze', 'results'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`transition-all hover:text-blue-600 shrink-0 ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-500'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {/* Elements Removed */}
          </div>
        </div>
      </nav>

      <main>
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-6 py-16 space-y-20"
            >
              <div className="text-center space-y-6">
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight">
                   Analyze, Compare and Optimize <br />
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                     Processor Architectures
                   </span>
                </h1>
                <p className="text-xl text-slate-500 max-w-3xl mx-auto font-medium">
                  Evaluate program characteristics like instruction count, memory usage, and parallelism to recommend the most efficient architecture using simulation.
                </p>
                <div className="pt-8">
                   <button 
                    onClick={() => setActiveTab('analyze')}
                    className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center gap-3 mx-auto shadow-2xl shadow-blue-600/40"
                   >
                     Run Simulation
                     <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {ARCHITECTURES.map((arch) => (
                  <div key={arch.id} className="bg-white border border-slate-300 p-8 rounded-3xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Cpu className="w-12 h-12 text-slate-900" />
                    </div>
                    <div className={`w-12 h-12 rounded-2xl ${arch.color} flex items-center justify-center mb-6 shadow-lg`}>
                       <Layers className="text-white w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{arch.name}</h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">{arch.description}</p>
                    <div className="flex flex-wrap gap-2">
                       <span className="px-2 py-1 bg-slate-50 text-[10px] font-bold text-blue-600 uppercase rounded border border-slate-200 tracking-tighter">
                         {arch.id === 'CPU' ? 'Sequential Processing' : arch.id === 'GPU' ? 'High Parallelism' : arch.id === 'RISC' ? 'Low CPI' : 'Complex Instructions'}
                       </span>
                    </div>
                  </div>
                ))}
              </div>

              <section className="bg-white border border-slate-300 p-12 rounded-[3.5rem] relative overflow-hidden shadow-sm">
                 <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/5 blur-[120px] rounded-full -mr-1/4"></div>
                 <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                       <h2 className="text-3xl font-bold text-slate-900">Why This System?</h2>
                       <div className="space-y-4">
                          {[
                            { title: 'Manual Selection Complexity', desc: 'Analyzing architecture manually is highly complex and time-consuming.' },
                            { title: 'Requires Hardware Access', desc: 'Hardware benchmarks require physical access; our system uses high-accuracy simulation.' },
                            { title: 'Automated Decision-making', desc: 'Our system automates the selection process by analyzing logic-purity and pipeline metrics.' }
                          ].map((item, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                               <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-blue-600 font-bold border border-slate-200">
                                 {i + 1}
                               </div>
                               <div>
                                  <h4 className="font-bold text-slate-800">{item.title}</h4>
                                  <p className="text-sm text-slate-500">{item.desc}</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white p-8 rounded-3xl border border-slate-300 space-y-2 group hover:bg-blue-50 transition-colors">
                          <Activity className="text-blue-600 w-8 h-8" />
                          <div className="text-3xl font-black text-slate-900">99%</div>
                          <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Simulation Accuracy</div>
                       </div>
                       <div className="bg-white p-8 rounded-3xl border border-slate-300 space-y-2 translate-y-8 hover:bg-purple-50 transition-colors">
                          <Gauge className="text-purple-600 w-8 h-8" />
                          <div className="text-3xl font-black text-slate-900">0.02s</div>
                          <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Calculation Time</div>
                       </div>
                    </div>
                 </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'analyze' && (
            <motion.div 
               key="analyze"
               initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
               className="max-w-6xl mx-auto px-6 py-16"
            >
              <div className="bg-white border border-slate-300 p-12 rounded-[3.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
                
                <div className="mb-10 flex items-center justify-between">
                   <div className="space-y-1">
                      <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">System Logic Analyzer</h2>
                      <p className="text-slate-500 text-sm">Input source code to extract architectural requirements.</p>
                   </div>
                </div>

                <form onSubmit={handleAnalyze} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Program Code / Pseudo-assembly</label>
                      <textarea 
                        value={formData.code}
                        onChange={e => analyzeCodeSnippet(e.target.value)}
                        placeholder="Paste your pseudo-code or assembly here..."
                        className="w-full h-80 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-mono focus:border-blue-600 focus:bg-white outline-none resize-none shadow-inner text-sm transition-all"
                      />
                      <p className="text-[10px] text-slate-400 italic">Heuristic analyzer automatically detects instruction count and operation patterns.</p>
                    </div>
                    
                    <div className="space-y-6 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Detected Instructions</label>
                          <div className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-900 font-mono text-xl shadow-sm">
                            {formData.instruction_count.toLocaleString()}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Memory Usage (MB)</label>
                          <input 
                            type="number" 
                            value={formData.memory_usage}
                            onChange={e => setFormData({...formData, memory_usage: parseInt(e.target.value)})}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-mono focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Parallelism Level</label>
                          <select 
                            value={formData.parallelism}
                            onChange={e => setFormData({...formData, parallelism: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:border-blue-600 focus:bg-white outline-none appearance-none cursor-pointer shadow-sm"
                          >
                            <option value="Low">Low (4 threads)</option>
                            <option value="Medium">Medium (32 threads)</option>
                            <option value="High">High (256+ threads)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Operation Type</label>
                          <div className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl px-6 py-4 text-blue-700 font-bold shadow-sm">
                            {formData.operation_type}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6">
                        <button 
                          disabled={loading}
                          className={`w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${loading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/30'}`}
                        >
                          {loading ? (
                            <>
                              <Activity className="w-5 h-5 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-5 h-5" />
                              Determine Architecture
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div 
               key="results"
               initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
               className="max-w-7xl mx-auto px-6 py-12 space-y-10"
            >
               {!results ? (
                 <div className="text-center py-24 bg-white border border-slate-300 rounded-[3.5rem] shadow-sm">
                   <Info className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                   <h2 className="text-2xl font-bold text-slate-900 mb-2">No Simulation Data</h2>
                   <p className="text-slate-500 mb-8 max-w-sm mx-auto">Please run an architectural analysis from the simulation panel first to populate performance metrics.</p>
                   <button 
                    onClick={() => setActiveTab('analyze')}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:scale-105 transition-all shadow-xl shadow-blue-600/20"
                   >
                     Go to Simulation Panel
                   </button>
                 </div>
               ) : (
                 <>
                   <div className="flex items-center justify-between border-b border-slate-200 pb-8">
                      <div className="space-y-1">
                        <h2 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">Simulation Results</h2>
                        <p className="text-slate-500 text-sm">Automated analysis of {results.detected_characteristics.instruction_count.toLocaleString()} instructions complete.</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('analyze')}
                        className="px-8 py-4 bg-white text-blue-600 border border-blue-600 rounded-xl font-bold transition-all hover:bg-blue-50"
                      >
                        New Simulation
                      </button>
                   </div>

               {/* Analysis Suitability Info */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="md:col-span-1 bg-white border border-slate-300 p-8 rounded-[2rem] shadow-sm space-y-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Detected Profile</h4>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-xs text-slate-500">Main Logic</span>
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-tighter">{results.detected_characteristics.operation_type}</span>
                       </div>
                       <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-xs text-slate-500">Parallel Level</span>
                          <span className="text-xs font-bold text-slate-900">{results.detected_characteristics.parallelism} Threads</span>
                       </div>
                       <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-xs text-slate-500">Estimated Mem</span>
                          <span className="text-xs font-bold text-slate-900">{results.detected_characteristics.memory_usage} MB</span>
                       </div>
                    </div>
                    
                    {results.analysis_summary && (
                      <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest underline underline-offset-4 decoration-blue-200">Logic Density Patterns</div>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                               <div className="text-[10px] text-blue-400 font-bold uppercase">Math</div>
                               <div className="text-base font-black text-blue-700">{results.analysis_summary.arithmeticHits}</div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                               <div className="text-[10px] text-purple-400 font-bold uppercase">Loops</div>
                               <div className="text-base font-black text-purple-700">{results.analysis_summary.loopHits}</div>
                            </div>
                         </div>
                      </div>
                    )}
                 </div>

                 <div className="md:col-span-3 bg-gradient-to-br from-slate-900 to-blue-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full"></div>
                    <div className="relative z-10 space-y-4">
                        <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 inline-block">
                           <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Recommended Architecture</span>
                        </div>
                        <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic drop-shadow-lg">{results.best_architecture}</h2>
                        <p className="text-blue-100 max-w-md text-lg font-medium leading-relaxed">
                          {results.best_architecture === 'GPU' 
                            ? 'Selected due to high loop-density and parallel execution potential detected in source logic.'
                            : 'Selected for high branch-complexity and sequential dependency detected in logic flow.'}
                        </p>
                    </div>
                 </div>
               </div>

               {/* Metrics comparison */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(results.metrics).map(([name, data]) => {
                     const m = data as Metrics;
                     const isBest = name === results.best_architecture;
                     return (
                       <div key={name} className={`bg-white border-2 ${isBest ? 'border-blue-600 shadow-xl shadow-blue-600/10' : 'border-slate-300 shadow-sm'} p-8 rounded-[2rem] space-y-4 transition-all hover:scale-[1.02]`}>
                         <h3 className={`text-2xl font-black italic ${isBest ? 'text-blue-600' : 'text-slate-900'}`}>{name}</h3>
                         <div className="space-y-4">
                            <div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Execution Time</div>
                               <div className="text-3xl font-black text-slate-900 tracking-tighter">{m.execution_time.toFixed(5)}s</div>
                            </div>
                            <div className="flex gap-8">
                               <div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Speedup</div>
                                  <div className={`text-lg font-black italic ${m.speedup >= 1 ? 'text-emerald-600' : 'text-red-500'}`}>{m.speedup.toFixed(2)}x</div>
                               </div>
                               <div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CPI</div>
                                  <div className="text-lg font-black text-slate-400 italic">{m.cpi.toFixed(2)}</div>
                               </div>
                            </div>
                         </div>
                       </div>
                     );
                  })}
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="bg-white border border-slate-300 p-10 rounded-[3rem] shadow-sm">
                     <h4 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2">
                       <BarChart3 className="w-5 h-5 text-blue-600" />
                       Execution Time Comparison
                     </h4>
                     <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                              <XAxis dataKey="name" stroke="#94A3B8" axisLine={false} tickLine={false} />
                              <YAxis stroke="#94A3B8" axisLine={false} tickLine={false} />
                              <Tooltip 
                                cursor={{ fill: '#F8FAFC' }}
                                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                              />
                              <Bar dataKey="time" radius={8} barSize={40}>
                                 {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === results.best_architecture ? '#2563EB' : '#1E293B'} />
                                 ))}
                              </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white border border-slate-300 p-10 rounded-[3rem] shadow-sm">
                     <h4 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        Speedup Factor (Normalized)
                     </h4>
                     <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                              <XAxis dataKey="name" stroke="#94A3B8" axisLine={false} tickLine={false} />
                              <YAxis stroke="#94A3B8" axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                              <Line type="monotone" dataKey="speedup" stroke="#8B5CF6" strokeWidth={5} dot={{ r: 6, fill: '#8B5CF6' }} activeDot={{ r: 8 }} />
                           </LineChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
             </>
           )}
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      <footer className="mt-24 py-16 border-t border-slate-300 text-center bg-white">
         <div className="flex flex-col items-center gap-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">ArchOptimizer Engine • Cycle Accurate Simulation</div>
         </div>
      </footer>
    </div>
  );
}
