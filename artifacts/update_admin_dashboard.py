import os
import sys

fn = r'd:\\FinalSTR\\Goldenrich-STR\\frontend\\src\\pages\\AdminDashboard.js'
if not os.path.exists(fn):
    print("Error: AdminDashboard.js not found")
    sys.exit(1)

content = open(fn, 'r', encoding='utf-8').read()

# 1. Add HelpCircle icon import
target_import = "import { Phone, Volume2 } from 'lucide-react';"
replacement_import = "import { Phone, Volume2, HelpCircle } from 'lucide-react';"

if target_import not in content:
    print("Error: target icon import not found")
    sys.exit(1)
content = content.replace(target_import, replacement_import)

# 2. Add supportData state
target_states = """  const [heroData, setHeroData] = useState({
    sub_tag: '',
    title: '',
    subtitle: '',
    image_url: '',
    rating: '',
    trusted_text: ''
  });"""

replacement_states = """  const [heroData, setHeroData] = useState({
    sub_tag: '',
    title: '',
    subtitle: '',
    image_url: '',
    rating: '',
    trusted_text: ''
  });

  const [supportData, setSupportData] = useState({
    title: '',
    subtitle: '',
    search_placeholder: '',
    assist_heading: '',
    cards: [],
    popular_topics: [],
    support_hours: [],
    response_time: '',
    footer_title: '',
    footer_subtitle: '',
    footer_button_text: ''
  });"""

if target_states not in content:
    print("Error: target states not found")
    sys.exit(1)
content = content.replace(target_states, replacement_states)

# 3. Update fetchCMSContent to fetch support page content
target_fetch = """  const fetchCMSContent = async () => {
    try {
      setLoading(true);
      const res = await cmsAPI.getAdminContent('landing');
      const docs = res.data.content || [];
      setContent(docs);

      const heroDoc = docs.find(d => d.section === 'hero');
      if (heroDoc) setHeroData(heroDoc.content_data);"""

replacement_fetch = """  const fetchCMSContent = async () => {
    try {
      setLoading(true);
      const [res, supportRes] = await Promise.all([
        cmsAPI.getAdminContent('landing'),
        cmsAPI.getAdminContent('support')
      ]);
      const docs = [...(res.data.content || []), ...(supportRes.data.content || [])];
      setContent(docs);

      const heroDoc = docs.find(d => d.section === 'hero');
      if (heroDoc) setHeroData(heroDoc.content_data);"""

if target_fetch not in content:
    print("Error: target fetch not found")
    sys.exit(1)
content = content.replace(target_fetch, replacement_fetch)

# 4. Set support data in fetchCMSContent
target_set_data = """      const offerDoc = docs.find(d => d.section === 'offer');
      if (offerDoc) setOfferData(offerDoc.content_data);"""

replacement_set_data = """      const offerDoc = docs.find(d => d.section === 'offer');
      if (offerDoc) setOfferData(offerDoc.content_data);

      const supportDoc = docs.find(d => d.section === 'support_content');
      if (supportDoc) setSupportData(supportDoc.content_data);"""

if target_set_data not in content:
    print("Error: target set data not found")
    sys.exit(1)
content = content.replace(target_set_data, replacement_set_data)

# 5. Add Support tab to sub-tab list
target_subtabs = """          { id: 'blog', label: 'Blog Posts', icon: FileText },
          { id: 'offer', label: 'Promotional Offer', icon: Tag },
          { id: 'footer', label: 'Footer', icon: Phone }"""

replacement_subtabs = """          { id: 'blog', label: 'Blog Posts', icon: FileText },
          { id: 'offer', label: 'Promotional Offer', icon: Tag },
          { id: 'support', label: 'Support Page', icon: HelpCircle },
          { id: 'footer', label: 'Footer', icon: Phone }"""

if target_subtabs not in content:
    print("Error: target subtabs not found")
    sys.exit(1)
content = content.replace(target_subtabs, replacement_subtabs)

# 6. Inject activeSubTab === 'support' form before promotional offer tab
target_form_placement = """        {/* PROMOTIONAL OFFER TAB */}
        {activeSubTab === 'offer' && ("""

support_form_content = """        {/* SUPPORT PAGE TAB */}
        {activeSubTab === 'support' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-sand-100">
              <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-charcoal">Support Page Configuration</h4>
                <p className="text-xs text-charcoal-muted font-medium">Configure contact cards, popular topics, support hours, and banners on the support page.</p>
              </div>
            </div>

            {/* Header Content */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider">Header Section</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative group">
                  <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Main Title</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm"
                    value={supportData.title || ''}
                    onChange={e => setSupportData({ ...supportData, title: e.target.value })}
                    placeholder="e.g. How can we help you?"
                  />
                </div>
                <div className="relative group">
                  <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Search Placeholder</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm"
                    value={supportData.search_placeholder || ''}
                    onChange={e => setSupportData({ ...supportData, search_placeholder: e.target.value })}
                    placeholder="e.g. Search for help articles..."
                  />
                </div>
              </div>
              <div className="relative group">
                <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Subtitle / Description</label>
                <textarea
                  rows={2}
                  className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm leading-relaxed"
                  value={supportData.subtitle || ''}
                  onChange={e => setSupportData({ ...supportData, subtitle: e.target.value })}
                  placeholder="e.g. We're here to help and answer any question you might have."
                />
              </div>
            </div>

            {/* Assistance Section */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider">Assistance Section Title</h5>
              <div className="relative group">
                <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Section Heading</label>
                <input
                  className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm"
                  value={supportData.assist_heading || ''}
                  onChange={e => setSupportData({ ...supportData, assist_heading: e.target.value })}
                  placeholder="e.g. How can we assist you today?"
                />
              </div>
            </div>

            {/* Support Cards (4 cards) */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider font-serif">Support Channels / Cards</h5>
              <div className="space-y-6">
                {(supportData.cards || []).map((card, index) => (
                  <div key={card.id || index} className="p-5 bg-white rounded-2xl border border-sand-200/80 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-sand-100">
                      <span className="text-[10px] font-black text-charcoal uppercase tracking-wider">
                        Channel {index + 1}: {card.id?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Card Title</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs bg-sand-50/10 focus:bg-white"
                          value={card.title || ''}
                          onChange={e => {
                            const updated = [...supportData.cards];
                            updated[index] = { ...updated[index], title: e.target.value };
                            setSupportData({ ...supportData, cards: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Description</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs bg-sand-50/10 focus:bg-white"
                          value={card.description || ''}
                          onChange={e => {
                            const updated = [...supportData.cards];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setSupportData({ ...supportData, cards: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Button Text / Value</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs bg-sand-50/10 focus:bg-white"
                          value={card.button_text || ''}
                          onChange={e => {
                            const updated = [...supportData.cards];
                            updated[index] = { ...updated[index], button_text: e.target.value };
                            setSupportData({ ...supportData, cards: updated });
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Action Value (URL / Link / Phone / Email)</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs bg-sand-50/10 focus:bg-white"
                          value={card.action_value || ''}
                          onChange={e => {
                            const updated = [...supportData.cards];
                            updated[index] = { ...updated[index], action_value: e.target.value };
                            setSupportData({ ...supportData, cards: updated });
                          }}
                          placeholder="e.g. support@x-space360.com or +91 98765 43210"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Topics Section */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider">Popular Topics</h5>
              <div className="space-y-4">
                {(supportData.popular_topics || []).map((topic, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-sand-200/60 font-semibold">
                    <div>
                      <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Topic {index + 1} Label</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                        value={topic.label || ''}
                        onChange={e => {
                          const updated = [...supportData.popular_topics];
                          updated[index] = { ...updated[index], label: e.target.value };
                          setSupportData({ ...supportData, popular_topics: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Topic {index + 1} Link / Anchor</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                        value={topic.link || ''}
                        onChange={e => {
                          const updated = [...supportData.popular_topics];
                          updated[index] = { ...updated[index], link: e.target.value };
                          setSupportData({ ...supportData, popular_topics: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Hours Section */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider font-semibold">Support Hours & Response Time</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(supportData.support_hours || []).map((hour, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl border border-sand-200/60 space-y-3 font-semibold">
                    <div>
                      <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Days (e.g. Monday - Saturday)</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                        value={hour.days || ''}
                        onChange={e => {
                          const updated = [...supportData.support_hours];
                          updated[index] = { ...updated[index], days: e.target.value };
                          setSupportData({ ...supportData, support_hours: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Hours (e.g. 9:00 AM - 7:00 PM)</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                        value={hour.hours || ''}
                        onChange={e => {
                          const updated = [...supportData.support_hours];
                          updated[index] = { ...updated[index], hours: e.target.value };
                          setSupportData({ ...supportData, support_hours: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative group">
                <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Response Time Text</label>
                <input
                  className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm"
                  value={supportData.response_time || ''}
                  onChange={e => setSupportData({ ...supportData, response_time: e.target.value })}
                  placeholder="e.g. We usually respond within 24 hours."
                />
              </div>
            </div>

            {/* Footer Banner */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider">Bottom Support Banner</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Banner Title</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                    value={supportData.footer_title || ''}
                    onChange={e => setSupportData({ ...supportData, footer_title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Banner Subtitle</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                    value={supportData.footer_subtitle || ''}
                    onChange={e => setSupportData({ ...supportData, footer_subtitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Banner Button Text</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                    value={supportData.footer_button_text || ''}
                    onChange={e => setSupportData({ ...supportData, footer_button_text: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-sand-150">
              <button
                onClick={() => handleSave('support_content', supportData)}
                disabled={saving}
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-md shadow-terracotta/15 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Support Config...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Support Page Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PROMOTIONAL OFFER TAB */}
        {activeSubTab === 'offer' && ("""

if target_form_placement not in content:
    print("Error: target form placement not found")
    sys.exit(1)
content = content.replace(target_form_placement, support_form_content)

open(fn, 'w', encoding='utf-8').write(content)
print("Successfully integrated Support CMS into AdminDashboard.js.")
