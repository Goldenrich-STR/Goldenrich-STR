import re

with open('src/pages/LandingPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the return statement in LandingPage
match = re.search(r'(return\s*\(\s*<div className="min-h-screen bg-sand-50)', content)
if not match:
    print("Could not find the return statement")
    exit(1)

start_index = match.start()

# Let's find where the Modals start:
modal_match = re.search(r'(<ChatbotWidget\s*/>\s*{/\* Premium How It Works: Step-by-Step Host Onboarding Modal Component \*/})', content)
if not modal_match:
    print("Could not find modal section")
    exit(1)

header_content = content[:start_index]
modals_content = content[modal_match.start():]

new_ui = """return (
    <div className="min-h-screen bg-[#1F1F1F] font-sans text-white overflow-x-hidden selection:bg-charcoal">
      {/* Navbar overlay */}
      <nav className="absolute top-0 w-full z-50 py-6 px-8 flex justify-between items-center text-white">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight cursor-pointer" onClick={() => navigate('/')}>x-space360.in</h1>
        </div>
        <div className="hidden md:flex space-x-8 items-center font-medium text-sm">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/host/onboarding'); }} className="hover:text-gray-300 transition">{t('listProperty') || 'List your property'}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); }} className="hover:text-gray-300 transition">{t('guestSupport') || 'Support'}</a>
          <button onClick={() => setShowHowItWorksModal(true)} className="hover:text-gray-300 transition">{t('howItWorks') || 'How it works'}</button>
          <button onClick={() => navigate('/login')} className="hover:text-gray-300 transition">{t('signIn') || 'Sign in'}</button>
          <LanguageSelector />
        </div>
        <button onClick={() => navigate('/login')} className="hidden md:flex items-center space-x-2 border border-white/30 rounded-full px-4 py-2 hover:bg-white/10 transition">
          <span className="text-sm font-medium">Get the app</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative h-screen w-full flex flex-col justify-center items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img src="/images/hero-bg.png" alt="Luxury Villa" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40"></div>
          {/* Bottom gradient matching the background color */}
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#1F1F1F] to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 mt-24">
          <div className="max-w-3xl">
            <h2 className="text-6xl md:text-8xl font-medium tracking-tight mb-8 leading-tight text-white/90 drop-shadow-lg">
              Explore your place<br/>to stay
            </h2>
          </div>
          
          {/* Search Bar matching mockup */}
          <div className="mt-8 flex flex-wrap gap-4 items-center animate-slide-up">
            <div className="flex items-center bg-[#2A2A2A]/80 backdrop-blur-md rounded-2xl border border-white/10 p-2 text-sm w-full md:w-auto shadow-2xl">
              {/* Location */}
              <div className="flex items-center px-4 py-3 rounded-xl hover:bg-white/5 transition cursor-pointer w-full md:w-64">
                <Search className="w-5 h-5 text-gray-400 mr-3" />
                <input type="text" placeholder={t('searchDestinations') || 'Location'} className="bg-transparent border-none outline-none text-white w-full placeholder-gray-400 font-medium" />
              </div>
              <div className="w-[1px] h-8 bg-white/10 mx-2"></div>
              {/* Dates */}
              <div className="flex items-center px-4 py-3 rounded-xl hover:bg-white/5 transition cursor-pointer">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-300 mr-4 font-medium">{t('checkIn') || 'Check in'}</span>
                <span className="text-gray-300 font-medium">{t('checkOut') || 'Checkout'}</span>
              </div>
              <div className="w-[1px] h-8 bg-white/10 mx-2"></div>
              {/* Guests */}
              <div className="flex items-center px-4 py-3 rounded-xl hover:bg-white/5 transition cursor-pointer">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-300 mr-8 font-medium">{t('guests') || 'Guests'}</span>
              </div>
            </div>
            
            <button className="bg-[#CCA978] text-[#1F1F1F] font-bold px-10 py-5 rounded-2xl hover:bg-[#b89565] transition shadow-[0_0_20px_rgba(204,169,120,0.4)]">
              {t('search') || 'Search'}
            </button>
          </div>

          <div className="mt-20 max-w-md animate-fade-in" style={{animationDelay: '0.3s'}}>
             <div className="border-l-4 border-[#CCA978] pl-6">
               <h3 className="text-xl md:text-2xl font-bold mb-2 drop-shadow-md">We provide a variety of the best lodging accommodations for those of you who need it.</h3>
               <p className="text-sm text-gray-300">Don't worry about the quality of the service.</p>
             </div>
          </div>
        </div>
      </div>

      {/* Content Section bg-[#1F1F1F] */}
      <div className="w-full bg-[#1F1F1F] relative z-20 pb-32">
        <div className="max-w-7xl mx-auto px-8 pt-24">
          
          {/* Hotels in your area */}
          <div className="mb-24">
            <h3 className="text-3xl font-semibold text-center mb-12 text-white tracking-tight">Hotels in your <span className="text-gray-500">area</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {[
                 {title: 'Villa, Kemah Tinggi', price: '₹ 25,000', rating: '4.93', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'},
                 {title: 'Bandra Heights, Mumbai', price: '₹ 15,500', rating: '4.85', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800'},
                 {title: 'Coorg Retreat, Karnataka', price: '₹ 12,200', rating: '4.98', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800'},
                 {title: 'Goa Beachfront Villa', price: '₹ 45,000', rating: '4.90', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800'}
               ].map((item, i) => (
                 <div key={i} className="bg-[#2A2A2A] rounded-3xl p-4 cursor-pointer hover:-translate-y-2 transition-all duration-300 shadow-xl group border border-white/5 hover:border-[#CCA978]/30">
                   <div className="relative h-64 rounded-2xl overflow-hidden mb-4">
                     <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                     <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 flex items-center border border-white/10">
                       <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                       <span className="text-xs font-bold text-white">{item.rating}</span>
                     </div>
                   </div>
                   <div className="flex justify-between items-end px-2">
                     <div>
                       <h4 className="font-semibold text-lg text-white mb-1">{item.title}</h4>
                       <p className="text-gray-400 text-xs font-medium">Entire home · India</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[#CCA978] font-bold text-lg">{item.price}</p>
                       <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">per night</p>
                     </div>
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Browse by property type */}
          <div className="mb-24 flex flex-col md:flex-row justify-between items-start md:items-end mb-16">
            <div className="max-w-2xl">
              <h3 className="text-4xl font-semibold mb-6 text-white tracking-tight">Browse by property type</h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                You can easily browse and filter your search by property type. This feature allows you to select luxury villas, modern apartments, or expansive resorts based on your preferences and specific needs for your stay.
              </p>
            </div>
            <div className="mt-8 md:mt-0 text-7xl font-bold text-[#2A2A2A] opacity-50 select-none">
              2018-2026
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {name: 'Hotels', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800'},
              {name: 'Apartments', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800'},
              {name: 'Resorts', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800'},
              {name: 'Villas', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'},
              {name: 'Cottages', img: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&q=80&w=800'}
            ].map((type, i) => (
              <div key={i} className="flex flex-col items-center group cursor-pointer">
                <h4 className="text-lg font-medium text-gray-400 group-hover:text-white transition mb-6">{type.name}</h4>
                <div className="w-full h-[400px] rounded-[2rem] overflow-hidden relative shadow-lg group-hover:shadow-[0_0_30px_rgba(204,169,120,0.15)] transition-all duration-500">
                   <img src={type.img} alt={type.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80 group-hover:opacity-40 transition duration-500"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Stay in the know / Trending */}
          <div className="mt-40 grid grid-cols-1 md:grid-cols-2 gap-20">
            {/* Left */}
            <div className="bg-[#2A2A2A] rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#CCA978]/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <h3 className="text-3xl font-semibold mb-6 text-white tracking-tight relative z-10">Stay in the know</h3>
              <p className="text-gray-400 leading-relaxed mb-10 max-w-sm relative z-10">
                Sign up to get marketing emails from x-space360.in, including promotions, rewards, travel experiences, and information about X-Space360.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                <input type="email" placeholder="Your email address" className="bg-[#1F1F1F] text-white border border-white/10 px-6 py-4 rounded-xl flex-1 outline-none font-medium focus:border-[#CCA978]/50 transition" />
                <button className="bg-[#CCA978] text-[#1F1F1F] font-bold px-8 py-4 rounded-xl hover:bg-[#b89565] transition shadow-lg whitespace-nowrap">Subscribe</button>
              </div>
              <p className="text-xs text-gray-500 mt-6 relative z-10">You can opt out anytime. See our <a href="#" className="underline hover:text-gray-300">privacy statement</a>.</p>
            </div>
            
            {/* Right */}
            <div className="border-l border-[#2A2A2A] pl-0 md:pl-16 flex flex-col justify-center">
              <h3 className="text-2xl font-semibold mb-2 text-white tracking-tight">Trending destinations</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium">Most popular choices for travelers from India</p>
              
              <div className="grid grid-cols-2 gap-4 h-[320px]">
                 <div className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-lg">
                   <img src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=800" alt="Goa" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4"><h4 className="text-xl font-bold text-white tracking-wide drop-shadow-md">Goa</h4></div>
                 </div>
                 <div className="relative rounded-2xl overflow-hidden row-span-2 group cursor-pointer shadow-lg">
                   <img src="https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&q=80&w=800" alt="Mumbai" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4"><h4 className="text-xl font-bold text-white tracking-wide drop-shadow-md">Mumbai</h4></div>
                 </div>
                 <div className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-lg">
                   <img src="https://images.unsplash.com/photo-1615836245337-f5b9b230bc18?auto=format&fit=crop&q=80&w=800" alt="Udaipur" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4"><h4 className="text-xl font-bold text-white tracking-wide drop-shadow-md">Udaipur</h4></div>
                 </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#151515] border-t border-[#2A2A2A] py-12 z-20 relative">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2">
             <h4 className="text-2xl font-bold text-white tracking-tight">x-space360.in</h4>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 mt-8 md:mt-0">
             <div className="flex space-x-6 text-sm text-gray-400 font-medium">
               <a href="#" className="hover:text-white transition">Privacy</a>
               <a href="#" className="hover:text-white transition">Terms</a>
               <a href="#" className="hover:text-white transition">Contact</a>
             </div>
             <div className="w-[1px] h-6 bg-[#2A2A2A] hidden md:block"></div>
             <div className="flex items-center space-x-4">
               <span className="text-gray-400 text-sm">Ready to get started?</span>
               <button className="bg-[#CCA978] text-[#1F1F1F] font-bold px-6 py-2.5 rounded-xl hover:bg-[#b89565] transition shadow-lg text-sm" onClick={() => navigate('/register')}>Sign Up</button>
             </div>
          </div>
        </div>
      </footer>

"""

new_content = header_content + new_ui + modals_content

with open('src/pages/LandingPage.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("LandingPage.js updated successfully")
