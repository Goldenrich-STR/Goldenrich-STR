import os
import re

landing_page_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\LandingPage.js"
guest_browse_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\GuestBrowse.js"

# --- 1. EDIT LANDINGPAGE.JS ---
with open(landing_page_path, "r", encoding="utf-8") as f:
    landing_content = f.read()

# Add Crown to Lucide imports in LandingPage.js
landing_content = landing_content.replace(
    "import { Building2,",
    "import { Crown, Building2,"
)

# Reorder PREMIUM_COLLECTIONS so hilltop-retreats (Signature Series) is the second item
# Let's extract the list content and rearrange it
# First, let's find the signature series item block:
signature_item_pattern = r"\{\s*id:\s*'hilltop-retreats',.*?\n\s*\}"
match = re.search(signature_item_pattern, landing_content, re.DOTALL)
if match:
    signature_block = match.group(0)
    # Remove signature block from its old position
    landing_content = re.sub(signature_item_pattern + r",?\s*", "", landing_content, flags=re.DOTALL)
    
    # Insert it right after the first item (luxury-villas) in PREMIUM_COLLECTIONS
    # Find the end of luxury-villas block
    villas_pattern = r"\{\s*id:\s*'luxury-villas',.*?\n\s*\}"
    villas_match = re.search(villas_pattern, landing_content, re.DOTALL)
    if villas_match:
        end_idx = villas_match.end()
        # Insert signature_block after villas_block
        landing_content = (
            landing_content[:end_idx] +
            ",\n  " + signature_block +
            landing_content[end_idx:]
        )

# Replace the Tag badge rendering in CollectionsSection to render Gold Crown component
old_tag_badge = """                    {/* Tag badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-white/95 text-charcoal text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                        {col.tag}
                      </span>
                    </div>"""

new_tag_badge = """                    {/* Tag badge */}
                    <div className="absolute top-4 left-4 z-10">
                      {col.tag === 'Signature Series' ? (
                        <div className="bg-black border border-[#D4AF37]/50 px-3 py-1 rounded-none shadow-md flex items-center gap-1.5">
                          <Crown className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]/20" />
                          <span className="text-[#D4AF37] text-[9px] font-extrabold uppercase tracking-[0.15em] font-serif">
                            Signature Series
                          </span>
                        </div>
                      ) : (
                        <span className="bg-white/95 text-charcoal text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                          {col.tag}
                        </span>
                      )}
                    </div>"""

landing_content = landing_content.replace(old_tag_badge, new_tag_badge)

with open(landing_page_path, "w", encoding="utf-8") as f:
    f.write(landing_content)
print("LandingPage.js reordered & Crown icon integrated!")


# --- 2. EDIT GUESTBROWSE.JS ---
with open(guest_browse_path, "r", encoding="utf-8") as f:
    browse_content = f.read()

# Add Crown to Lucide imports in GuestBrowse.js
browse_content = browse_content.replace(
    "import {\n  Building2,",
    "import {\n  Crown,\n  Building2,"
)

# Replace browser badge emoji 👑 with the Lucide Crown icon
old_browse_badge = """      <div className="absolute top-4 left-4 flex gap-2">
         {property.price_per_night >= 50000 ? (
           <div className="bg-black border border-[#D4AF37]/50 px-3 py-1 rounded-none shadow-md flex items-center gap-1">
             <span className="text-[#D4AF37] text-[10px] font-extrabold uppercase tracking-[0.2em] flex items-center gap-1 font-serif">
               👑 Signature Series
             </span>
           </div>
         ) : ("""

new_browse_badge = """      <div className="absolute top-4 left-4 flex gap-2">
         {property.price_per_night >= 50000 ? (
           <div className="bg-black border border-[#D4AF37]/50 px-3.5 py-1.5 rounded-none shadow-md flex items-center gap-1.5">
             <Crown className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]/20" />
             <span className="text-[#D4AF37] text-[10px] font-extrabold uppercase tracking-[0.2em] font-serif">
               Signature Series
             </span>
           </div>
         ) : ("""

browse_content = browse_content.replace(old_browse_badge, new_browse_badge)

with open(guest_browse_path, "w", encoding="utf-8") as f:
    f.write(browse_content)
print("GuestBrowse.js Crown icon integrated successfully!")
