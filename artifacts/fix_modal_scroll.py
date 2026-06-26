import os
import sys

# 1. Update HostDashboard.js
host_dashboard_path = r'd:\FinalSTR\Goldenrich-STR\frontend\src\pages\HostDashboard.js'
if not os.path.exists(host_dashboard_path):
    print("Error: HostDashboard.js not found")
    sys.exit(1)

content = open(host_dashboard_path, 'r', encoding='utf-8').read()

target_top = """        {/* Document Verification Modal */}
        {showVerificationModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-sand-50 rounded-[3rem] p-10 max-w-5xl w-full shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-charcoal tracking-tight mb-2 flex items-center">
                    <FileText className="w-8 h-8 text-terracotta mr-3" />
                    Document Verification
                  </h3>
                  <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">Please upload your documents to verify your host profile</p>
                </div>
                <button onClick={() => setShowVerificationModal(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors border border-sand-200">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-6">"""

replacement_top = """        {/* Document Verification Modal */}
        {showVerificationModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-sand-50 rounded-[3rem] max-w-5xl w-full shadow-2xl animate-scale-up max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-start p-10 pb-4 border-b border-sand-200/50 flex-shrink-0">
                <div>
                  <h3 className="text-3xl font-black text-charcoal tracking-tight mb-2 flex items-center">
                    <FileText className="w-8 h-8 text-terracotta mr-3" />
                    Document Verification
                  </h3>
                  <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">Please upload your documents to verify your host profile</p>
                </div>
                <button onClick={() => setShowVerificationModal(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors border border-sand-200">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-10 pb-10 pt-6 custom-modal-scrollbar">
                <form onSubmit={handleVerifySubmit} className="space-y-6">"""

target_bottom = """                  </button>
                </div>
              </form>
            </div>
          </div>
        )}"""

replacement_bottom = """                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        )}"""

# Normalize line endings to avoid match issues
def normalize_string(s):
    return s.replace('\r\n', '\n').replace('\r', '\n').strip()

norm_content = normalize_string(content)
norm_target_top = normalize_string(target_top)
norm_target_bottom = normalize_string(target_bottom)

if norm_target_top not in norm_content:
    print("Error: target_top not found in HostDashboard.js")
    # Let's write the norm target top to debug
    print("Target Top snippet expected:")
    print(repr(norm_target_top[:100]))
    sys.exit(1)

if norm_target_bottom not in norm_content:
    print("Error: target_bottom not found in HostDashboard.js")
    sys.exit(1)

# Apply replacement on normalized content, then write back
norm_content = norm_content.replace(norm_target_top, replacement_top)
norm_content = norm_content.replace(norm_target_bottom, replacement_bottom)

open(host_dashboard_path, 'w', encoding='utf-8').write(norm_content)
print("Successfully updated HostDashboard.js modal wrapper structure")


# 2. Update index.css
index_css_path = r'd:\FinalSTR\Goldenrich-STR\frontend\src\index.css'
if not os.path.exists(index_css_path):
    print("Error: index.css not found")
    sys.exit(1)

css_content = open(index_css_path, 'r', encoding='utf-8').read()

custom_scrollbar_css = """
/* Custom Modal Scrollbar */
.custom-modal-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #C05C4F transparent;
}
.custom-modal-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-modal-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  margin-top: 15px;
  margin-bottom: 15px;
}
.custom-modal-scrollbar::-webkit-scrollbar-thumb {
  background: #C05C4F;
  border-radius: 10px;
}
"""

if ".custom-modal-scrollbar" not in css_content:
    open(index_css_path, 'a', encoding='utf-8').write(custom_scrollbar_css)
    print("Successfully appended custom scrollbar CSS to index.css")
else:
    print("Custom scrollbar CSS already exists in index.css")
