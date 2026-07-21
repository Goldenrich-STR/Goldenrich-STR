import os

file_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\AuthPage.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace image URL
content = content.replace(
    'src="https://images.unsplash.com/photo-1729605411999-5a1c8972a169?auto=format&fit=crop&q=80&w=800"',
    'src="https://images.unsplash.com/photo-1675657144361-98ae33e6b6f9?auto=format&fit=crop&q=80&w=800"'
)

# Replace box size classes
content = content.replace(
    'max-w-[850px] bg-white rounded-3xl shadow-2xl flex overflow-hidden border border-gray-150 h-[590px]',
    'max-w-[920px] bg-white rounded-3xl shadow-2xl flex overflow-hidden border border-gray-150 h-[620px]'
)

# Update left-panel title styling to white and font-lufga
old_left_title = """                <h4 className="font-serif text-2xl font-bold leading-tight mb-2 tracking-tight">
                  Book a Room.<br />Enjoy A Villa Getaway
                </h4>
                <p className="text-white/80 text-[11px] font-medium max-w-[200px] mb-4">
                  Enjoy the luxuries & privacy of a villa with
                </p>
                <div className="border border-dashed border-white/60 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-1.5 text-xs font-bold tracking-wide">
                  Rooms Starting at ₹5,000*
                </div>"""

new_left_title = """                <h4 className="font-lufga text-white text-2xl md:text-3xl font-extrabold leading-tight mb-2 tracking-tight drop-shadow-sm">
                  Book a Room.<br />Enjoy A Villa Getaway
                </h4>
                <p className="text-white text-xs font-semibold max-w-[220px] mb-4 drop-shadow-sm">
                  Enjoy the luxuries & privacy of a villa with
                </p>
                <div className="border border-dashed border-white/80 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-1.5 text-xs font-bold tracking-wide text-white drop-shadow-sm">
                  Rooms Starting at ₹5,000*
                </div>"""

content = content.replace(old_left_title, new_left_title)

# Update top header & toggle button layout to prevent overlaps (positioning toggle left of the X close button)
old_right_header = """            {/* Mini Logo */}
            <div className="mb-4 flex items-center justify-between">
              <img src="/logo.png" alt="X-Space360" className="h-8 w-auto object-contain" />
              {/* Optional Toggle Button instead of traditional tabs */}
              {!isAdminLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(prev => !prev);
                    setError('');
                    setSuccess('');
                    resetOtpFlow();
                  }}
                  className="text-xs font-bold text-terracotta hover:underline uppercase tracking-wider"
                >
                  {isLogin ? "Or Sign Up" : "Or Sign In"}
                </button>
              )}
            </div>"""

new_right_header = """            {/* Mini Logo */}
            <div className="mb-4 flex items-center justify-between pr-10">
              <img src="/logo.png" alt="X-Space360" className="h-8 w-auto object-contain" />
              {/* Toggle Button next to logo but away from close button */}
              {!isAdminLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(prev => !prev);
                    setError('');
                    setSuccess('');
                    resetOtpFlow();
                  }}
                  className="text-xs font-bold text-terracotta hover:underline uppercase tracking-wider mr-4"
                >
                  {isLogin ? "Or Sign Up" : "Or Sign In"}
                </button>
              )}
            </div>"""

content = content.replace(old_right_header, new_right_header)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("AuthPage.js design successfully updated with increased size, white Lufga fonts, new pool image, and fixed overlaps!")
