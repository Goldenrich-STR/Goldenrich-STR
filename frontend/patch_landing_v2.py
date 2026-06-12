import re

# Read the CURRENT (modified) file to get the header state and the modals
with open('src/pages/LandingPage.js', 'r', encoding='utf-8') as f:
    current_content = f.read()

# Read the OLD file to get the original footer
with open('LandingPage.old.js', 'r', encoding='utf-8') as f:
    old_content = f.read()

# Find the start of the return statement in current file
match = re.search(r'(return\s*\(\s*<div className="min-h-screen bg-\[\#1F1F1F\])', current_content)
if not match:
    print("Could not find the return statement in current file")
    exit(1)

start_index = match.start()

# Let's find where the Modals start in current file
modal_match = re.search(r'(<ChatbotWidget\s*/>\s*{/\* Premium How It Works: Step-by-Step Host Onboarding Modal Component \*/})', current_content)
if not modal_match:
    print("Could not find modal section in current file")
    exit(1)

header_content = current_content[:start_index]
modals_content = current_content[modal_match.start():]

# Now let's extract the original footer from old_content
footer_match = re.search(r'(<footer className="bg-white border-t border-sand-200 pt-16 md:pt-24 pb-12">.*?</footer\s*>)', old_content, re.DOTALL)
if not footer_match:
    print("Could not find old footer")
    exit(1)

original_footer = footer_match.group(1)

new_ui = f"""return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-[#2A2A2A] overflow-x-hidden selection:bg-[#CCA978]/20">
      {{/* Navbar overlay matching Bookme */}}
      <nav className="absolute top-0 w-full z-50 pt-8 pb-4 flex justify-between items-center text-white px-4 md:px-0">
        {{/* Left Logo */}}
        <div className="flex items-center md:ml-12 lg:ml-20">
          <h1 className="text-3xl font-bold tracking-tight cursor-pointer drop-shadow-md" onClick={{() => navigate('/')}}>x-space360.in</h1>
        </div>
        
        {{/* Center Pill Links */}}
        <div className="hidden md:flex bg-white/95 backdrop-blur-md text-gray-800 rounded-full px-8 py-3.5 items-center space-x-8 font-semibold text-[15px] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <a href="#" onClick={{(e) => {{ e.preventDefault(); navigate('/host/onboarding'); }}}} className="hover:text-[#CCA978] transition">List your property</a>
          <a href="#" onClick={{(e) => {{ e.preventDefault(); }}}} className="hover:text-[#CCA978] transition">Support</a>
          <a href="#" onClick={{(e) => {{ e.preventDefault(); }}}} className="hover:text-[#CCA978] transition">Trips</a>
          <button onClick={{() => navigate('/login')}} className="hover:text-[#CCA978] transition">Sign in</button>
        </div>

        {{/* Right Buttons */}}
        <div className="flex items-center space-x-4 md:mr-12 lg:mr-20">
          <LanguageSelector />
          <button onClick={{() => navigate('/login')}} className="hidden md:flex items-center space-x-2 border border-white/50 rounded-full px-5 py-2.5 hover:bg-white/20 transition backdrop-blur-sm shadow-sm">
            <span className="text-sm font-semibold">Get the app</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {{/* Hero Section with Video Background */}}
      <div className="relative h-[85vh] w-full flex flex-col justify-center items-center rounded-b-[3rem] md:rounded-b-[4rem] overflow-hidden shadow-2xl">
        {{/* Video Background */}}
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src="https://pixabay.com/videos/download/video-256115_medium.mp4" type="video/mp4" />
        </video>
        {{/* Dark Overlay */}}
        <div className="absolute inset-0 bg-black/30 z-0"></div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 mt-12">
          <div className="text-center md:text-left">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-white drop-shadow-xl">
              Explore your place<br/>to stay
            </h2>
          </div>
        </div>
      </div>

      {{/* Search Bar Overlapping */}}
      <div className="relative z-30 -mt-10 md:-mt-14 max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center bg-white rounded-3xl p-3 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100">
            {{/* Location */}}
            <div className="flex items-center px-4 py-3 rounded-2xl hover:bg-gray-50 transition cursor-pointer w-full md:flex-1">
              <Search className="w-5 h-5 text-gray-500 mr-3" />
              <input type="text" placeholder={t('searchDestinations') || 'Location'} className="bg-transparent border-none outline-none text-[#2A2A2A] w-full placeholder-gray-500 font-semibold text-lg" />
            </div>
            <div className="hidden md:block w-[1px] h-10 bg-gray-200 mx-1"></div>
            {{/* Dates */}}
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-gray-50 transition cursor-pointer w-full md:flex-1">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-[#2A2A2A] font-semibold text-base">{t('checkIn') || 'Check in'}</span>
              </div>
              <span className="text-gray-300 mx-2">-</span>
              <span className="text-[#2A2A2A] font-semibold text-base">{t('checkOut') || 'Checkout'}</span>
            </div>
            <div className="hidden md:block w-[1px] h-10 bg-gray-200 mx-1"></div>
            {{/* Guests */}}
            <div className="flex items-center px-4 py-3 rounded-2xl hover:bg-gray-50 transition cursor-pointer w-full md:flex-1">
              <User className="w-5 h-5 text-gray-500 mr-3" />
              <span className="text-[#2A2A2A] font-semibold text-base">{t('guests') || 'Guests'}</span>
            </div>
            
            <button className="w-full md:w-auto bg-[#CCA978] text-white font-bold px-10 py-4 rounded-2xl hover:bg-[#b89565] transition shadow-md whitespace-nowrap text-lg">
              {t('search') || 'Search'}
            </button>
          </div>
      </div>

      {{/* Content Section */}}
      <div className="w-full bg-[#FDFCF8] relative z-20 pb-32 pt-24">
        <div className="max-w-7xl mx-auto px-8">
          
          {{/* Hotels in your area */}}
          <div className="mb-24">
            <h3 className="text-3xl font-bold text-center mb-12 text-[#2A2A2A] tracking-tight">Hotels in your <span className="text-gray-500">area</span></h3>
            <div className="flex overflow-x-auto pb-8 -mx-8 px-8 gap-6 no-scrollbar snap-x">
               {{[
                 {{title: 'Villa, Kemah Tinggi', price: '₹ 25,000', rating: '4.93', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'}},
                 {{title: 'Bandra Heights, Mumbai', price: '₹ 15,500', rating: '4.85', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800'}},
                 {{title: 'Coorg Retreat, Karnataka', price: '₹ 12,200', rating: '4.98', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800'}},
                 {{title: 'Goa Beachfront Villa', price: '₹ 45,000', rating: '4.90', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800'}}
               ].map((item, i) => (
                 <div key={{i}} className="bg-white rounded-3xl p-4 cursor-pointer hover:-translate-y-2 transition-all duration-300 shadow-lg group border border-gray-100 min-w-[280px] md:min-w-[300px] snap-center">
                   <div className="relative h-60 rounded-2xl overflow-hidden mb-4">
                     <img src={{item.img}} alt={{item.title}} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                     <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md rounded-full px-3 py-1 flex items-center shadow-sm">
                       <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                       <span className="text-xs font-bold text-[#2A2A2A]">{{item.rating}}</span>
                     </div>
                   </div>
                   <div className="flex justify-between items-end px-2">
                     <div>
                       <h4 className="font-bold text-lg text-[#2A2A2A] mb-1">{{item.title}}</h4>
                       <p className="text-gray-500 text-xs font-medium">Entire home · India</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[#CCA978] font-bold text-lg">{{item.price}}</p>
                       <p className="text-gray-400 text-[10px] uppercase tracking-wider mt-0.5">per night</p>
                     </div>
                   </div>
                 </div>
               ))}}
            </div>
            
            {{/* Dots indicator mockup */}}
            <div className="flex justify-center space-x-2 mt-4">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <div className="w-6 h-2 rounded-full bg-[#2A2A2A]"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            </div>
          </div>

          {{/* Browse by property type */}}
          <div className="mb-24 flex flex-col md:flex-row justify-between items-start md:items-end mb-16">
            <div className="max-w-2xl">
              <h3 className="text-4xl font-bold mb-6 text-[#2A2A2A] tracking-tight">Browse by property type</h3>
              <p className="text-gray-500 leading-relaxed text-lg font-medium">
                You can easily browse and filter your search by property type. This feature allows you to select luxury villas, modern apartments, or expansive resorts based on your preferences.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {{[
              {{name: 'Hotels', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800'}},
              {{name: 'Apartments', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800'}},
              {{name: 'Resorts', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800'}},
              {{name: 'Villas', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'}},
              {{name: 'Cottages', img: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&q=80&w=800'}}
            ].map((type, i) => (
              <div key={{i}} className="flex flex-col items-center group cursor-pointer">
                <h4 className="text-lg font-bold text-gray-500 group-hover:text-[#2A2A2A] transition mb-4">{{type.name}}</h4>
                <div className="w-full h-[350px] rounded-[2rem] overflow-hidden relative shadow-lg group-hover:shadow-2xl transition-all duration-500">
                   <img src={{type.img}} alt={{type.name}} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-80 group-hover:opacity-40 transition duration-500"></div>
                </div>
              </div>
            ))}}
          </div>

          {{/* Stay in the know / Trending */}}
          <div className="mt-32 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
            {{/* Left */}}
            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#CCA978]/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <h3 className="text-3xl font-bold mb-6 text-[#2A2A2A] tracking-tight relative z-10">Stay in the know</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-10 max-w-sm relative z-10">
                Sign up to get marketing emails from x-space360.in, including promotions, rewards, and travel experiences.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                <input type="email" placeholder="Your email address" className="bg-[#FDFCF8] text-[#2A2A2A] border border-gray-200 px-6 py-4 rounded-2xl flex-1 outline-none font-semibold focus:border-[#CCA978]/50 transition shadow-sm" />
                <button className="bg-[#2A2A2A] text-white font-bold px-8 py-4 rounded-2xl hover:bg-black transition shadow-lg whitespace-nowrap">Subscribe</button>
              </div>
              <p className="text-xs text-gray-400 mt-6 relative z-10 font-medium">You can opt out anytime. See our <a href="#" className="underline hover:text-gray-600">privacy statement</a>.</p>
            </div>
            
            {{/* Right */}}
            <div className="flex flex-col justify-center">
              <h3 className="text-3xl font-bold mb-2 text-[#2A2A2A] tracking-tight">Trending destinations</h3>
              <p className="text-sm text-gray-500 mb-8 font-semibold">Most popular choices for travelers from India</p>
              
              <div className="grid grid-cols-2 gap-4 h-[320px]">
                 <div className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-md">
                   <img src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=800" alt="Goa" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4"><h4 className="text-xl font-bold text-white tracking-wide drop-shadow-md">Goa</h4></div>
                 </div>
                 <div className="relative rounded-2xl overflow-hidden row-span-2 group cursor-pointer shadow-md">
                   <img src="https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&q=80&w=800" alt="Mumbai" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4"><h4 className="text-xl font-bold text-white tracking-wide drop-shadow-md">Mumbai</h4></div>
                 </div>
                 <div className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-md">
                   <img src="https://images.unsplash.com/photo-1615836245337-f5b9b230bc18?auto=format&fit=crop&q=80&w=800" alt="Udaipur" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4"><h4 className="text-xl font-bold text-white tracking-wide drop-shadow-md">Udaipur</h4></div>
                 </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {original_footer}

      """

new_content = header_content + new_ui + modals_content

with open('src/pages/LandingPage.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("LandingPage.js updated successfully with light theme and old footer")
