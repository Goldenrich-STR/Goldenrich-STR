import os
import re

landing_page_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\LandingPage.js"
guest_browse_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\GuestBrowse.js"

# 1. UPDATE LANDINGPAGE.JS
with open(landing_page_path, "r", encoding="utf-8") as f:
    landing_content = f.read()

# Update tag to 'Signature Series' for hilltop-retreats in PREMIUM_COLLECTIONS
landing_content = landing_content.replace("tag: 'Handpicked'", "tag: 'Signature Series'")

# Update CollectionsSection component to be bounded and smooth fixed-width
new_collections_section = """const CollectionsSection = ({ navigate }) => {
  const sliderRef = React.useRef(null);

  const handleCardClick = (col) => {
    if (col.id === 'hilltop-retreats') {
      navigate('/guest/browse?signature=true');
      return;
    }
    const typeQuery = col.property_type ? `&property_type=${col.property_type}` : '';
    navigate(`/guest/browse?category=${col.query}${typeQuery}`);
  };

  const scroll = (dir) => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full bg-white pt-10 md:pt-16 pb-4 md:pb-6 overflow-x-hidden">
      <div className="max-w-[1440px] mx-auto px-4 md:px-[10vw]">
        {/* Header */}
        <ScrollReveal duration="duration-[800ms]">
          <div className="flex items-end justify-between gap-4 mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-charcoal tracking-tight">
              Discover Our Collection
            </h2>
            {/* Nav arrows aligned with content */}
            <div className="hidden md:flex items-center gap-3 text-charcoal">
              <button
                onClick={() => scroll('left')}
                className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 hover:text-terracotta transition-all duration-300"
                aria-label="Previous collection"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 hover:text-terracotta transition-all duration-300"
                aria-label="Next collection"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Bounded Cards Strip */}
        <ScrollReveal duration="duration-[1000ms]" delay={150}>
          <div className="overflow-hidden">
            <div
              ref={sliderRef}
              className="flex overflow-x-auto no-scrollbar gap-5 snap-x scroll-smooth pb-4 justify-start"
            >
              {PREMIUM_COLLECTIONS.map((col) => {
                return (
                  <div
                    key={col.id}
                    onClick={() => handleCardClick(col)}
                    className="relative flex-none snap-start w-[240px] md:w-[300px] aspect-[3/4] overflow-hidden cursor-pointer rounded-2xl group shadow-md hover:shadow-xl transition-all duration-500"
                  >
                    {/* Background Image */}
                    <img
                      src={col.image}
                      alt={col.label}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />

                    {/* Tag badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-white/95 text-charcoal text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                        {col.tag}
                      </span>
                    </div>

                    {/* Card Content - stable and smooth slide-up */}
                    <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-end z-10">
                      <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-1">Explore</p>
                      <h3 className="text-white text-lg md:text-xl font-bold leading-snug transition-transform duration-500 group-hover:-translate-y-1">
                        {col.label}
                      </h3>
                      
                      {/* Detailed Description */}
                      <div className="max-h-0 opacity-0 overflow-hidden transition-all duration-500 ease-in-out group-hover:max-h-[120px] group-hover:opacity-100 group-hover:mt-2">
                        <p className="text-white/80 text-[11px] md:text-xs leading-relaxed">
                          {col.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};"""

landing_content = re.sub(
    r'const CollectionsSection = \(\{ navigate \}\) => \{.*?\n\};',
    new_collections_section,
    landing_content,
    flags=re.DOTALL
)

with open(landing_page_path, "w", encoding="utf-8") as f:
    f.write(landing_content)
print("LandingPage.js collections section updated successfully!")


# 2. UPDATE GUESTBROWSE.JS
with open(guest_browse_path, "r", encoding="utf-8") as f:
    browse_content = f.read()

# Update initial filters to check for signature parameter
old_filters_init = """  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      city: params.get('city') || '',
      category: params.get('category') || 'residential',
      property_type: params.get('property_type') || '',
      bhk_type: '',
      min_price: '',
      max_price: '',
      guests: params.get('guests') || '',
      instant_booking: false,
      pet_friendly: false,
      check_in: params.get('checkIn') || '',
      check_out: params.get('checkOut') || '',
      sort: 'recommended',
      amenities: [],
    };
  });"""

new_filters_init = """  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const isSignature = params.get('signature') === 'true';
    return {
      city: params.get('city') || '',
      category: params.get('category') || 'residential',
      property_type: params.get('property_type') || '',
      bhk_type: '',
      min_price: isSignature ? '50000' : '',
      max_price: '',
      guests: params.get('guests') || '',
      instant_booking: false,
      pet_friendly: false,
      check_in: params.get('checkIn') || '',
      check_out: params.get('checkOut') || '',
      sort: 'recommended',
      amenities: [],
    };
  });"""

browse_content = browse_content.replace(old_filters_init, new_filters_init)

# Update useEffect parsing parameters to set min_price to 50000 for signature
old_params_useeffect = """    if (city || category || propertyType || checkIn || checkOut || guests) {
      setFilters(prev => ({
        ...prev,
        city: city || prev.city,
        category: category || prev.category,
        property_type: propertyType || prev.property_type,
        check_in: checkIn || prev.check_in,
        check_out: checkOut || prev.check_out,
        guests: guests || prev.guests
      }));
    }"""

new_params_useeffect = """    const isSignature = params.get('signature') === 'true';
    if (isSignature) {
      setFilters(prev => ({
        ...prev,
        min_price: '50000'
      }));
    }
    if (city || category || propertyType || checkIn || checkOut || guests) {
      setFilters(prev => ({
        ...prev,
        city: city || prev.city,
        category: category || prev.category,
        property_type: propertyType || prev.property_type,
        check_in: checkIn || prev.check_in,
        check_out: checkOut || prev.check_out,
        guests: guests || prev.guests
      }));
    }"""

browse_content = browse_content.replace(old_params_useeffect, new_params_useeffect)

# Update results header to show "Signature Series" title
old_header = """          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-charcoal tracking-tight">
             {loading ? t('searching') : (
                <>
                   {displayedProperties.length} {displayedProperties.length === 1 ? t('spaceFound') : t('spacesFound')}
                </>
             )}
          </h2>
          <p className="text-charcoal-muted font-medium mt-1">
             {filters.city ? t('curatedResults').replace('{city}', filters.city) : t('discoverExclusive')}
          </p>"""

new_header = """          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-tight text-charcoal tracking-tight">
             {new URLSearchParams(window.location.search).get('signature') === 'true' ? (
                "Signature Series"
             ) : loading ? t('searching') : (
                <>
                   {displayedProperties.length} {displayedProperties.length === 1 ? t('spaceFound') : t('spacesFound')}
                </>
             )}
          </h2>
          <p className="text-charcoal-muted font-medium mt-1">
             {new URLSearchParams(window.location.search).get('signature') === 'true'
                ? "Indulge in India's most ultra-luxury private villas and premium resort stays."
                : filters.city ? t('curatedResults').replace('{city}', filters.city) : t('discoverExclusive')}
          </p>"""

browse_content = browse_content.replace(old_header, new_header)

# Update PropertyCard tag section to include Signature Series black & gold badge
old_badge = """      <div className="absolute top-4 left-4 flex gap-2">
         <div className="glass px-3 py-1 rounded-full shadow-sm">
            <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal">
               {formatCategoryLabel(property.category)}
            </span>
         </div>
      </div>"""

new_badge = """      <div className="absolute top-4 left-4 flex gap-2">
         {property.price_per_night >= 50000 ? (
           <div className="bg-black border border-[#D4AF37]/50 px-3 py-1 rounded-none shadow-md flex items-center gap-1">
             <span className="text-[#D4AF37] text-[10px] font-extrabold uppercase tracking-[0.2em] flex items-center gap-1 font-serif">
               👑 Signature Series
             </span>
           </div>
         ) : (
           <div className="glass px-3 py-1 rounded-full shadow-sm">
              <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal">
                 {formatCategoryLabel(property.category)}
              </span>
           </div>
         )}
      </div>"""

browse_content = browse_content.replace(old_badge, new_badge)

with open(guest_browse_path, "w", encoding="utf-8") as f:
    f.write(browse_content)
print("GuestBrowse.js signature routing & badges updated successfully!")
