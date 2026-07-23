import os
import re

file_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\LandingPage.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update DESTINATION_CONFIGS to use Google Material Symbols
new_configs = """const DESTINATION_CONFIGS = {
  'Nashik': { iconName: 'temple_hindu' },
  'Igatpuri': { iconName: 'waterfall' },
  'Trimbakeshwar': { iconName: 'temple_hindu' },
  'Bhandardara': { iconName: 'sailing' },
  'Saputara': { iconName: 'tram' },
  'Vaitarna': { iconName: 'water' },
  'Jawhar': { iconName: 'castle' },
  'Wada': { iconName: 'fort' },
  'Lonavala': { iconName: 'landscape' },
  'Mahabaleshwar': { iconName: 'nutrition' },
  'Panchgani': { iconName: 'terrain' },
  'Alibaug': { iconName: 'lighthouse' },
  'Karjat': { iconName: 'hiking' },
  'Pune': { iconName: 'fort' },
  'Mumbai': { iconName: 'location_city' },
  'Goa': { iconName: 'beach_access' }
};"""

content = re.sub(
    r'const DESTINATION_CONFIGS = \{.*?\n\};',
    new_configs,
    content,
    flags=re.DOTALL
)

# Update DestinationLineIcon to use Material Symbols overlayed on background blobs
new_icon_component = """const DestinationLineIcon = ({ label }) => {
  const config = DESTINATION_CONFIGS[label] || { iconName: 'landscape' };
  
  return (
    <div className="relative flex items-center justify-center h-16 w-20 md:h-[74px] md:w-24">
      {/* Background blobs exactly as requested */}
      <svg viewBox="0 0 80 64" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        <path d="M48 7c10 7 12 20 7 34s-19 14-29 9S15 32 25 20 38 0 48 7z" fill="#F3A5AD" opacity="0.9" />
        <path d="M56 10c9 10 7 28-2 39s-24 11-30 2 3-20 12-29S47 0 56 10z" fill="#FFD4A6" opacity="0.9" />
      </svg>
      
      {/* Real Google Material Symbol */}
      <span className="material-symbols-outlined text-[32px] md:text-[36px] text-[#1F1F1F] font-light relative z-10 select-none">
        {config.iconName}
      </span>
    </div>
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
print("LandingPage updated to use Google Material Symbols successfully!")
