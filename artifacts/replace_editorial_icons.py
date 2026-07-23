import os
import re

file_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\LandingPage.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update the config dictionary
new_configs = """const DESTINATION_CONFIGS = {
  'Nashik': { type: 'temple_grapes' },
  'Igatpuri': { type: 'waterfall' },
  'Trimbakeshwar': { type: 'jyotirlinga' },
  'Bhandardara': { type: 'arthur_lake' },
  'Saputara': { type: 'ropeway' },
  'Vaitarna': { type: 'lake' },
  'Jawhar': { type: 'palace' },
  'Wada': { type: 'fort' },
  'Lonavala': { type: 'tiger_point' },
  'Mahabaleshwar': { type: 'strawberries' },
  'Panchgani': { type: 'table_land' },
  'Alibaug': { type: 'lighthouse' },
  'Karjat': { type: 'river_trek' },
  'Pune': { type: 'shaniwar_wada' },
  'Mumbai': { type: 'gateway_skyline' },
  'Goa': { type: 'coconut_beach' }
};"""

content = re.sub(
    r'const DESTINATION_CONFIGS = \{.*?\n\};',
    new_configs,
    content,
    flags=re.DOTALL
)

# Update the icon component paths
new_icon_component = """const DestinationLineIcon = ({ label }) => {
  const config = DESTINATION_CONFIGS[label] || { type: 'hills' };
  
  const getIconPaths = () => {
    switch (config.type) {
      case 'temple_grapes':
        return (
          <>
            {/* Nashik: Temple + Grapes */}
            <path d="M16 52V38h12v14M18 38c0-8 5-15 5-21 0 6 5 13 5 21" />
            <path d="M23 17V12l4 2.5-4 2.5z" />
            <circle cx="40" cy="26" r="2" />
            <circle cx="44" cy="26" r="2" />
            <circle cx="42" cy="30" r="2" />
            <circle cx="46" cy="30" r="2" />
            <circle cx="44" cy="34" r="2" />
            <path d="M38 20c2-1 4-1 5 1" />
          </>
        );
      case 'waterfall':
        return (
          <>
            {/* Igatpuri: Waterfall */}
            <path d="M12 52l14-26 10 18 14-28 14 36" />
            <path d="M34 46c-2-8-4-12-4-20" />
            <path d="M32 46c1-6 2-10 2-15" />
            <path d="M12 52c10 2 20-2 30 0s20 2 30 0" />
          </>
        );
      case 'jyotirlinga':
        return (
          <>
            {/* Trimbakeshwar: Jyotirlinga Temple */}
            <path d="M30 45h20v4H30v-4z" />
            <path d="M34 45c0-6 4-10 6-10s6 4 6 10" />
            <path d="M22 52h36" />
            <path d="M24 52V24m-4 0c2 4 6 4 8 0m-4-6v6" />
          </>
        );
      case 'arthur_lake':
        return (
          <>
            {/* Bhandardara: Arthur Lake */}
            <path d="M12 45l10-18 10 16 12-24 16 26" />
            <path d="M12 52c10 2 20-2 30 0s20 2 30 0" />
            <path d="M46 45l4-6h14l4 6z" />
            <path d="M57 39V28l6 3-6 3" />
          </>
        );
      case 'ropeway':
        return (
          <>
            {/* Saputara: Ropeway */}
            <path d="M12 52l12-20m32 20l-12-24" />
            <path d="M12 22l56 12" />
            <rect x="36" y="27" width="12" height="10" rx="2" />
            <path d="M42 27v-3M38 32h8M39 37h6" />
          </>
        );
      case 'lake':
        return (
          <>
            {/* Vaitarna: Lake */}
            <path d="M12 44c10-8 18-8 28 0m12 0c10-8 18-8 28 0" />
            <path d="M34 32a6 6 0 0112 0" />
            <path d="M12 52c10 2 20-2 30 0s20 2 30 0" />
            <path d="M18 48c8 2 16-2 24 0s16 2 24 0" />
          </>
        );
      case 'palace':
        return (
          <>
            {/* Jawhar: Palace */}
            <path d="M18 52h44V34H18z" />
            <path d="M26 34c0-8 6-12 6-12s6 4 6 12M42 34c0-8 6-12 6-12s6 4 6 12" />
            <path d="M32 52V42h16v10" />
          </>
        );
      case 'fort':
        return (
          <>
            {/* Wada: Historic Fort */}
            <path d="M15 52V30h8v4h10v-4h8v4h10v-4h8v26" />
            <path d="M28 52V42h24v10" />
          </>
        );
      case 'tiger_point':
        return (
          <>
            {/* Lonavala: Tiger Point */}
            <path d="M12 52c10-15 15-25 30-30l30 4" />
            <path d="M12 36l30-10m-30 5l30-10" />
            <path d="M14 44c4 2 10 0 12-2s4-6 8-6h10" />
          </>
        );
      case 'strawberries':
        return (
          <>
            {/* Mahabaleshwar: Strawberries */}
            <path d="M40 48c-10 0-14-14-14-22 0-5 5-8 14-8s14 3 14 8c0 8-4 22-14 22z" />
            <path d="M40 18c-3-3-8-2-10 1M40 18c3-3 8-2 10 1M40 18v-4" />
            <circle cx="34" cy="24" r="0.5" />
            <circle cx="46" cy="24" r="0.5" />
            <circle cx="40" cy="28" r="0.5" />
            <circle cx="34" cy="32" r="0.5" />
            <circle cx="46" cy="32" r="0.5" />
            <circle cx="40" cy="36" r="0.5" />
          </>
        );
      case 'table_land':
        return (
          <>
            {/* Panchgani: Table Land */}
            <path d="M12 52h24l6-8h26" />
            <path d="M28 22c5-5 15-5 20 0l-5 12-5-12z" />
            <path d="M33 22l5 12M43 22l-5 12" />
            <circle cx="38" cy="34" r="1.5" />
          </>
        );
      case 'lighthouse':
        return (
          <>
            {/* Alibaug: Lighthouse */}
            <path d="M36 52l4-28h8l4 28z" />
            <path d="M38 24h12v-4H38v4z" />
            <path d="M34 20L20 15m22 5L20 22m28-2l14-5m-10 7l10 2" />
            <path d="M12 52c10 2 20-2 30 0s20 2 30 0" />
          </>
        );
      case 'river_trek':
        return (
          <>
            {/* Karjat: River + Trek */}
            <path d="M12 44l16-24 10 15 16-26 14 35" />
            <path d="M36 38c-2 4-6 6-4 10s8 2 6 6" />
            <path d="M35 39c-2 4-6 6-4 10s8 2 6 6" />
          </>
        );
      case 'shaniwar_wada':
        return (
          <>
            {/* Pune: Shaniwar Wada */}
            <path d="M22 52V24h36v28" />
            <path d="M34 52V34h12v18" />
            <path d="M22 24l18-8 18 8" />
            <path d="M28 24v28M34 24v10M46 24v10M52 24v28" />
          </>
        );
      case 'gateway_skyline':
        return (
          <>
            {/* Mumbai: Gateway + Skyline */}
            <path d="M15 52V30h6v-4h18v4h6v22" />
            <path d="M25 52V36c0-5 10-5 10 0v16" />
            <path d="M48 52V20h10v32" />
            <path d="M58 52V14h10v38" />
            <rect x="51" y="24" width="4" height="6" />
            <rect x="61" y="18" width="4" height="6" />
          </>
        );
      case 'coconut_beach':
        return (
          <>
            {/* Goa: Coconut Beach */}
            <path d="M22 52c2-8 8-16 16-18" />
            <path d="M38 34c-6-2-12 1-15 6M38 34c-1-6-6-10-12-9M38 34c3-6 1-11-4-13M38 34c6-3 11 0 13 6M38 34c2 5 7 7 12 4" />
            <path d="M46 48l12-4 6 6" />
            <path d="M50 47l3-6" />
            <path d="M12 52c10 2 20-2 30 0s20 2 30 0" />
          </>
        );
      default:
        return <path d="M14 50 31 18l12 20 7-12 16 24" />;
    }
  };

  return (
    <svg viewBox="0 0 80 64" className="h-16 w-20 md:h-[74px] md:w-24" fill="none" aria-hidden="true">
      <path d="M48 7c10 7 12 20 7 34s-19 14-29 9S15 32 25 20 38 0 48 7z" fill="#F3A5AD" opacity="0.9" />
      <path d="M56 10c9 10 7 28-2 39s-24 11-30 2 3-20 12-29S47 0 56 10z" fill="#FFD4A6" opacity="0.9" />
      <g stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {getIconPaths()}
      </g>
    </svg>
  );
};"""

content = re.sub(
    r'const DestinationLineIcon = \(\{ label \}\) => \{.*?\n\};',
    new_icon_component,
    content,
    flags=re.DOTALL
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Editorial luxury icons successfully updated!")
