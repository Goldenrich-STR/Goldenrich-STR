import os
import re

file_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\LandingPage.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Define the config dictionary and new list of shortcuts
configs_and_shortcuts = """const DESTINATION_CONFIGS = {
  'Nashik': { type: 'temple' },
  'Igatpuri': { type: 'temple' },
  'Trimbakeshwar': { type: 'temple' },
  'Bhandardara': { type: 'lake' },
  'Saputara': { type: 'hills' },
  'Vaitarna': { type: 'lake' },
  'Jawhar': { type: 'palace' },
  'Wada': { type: 'villa' },
  'Lonavala': { type: 'hills' },
  'Mahabaleshwar': { type: 'hills' },
  'Panchgani': { type: 'hills' },
  'Alibaug': { type: 'beach' },
  'Karjat': { type: 'villa' },
  'Pune': { type: 'fort' },
  'Mumbai': { type: 'gateway' },
  'Goa': { type: 'beach' }
};

const DESTINATION_SHORTCUTS = [
  'Nashik',
  'Igatpuri',
  'Trimbakeshwar',
  'Bhandardara',
  'Saputara',
  'Vaitarna',
  'Jawhar',
  'Wada',
  'Lonavala',
  'Mahabaleshwar',
  'Panchgani',
  'Alibaug',
  'Karjat',
  'Pune',
  'Mumbai',
  'Goa'
];"""

# Find the old DESTINATION_SHORTCUTS and replace it with the new definition including the configs
content = re.sub(
    r'const DESTINATION_SHORTCUTS = \[\s*[^\]]*\];',
    configs_and_shortcuts,
    content
)

# Replace the DestinationLineIcon function
new_icon_component = """const DestinationLineIcon = ({ label }) => {
  const config = DESTINATION_CONFIGS[label] || { type: 'hills' };
  
  const getIconPaths = () => {
    switch (config.type) {
      case 'temple':
        return (
          <>
            {/* Stepped base & shikhara spire */}
            <path d="M22 52h36M26 52V42h28v10M30 42c0-15 10-25 10-32 0 7 10 17 10 32" />
            <path d="M40 10l8 3-8 3" /> {/* Flag */}
            <path d="M34 42h12M32 47h16M37 34h6" />
          </>
        );
      case 'beach':
        return (
          <>
            {/* Waves */}
            <path d="M15 52c10 2 20-2 30 0s20 2 30 0" />
            <path d="M18 48c8 2 16-2 24 0s16 2 24 0" />
            {/* Palm Tree */}
            <path d="M28 50c3-10 10-18 18-20" />
            <path d="M46 30c-6-2-12 1-15 6M46 30c-1-6-6-10-12-9M46 30c3-6 1-11-4-13M46 30c6-3 11 0 13 6M46 30c2 5 7 7 12 4" />
            {/* Sun */}
            <circle cx="58" cy="18" r="5" />
          </>
        );
      case 'hills':
        return (
          <>
            {/* Curved mountain peaks */}
            <path d="M12 52l15-28 10 18 13-26 18 36" />
            {/* Clouds */}
            <path d="M42 22c2-2 6-2 8 0s2 4 0 6H42z" />
            <path d="M18 28c1.5-1.5 4.5-1.5 6 0s1.5 3 0 4.5H18z" />
          </>
        );
      case 'lake':
        return (
          <>
            {/* Waves */}
            <path d="M12 52c12 2 24-2 36 0s24 2 36 0" />
            <path d="M15 48c10 2 20-2 30 0s20 2 30 0" />
            {/* Yacht/Boat */}
            <path d="M26 38l6-8h24l6 8z" />
            <path d="M44 30V18l8 3-8 3" />
          </>
        );
      case 'villa':
        return (
          <>
            {/* Traditional Stay / Hut */}
            <path d="M20 52h40V32L40 16 20 32z" />
            <path d="M34 52V40h12v12" />
            <path d="M27 26h5M48 26h5" />
            {/* Trees in background */}
            <path d="M14 52V42c0-3 2-5 5-5s5 2 5 5v10" />
          </>
        );
      case 'fort':
        return (
          <>
            {/* Fort wall and turrets */}
            <path d="M15 52V32h8v4h10v-4h8v4h10v-4h8v4h8v20H15z" />
            <path d="M28 52V42h24v10" />
            <path d="M40 32V20l8 3-8 3" />
          </>
        );
      case 'gateway':
        return (
          <>
            {/* Gateway of India style arch */}
            <path d="M18 52V28h8v-6h28v6h8v24" />
            <path d="M32 52V34c0-7 16-7 16 0v18" />
            <path d="M26 28l14-5 14 5" />
            <circle cx="40" cy="14" r="2" />
          </>
        );
      case 'palace':
        return (
          <>
            {/* Domed heritage structure */}
            <path d="M15 52h50M20 52V36h40v16" />
            <path d="M30 36c0-10 20-10 20 0" />
            <path d="M34 52V42h12v10" />
            <path d="M25 42h4M51 42h4" />
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

# Replace the DestinationLineIcon component implementation
content = re.sub(
    r'const DestinationLineIcon = \(\{ variant = 0 \}\) => \{.*?\n\};',
    new_icon_component,
    content,
    flags=re.DOTALL
)

# Replace <DestinationLineIcon variant={index} /> in JSX
content = content.replace(
    "<DestinationLineIcon variant={index} />",
    "<DestinationLineIcon label={label} />"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("LandingPage destination updates applied successfully!")
