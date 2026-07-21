import os
import re

file_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\LandingPage.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the DestinationLineIcon component implementation
new_icon_component = """const DestinationLineIcon = ({ label }) => {
  const config = DESTINATION_CONFIGS[label] || { type: 'hills' };
  
  const getIconPaths = () => {
    switch (config.type) {
      case 'temple':
        return (
          <>
            {/* Detailed Temple / Pagoda */}
            <path d="M32 52V40h16v12M30 40h20v-4H30v4z" />
            <path d="M33 36l3-12h8l3 12" />
            <path d="M34 24h12v-3H34v3z" />
            <path d="M36 21c0-6 4-10 4-10s4 4 4 10" />
            <path d="M40 11V6l6 2.5L40 11z" />
            <path d="M18 52h44" />
            <path d="M22 25q2-2 4 0" />
            <path d="M54 22q2-2 4 0" />
          </>
        );
      case 'beach':
        return (
          <>
            {/* Detailed Beach / Palms */}
            <path d="M28 52c2-8 8-16 16-18" />
            <path d="M44 34c-6-2-12 1-15 6M44 34c-1-6-6-10-12-9M44 34c3-6 1-11-4-13M44 34c6-3 11 0 13 6M44 34c2 5 7 7 12 4" />
            <circle cx="58" cy="20" r="5" />
            <path d="M15 52c10 2 20-2 30 0s20 2 30 0" />
            <path d="M18 48c8 2 16-2 24 0s16 2 24 0" />
            <path d="M20 16q2-2 4 0" />
          </>
        );
      case 'hills':
        return (
          <>
            {/* Detailed Mountains / Trails */}
            <path d="M12 52l14-28 12 20 16-30 14 38" />
            <path d="M26 24c4-3 10-3 14 0" />
            <circle cx="50" cy="20" r="4" />
            <path d="M20 52c5-5 10-6 15-2s12-4 15-2" />
            <path d="M22 42v-8M20 34l2-4 2 4z" />
          </>
        );
      case 'lake':
        return (
          <>
            {/* Detailed Lake / Yacht */}
            <path d="M12 52c12 2 24-2 36 0s24 2 36 0" />
            <path d="M15 48c10 2 20-2 30 0s20 2 30 0" />
            <path d="M26 38l6-8h24l6 8z" />
            <path d="M44 30V18l8 3-8 3" />
            <circle cx="28" cy="18" r="3" />
          </>
        );
      case 'villa':
        return (
          <>
            {/* Traditional Hut / Farm House */}
            <path d="M20 52h40V32L40 16 20 32z" />
            <path d="M34 52V40h12v12" />
            <path d="M27 26h5M48 26h5" />
            <path d="M48 24v-6h4v3" />
            <path d="M52 15c2-2 2-4 4-2" />
            <path d="M14 52V42c0-3 2-5 5-5s5 2 5 5v10" />
          </>
        );
      case 'fort':
        return (
          <>
            {/* Castle / Shaniwar Wada facade */}
            <path d="M15 52V32h8v4h10v-4h8v4h10v-4h8v4h8v20H15z" />
            <path d="M28 52V42h24v10" />
            <path d="M40 32V20l8 3-8 3" />
            <path d="M15 52h50" />
            <path d="M20 15q2-2 4 0" />
          </>
        );
      case 'gateway':
        return (
          <>
            {/* Detailed Gateway */}
            <path d="M18 52V28h8v-6h28v6h8v24" />
            <path d="M32 52V34c0-7 16-7 16 0v18" />
            <path d="M26 28l14-5 14 5" />
            <circle cx="40" cy="14" r="2" />
            <path d="M15 52h50" />
          </>
        );
      case 'palace':
        return (
          <>
            {/* Palace facade */}
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

# Replace the DestinationLineIcon component in LandingPage.js
content = re.sub(
    r'const DestinationLineIcon = \(\{ label \}\) => \{.*?\n\};',
    new_icon_component,
    content,
    flags=re.DOTALL
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("LandingPage custom icons successfully updated!")
