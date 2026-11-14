import React from 'react';
import { Link } from 'react-router-dom';
import { usePlatformContext } from '../context/PlatformContext';
import { ANALOG_SITES } from '../data/analogSites';
import { PLANETARY_REGIONS } from '../data/planetaryRegions';

export const HomePage: React.FC = () => {
  const { targetPlanet, selectedPlanetaryRegionId, selectedEarthSiteId } = usePlatformContext();
  const activeRegion = PLANETARY_REGIONS.find(region => region.id === selectedPlanetaryRegionId) ?? PLANETARY_REGIONS[0]!;
  const activeSite = ANALOG_SITES.find(site => site.id === selectedEarthSiteId) ?? ANALOG_SITES[0]!;

  return <main id="main-content" className="analog-home">
    <section className="analog-intro container" aria-labelledby="analog-title">
      <div className="analog-intro-copy">
        <span className="analog-overline"><span className="analog-line" /> NASA SPACE APPS CHALLENGE / 2026</span>
        <h1 id="analog-title">Explore the worlds beyond Earth. <span>Start here.</span></h1>
        <p>Earth's most extreme landscapes are field stations for future Moon and Mars missions. Discover the connections, then test them against scientific evidence.</p>
        <div className="analog-intro-actions">
          <Link to="/explore" className="analog-primary-link">Explore analog sites <span aria-hidden="true">↗</span></Link>
          <Link to="/research" className="analog-secondary-link">Open research workspace <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <div className="analog-intro-visual" aria-label="Mars and Earth terrain imagery">
        <div className="analog-image analog-image-mars"><img src="/data/terrains/gale-hirise.jpg" alt="Gale Crater terrain on Mars" /><span>01 / MARS · GALE CRATER</span></div>
        <div className="analog-image analog-image-earth"><img src="/data/terrains/yungay-imagery.jpg" alt="Yungay Station terrain in Chile" /><span>02 / EARTH · ATACAMA DESERT</span></div>
      </div>
    </section>

    <section className="analog-paths" aria-labelledby="paths-title">
      <div className="container">
        <div className="analog-section-head"><span className="analog-overline"><span className="analog-line" /> TWO WAYS TO INVESTIGATE</span><h2 id="paths-title">From discovery to evidence.</h2></div>
        <div className="analog-path-grid">
          <Link to="/explore" className="analog-path-card">
            <span className="analog-card-number">01 / VISUAL DISCOVERY</span>
            <h3>Explore</h3>
            <p>Choose the Moon or Mars. Inspect a planetary region and find terrestrial sites that share relevant terrain and geology.</p>
            <span className="analog-card-foot"><span>MAPS · LOCATIONS · ANALOG SITES</span><strong aria-hidden="true">↗</strong></span>
          </Link>
          <Link to="/research" className="analog-path-card">
            <span className="analog-card-number">02 / SCIENTIFIC EVALUATION</span>
            <h3>Research</h3>
            <p>Compare paired locations with terrain data, site metadata, evidence, and clearly marked gaps in coverage.</p>
            <span className="analog-card-foot"><span>GIS · COMPARISON · FEASIBILITY</span><strong aria-hidden="true">↗</strong></span>
          </Link>
        </div>
        <div className="analog-context">
          <span>CURRENT INVESTIGATION</span>
          <strong>{targetPlanet.toUpperCase()} / {activeRegion.shortName}</strong>
          <span className="analog-context-arrow" aria-hidden="true">↔</span>
          <strong>EARTH / {activeSite.name}</strong>
        </div>
      </div>
    </section>
    <footer className="analog-footer container"><span>ASTRATERRA ANALOG</span><span>EXPLORE · INVESTIGATE · DISCOVER</span><Link to="/learn">Field notes ↗</Link></footer>
  </main>;
};
