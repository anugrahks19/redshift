import React, { useState, useEffect } from 'react';
import { EarthCanvas } from './components/canvas/EarthCanvas';
import { soundEngine } from './audio/soundEngine';
import { ANALOG_SITES } from './data/analogData';
import { AnalogSite } from './types';
import { 
  Volume2, VolumeX, ArrowDown, ArrowUp, Compass, 
  MapPin, ShieldCheck, Terminal, X, ChevronRight, FileDown,
  Layers, CheckCircle2, AlertTriangle, Radio
} from 'lucide-react';

export const App: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [utcTime, setUtcTime] = useState('');
  const [selectedSite, setSelectedSite] = useState<AnalogSite | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Track window scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAudio = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleExportReport = (site: AnalogSite) => {
    soundEngine.playTransitionSound(440, 880);
    setIsExporting(true);
    setExportNotice(`Exporting ${site.shortCode} assessment dossier...`);

    setTimeout(() => {
      const report = `NASA SPACE APPS CHALLENGE 2026 // TERRESTRIAL ANALOG DOSSIER
================================================================================
Generated: ${new Date().toISOString()}
Analog Site: ${site.name} (${site.country})
Short Code: ${site.shortCode}
Coordinates: ${site.lat}°N, ${site.lng}°E
Target Planetary Feature: ${site.planetTarget} — ${site.targetFeatureName}

1. SURFACE & GEOLOGICAL FIDELITY
- Elevation: ${site.elevationMeters}m (Target: ${site.targetElevationMeters}m)
- Mean Slope: ${site.meanSlopeDeg}° (Target: ${site.targetSlopeDeg}°)
- RMS Surface Roughness (Ra): ${site.roughnessRa}m (Target: ${site.targetRoughnessRa}m)
- Mean Temperature: ${site.meanTempC}°C (Target: ${site.targetMeanTempC}°C)
- Primary Lithology: ${site.primaryLithology}
- Key Minerals: ${site.keyMinerals.join(', ')}

2. SCIENTIFIC EVIDENCE FIDELITY SCORE: ${site.scientificFidelity}%
Analog Correspondence:
${site.analogyStrengths.map(s => '  + ' + s).join('\n')}
Limitation Boundaries:
${site.analogyLimitations.map(l => '  - ' + l).join('\n')}

3. OPERATIONAL FIELD FEASIBILITY SCORE: ${site.fieldFeasibility}%
- Readiness Classification: ${site.readinessTier}
- Responsible Authority: ${site.permitAuthority}
- Logistical Travel Difficulty: ${site.travelDifficulty}
- Operational Weather Window: ${site.seasonalWindow}
- Documented Hazards: ${site.hazards.join(', ')}

4. OPEN DATA PROVENANCE
- Associated Missions: ${site.missions.join(', ')}
- Source Datasets: ${site.datasets.join(', ')}
- Spatial Ground Resolution: ${site.resolutionInfo}
================================================================================
`;
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ASTRATERRA_${site.shortCode}_DOSSIER.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      setExportNotice('Dossier downloaded successfully.');
      setTimeout(() => setExportNotice(null), 3500);
    }, 1000);
  };

  const scrollToTop = () => {
    soundEngine.playTransitionSound(300, 600);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-obsidian-950 text-slate-100 font-body selection:bg-sky-500 selection:text-black">
      {/* 1. 3D Revolving Earth at the Center */}
      <EarthCanvas scrollY={scrollY} />

      {/* 2. Top Minimalist Header */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 sm:px-12 py-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="relative w-7 h-7 rounded-full border border-sky-400/40 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping absolute opacity-70"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm tracking-widestx text-white">
              TERRA // ASTRIS
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
              NASA Space Apps 2026
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-5 pointer-events-auto">
          <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-400 bg-obsidian-950/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>ORBITAL TELEMETRY</span>
            <span className="text-slate-600">//</span>
            <span className="text-slate-200 font-mono">{utcTime}</span>
          </div>

          <button
            onClick={handleToggleAudio}
            onMouseEnter={() => soundEngine.playHover()}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-mono border backdrop-blur-md transition-all ${
              !isMuted
                ? 'border-sky-400/60 bg-sky-500/15 text-sky-300 shadow-glow-cyan'
                : 'border-white/10 bg-obsidian-950/70 text-slate-400 hover:text-white hover:border-white/25'
            }`}
            title="Toggle synthesized procedural soundscape"
            aria-label="Toggle sound"
          >
            {!isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden md:inline text-[10px] tracking-wider uppercase">
              {!isMuted ? 'SOUND: ON' : 'SOUND: OFF'}
            </span>
          </button>
        </div>
      </header>

      {/* 3. Section 1: Hero Viewport (The Earth at the Centre) */}
      <section className="relative min-h-screen flex flex-col justify-between items-center text-center px-6 pt-32 pb-14 z-10 pointer-events-none">
        {/* Top Tagline */}
        <div className="max-w-xl mx-auto pointer-events-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-sky-400/30 bg-obsidian-950/70 backdrop-blur-md text-sky-300 text-xs font-mono tracking-widest uppercase mb-4">
            <span>PERMANENT MOON BASE &amp; MARS ANALOG DISCOVERY</span>
          </div>
          <h1 className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-white uppercase leading-[0.95]">
            TERRA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-slate-200 to-amber-200">
              ASTRIS
            </span>
          </h1>
        </div>

        {/* Center Space for the revolving 3D Earth */}
        <div className="my-auto py-12" aria-hidden="true">
          {/* Earth renders behind via fixed canvas */}
        </div>

        {/* Bottom Scroll Prompt */}
        <div className="flex flex-col items-center space-y-2 pointer-events-auto animate-bounce">
          <span className="font-mono text-[10px] uppercase tracking-cosmic text-slate-400">
            SCROLL TO DESCEND INTO THE DARK
          </span>
          <ArrowDown className="w-4 h-4 text-sky-400" />
        </div>
      </section>

      {/* 4. The Slow Fading Darkness Veil ("fading to the down dark filing slowly") */}
      <div 
        className="relative z-20 pointer-events-none transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(3,4,6,0.3) 15%, rgba(3,4,6,0.7) 40%, rgba(3,4,6,0.96) 70%, #030406 100%)',
          height: '40vh',
          marginTop: '-20vh',
        }}
      />

      {/* 5. In the Dark ("and in the dark put some text") */}
      <section className="relative z-20 bg-obsidian-950 px-6 sm:px-12 lg:px-24 pt-12 pb-36 max-w-7xl mx-auto space-y-36">
        {/* Act I: The Core Thesis in the Dark */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex items-center justify-center space-x-3 text-xs font-mono text-slate-500 tracking-cosmic uppercase">
            <span className="w-8 h-px bg-slate-700"></span>
            <span>GROUND TRUTH FOR THE NEXT WORLDS</span>
            <span className="w-8 h-px bg-slate-700"></span>
          </div>

          <h2 className="font-display font-bold text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-[1.05] uppercase">
            TO REACH THE MOON &amp; MARS, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-slate-100 to-amber-300">
              WE MUST FIRST DECIPHER OUR OWN.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 font-light leading-relaxed max-w-2xl mx-auto">
            Selecting permanent lunar settlements and Martian landing sites depends on topography, roughness, lithology, and operational safety. 
            Earth is our most accessible laboratory. By identifying terrestrial environments that mirror extraterrestrial processes, 
            scientists and engineers stress-test equipment, algorithms, and astronauts before they fly.
          </p>
        </div>

        {/* Act II: The Terrestrial Analogs in the Dark */}
        <div>
          <div className="flex items-center space-x-3 text-xs font-mono text-slate-500 tracking-cosmic uppercase mb-8">
            <span className="w-6 h-px bg-sky-400"></span>
            <span>DISCOVERED TERRESTRIAL ANALOGS // OPEN DATA RECONNAISSANCE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ANALOG_SITES.map((site) => (
              <div
                key={site.id}
                className="group relative glass-panel rounded-xl p-8 border border-white/10 hover:border-sky-400/40 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl overflow-hidden flex flex-col justify-between"
                onMouseEnter={() => soundEngine.playHover()}
              >
                {/* Subtle Ambient Background image */}
                <div 
                  className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-cover bg-center"
                  style={{ backgroundImage: `url(${site.imageThumbnail})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-obsidian-950/90 via-obsidian-900/95 to-obsidian-950 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 text-xs font-mono">
                    <span className="text-sky-400 font-bold">{site.shortCode}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] uppercase">
                      {site.planetTarget} ANALOG
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-2xl text-white mb-1 group-hover:text-sky-300 transition-colors">
                    {site.name}
                  </h3>
                  <p className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    <span>TARGET: {site.targetFeatureName}</span>
                  </p>

                  <p className="text-sm text-slate-300 font-light leading-relaxed mb-6">
                    {site.analogyStrengths[0]}
                  </p>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 text-[11px] font-mono text-slate-400 mb-6">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">ELEVATION</span>
                      <span className="text-slate-200 font-medium">{site.elevationMeters}m</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">SLOPE</span>
                      <span className="text-slate-200 font-medium">{site.meanSlopeDeg}°</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">FIDELITY</span>
                      <span className="text-emerald-400 font-medium">{site.scientificFidelity}%</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 pt-2 flex items-center justify-between">
                  <button
                    onClick={() => {
                      soundEngine.playTransitionSound(350, 700);
                      setSelectedSite(site);
                    }}
                    className="flex items-center space-x-2 text-xs font-mono text-sky-400 hover:text-white uppercase tracking-wider group-hover:underline"
                  >
                    <span>AUDIT RECONNAISSANCE DOSSIER</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {site.country}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Act III: The Evidence-to-Field Readiness Framework */}
        <div className="glass-panel rounded-2xl p-8 sm:p-14 border border-white/10 relative overflow-hidden">
          <div className="flex items-center space-x-3 text-xs font-mono text-emerald-400 tracking-cosmic uppercase mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>THE EVIDENCE-TO-FIELD READINESS MATRIX</span>
          </div>

          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight uppercase mb-6 max-w-3xl leading-[1.05]">
            NOT JUST PLACES THAT LOOK LIKE MARS. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-sky-300">
              GROUNDED EVIDENCE &amp; LOGISTICAL FEASIBILITY.
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-300 font-light leading-relaxed mb-8">
            <div className="space-y-3">
              <strong className="text-white block font-mono text-xs uppercase text-emerald-300">
                AXIS 1: SCIENTIFIC EVIDENCE FIDELITY
              </strong>
              <p>
                Characterizing rock mineralogy, surface roughness ($Ra$), and crater morphology through open satellite radar, 
                multispectral imagery (Sentinel-2, Landsat-9, HiRISE), and ground-truthed spectrometer logs.
              </p>
            </div>

            <div className="space-y-3">
              <strong className="text-white block font-mono text-xs uppercase text-sky-300">
                AXIS 2: OPERATIONAL FIELD FEASIBILITY
              </strong>
              <p>
                Evaluating sovereign permit requirements, indigenous conservation protected areas, 
                heavy equipment transport corridors, seasonal Arctic/desert weather windows, and environmental safety constraints.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
            <span>NASA PDS · ESA PSA · ISRO PRADAN · COPERNICUS HUB</span>
            <span className="text-slate-200 font-bold uppercase">100% OPEN REPRODUCIBLE METHODOLOGY</span>
          </div>
        </div>

        {/* Act IV: Return to Orbit & Footer Manifesto */}
        <div className="border-t border-white/10 pt-16 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-500 gap-6">
          <div className="flex flex-col space-y-1">
            <span className="text-white font-display font-bold tracking-widest text-sm">TERRA // ASTRIS</span>
            <span>NASA Space Apps Challenge 2026</span>
          </div>

          <button
            onClick={scrollToTop}
            onMouseEnter={() => soundEngine.playHover()}
            className="flex items-center space-x-2 text-sky-400 hover:text-white transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
            <span>RETURN TO THE REVOLVING EARTH</span>
          </button>
        </div>
      </section>

      {/* 6. Selected Analog Site Audit Modal */}
      {selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-obsidian-950/90 backdrop-blur-2xl animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-obsidian-900 border border-white/15 rounded-xl p-6 sm:p-8 overflow-y-auto shadow-2xl flex flex-col justify-between">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 font-mono text-xs font-bold">
                    {selectedSite.shortCode}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {selectedSite.region}, {selectedSite.country}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedSite(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1">
                {selectedSite.name}
              </h3>
              <p className="text-xs font-mono text-orange-400 uppercase tracking-wider mb-6">
                PLANETARY CORRESPONDENCE: {selectedSite.planetTarget} // {selectedSite.targetFeatureName}
              </p>

              {/* Landscape Image */}
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-white/10 mb-6">
                <img
                  src={selectedSite.imageThumbnail}
                  alt={selectedSite.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950/80 to-transparent" />
                <div className="absolute bottom-3 left-3 text-[11px] font-mono text-slate-300">
                  <span>Ground Resolution: {selectedSite.resolutionInfo}</span>
                </div>
              </div>

              {/* Comparative Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono mb-6">
                <div className="p-3 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 text-[10px] block uppercase">Elevation</span>
                  <span className="text-white font-bold">{selectedSite.elevationMeters}m</span>
                  <span className="text-slate-500 block text-[9px]">Target: {selectedSite.targetElevationMeters}m</span>
                </div>
                <div className="p-3 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 text-[10px] block uppercase">Mean Slope</span>
                  <span className="text-sky-300 font-bold">{selectedSite.meanSlopeDeg}°</span>
                  <span className="text-slate-500 block text-[9px]">Target: {selectedSite.targetSlopeDeg}°</span>
                </div>
                <div className="p-3 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 text-[10px] block uppercase">Roughness (Ra)</span>
                  <span className="text-amber-300 font-bold">{selectedSite.roughnessRa}m</span>
                  <span className="text-slate-500 block text-[9px]">Target: {selectedSite.targetRoughnessRa}m</span>
                </div>
                <div className="p-3 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 text-[10px] block uppercase">Fidelity</span>
                  <span className="text-emerald-400 font-bold">{selectedSite.scientificFidelity}%</span>
                  <span className="text-slate-500 block text-[9px]">Feasibility: {selectedSite.fieldFeasibility}%</span>
                </div>
              </div>

              {/* Strengths & Limitations */}
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WHERE THE ANALOGY HOLDS</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-light">
                    {selectedSite.analogyStrengths.map((str, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-400 font-mono mt-0.5">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-mono text-rose-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>WHERE EARTH LIMITS APPLY</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-light">
                    {selectedSite.analogyLimitations.map((lim, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-rose-400 font-mono mt-0.5">•</span>
                        <span>{lim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Feasibility Logistics */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-xs font-mono space-y-1.5 text-slate-300 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500">Permit Authority:</span>
                  <span className="text-slate-200">{selectedSite.permitAuthority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Weather Window:</span>
                  <span className="text-slate-200">{selectedSite.seasonalWindow}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Documented Hazards:</span>
                  <span className="text-amber-400">{selectedSite.hazards.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              {exportNotice ? (
                <span className="text-xs font-mono text-emerald-400">{exportNotice}</span>
              ) : (
                <span className="text-[11px] font-mono text-slate-500">
                  DATA PROVENANCE: {selectedSite.datasets[0]}
                </span>
              )}

              <button
                onClick={() => handleExportReport(selectedSite)}
                disabled={isExporting}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono hover:bg-emerald-500/30 transition-all font-medium"
              >
                <FileDown className="w-4 h-4" />
                <span>{isExporting ? 'COMPILING DOSSIER...' : 'EXPORT DOSSIER (.TXT)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
