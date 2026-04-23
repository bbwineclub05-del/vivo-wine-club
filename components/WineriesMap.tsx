'use client';

import { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import type { WineRegion } from '@/lib/wineRegions';

export type { WineRegion };

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Props {
  regions: WineRegion[];
  onSelect: (region: WineRegion | null) => void;
  selected: WineRegion | null;
}

export default function WineriesMap({ regions, onSelect, selected }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ center: [8, 47], scale: 780 }}
      width={800}
      height={580}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Sea / background */}
      <rect width={800} height={580} fill="#f5e6e6" />

      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map(geo => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill="#d4848a"
              stroke="#731515"
              strokeWidth={0.45}
              style={{
                default: { outline: 'none' },
                hover:   { fill: '#c97070', outline: 'none' },
                pressed: { outline: 'none' },
              }}
            />
          ))
        }
      </Geographies>

      {regions.map(region => {
        const isSel = selected?.id === region.id;
        const isHov = hovered === region.id;
        const active = isSel || isHov;

        return (
          <Marker
            key={region.id}
            coordinates={[region.lng, region.lat]}
            onClick={() => onSelect(isSel ? null : region)}
            onMouseEnter={() => setHovered(region.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Outer white ring */}
            <circle
              r={active ? 9 : 7}
              fill="white"
              style={{ cursor: 'pointer', pointerEvents: 'none' }}
            />
            {/* Inner bordeaux dot */}
            <circle
              r={active ? 6.5 : 5}
              fill={isSel ? '#ff6644' : '#5b1a14'}
              style={{ cursor: 'pointer' }}
            />
            {/* Region label — shown on hover/selection */}
            {active && (
              <text
                textAnchor="middle"
                y={-14}
                style={{
                  fontFamily: 'var(--font-nunito, sans-serif)',
                  fontSize: 10,
                  fontWeight: 700,
                  fill: '#3a0a0a',
                  letterSpacing: '0.06em',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {region.name.toUpperCase()}
              </text>
            )}
          </Marker>
        );
      })}
    </ComposableMap>
  );
}
