import os
import sys

fn = r'd:\FinalSTR\Goldenrich-STR\frontend\src\pages\HostDashboard.js'
if not os.path.exists(fn):
    print("Error: HostDashboard.js not found")
    sys.exit(1)

content = open(fn, 'r', encoding='utf-8').read()

# 1. Update the renderDocCard helper to use square layout (rounded-none instead of rounded-[2rem]/rounded-2xl) and add star marker to title
target_helper_top = """      <div className="bg-white rounded-[2rem] border border-sand-200 p-6 shadow-sm flex flex-col justify-between min-h-[18rem] h-auto relative overflow-hidden transition-all duration-300 hover:shadow-premium hover:border-terracotta group">
        {/* Corner Badge */}
        <div className="absolute top-0 left-0 bg-terracotta text-white font-black text-[10px] tracking-wider px-3.5 py-1.5 rounded-br-2xl rounded-tl-[2rem] shadow-sm">
          {number}
        </div>

        <div className="flex flex-col items-center flex-1 w-full">
          {/* Circular Icon Container */}
          <div className="w-14 h-14 rounded-full bg-sand-50 border border-sand-200 flex items-center justify-center mb-4 group-hover:bg-terracotta/5 transition-colors">
            <Icon className="w-6 h-6 text-terracotta" />
          </div>

          <h4 className="text-sm font-black text-charcoal text-center mb-1">{title}</h4>"""

replacement_helper_top = """      <div className="bg-white rounded-none border border-sand-200 p-6 shadow-sm flex flex-col justify-between min-h-[18rem] h-auto relative overflow-hidden transition-all duration-300 hover:shadow-premium hover:border-terracotta group">
        {/* Corner Badge */}
        <div className="absolute top-0 left-0 bg-terracotta text-white font-black text-[10px] tracking-wider px-3.5 py-1.5 rounded-none shadow-sm">
          {number}
        </div>

        <div className="flex flex-col items-center flex-1 w-full">
          {/* Square Icon Container */}
          <div className="w-14 h-14 rounded-none bg-sand-50 border border-sand-200 flex items-center justify-center mb-4 group-hover:bg-terracotta/5 transition-colors">
            <Icon className="w-6 h-6 text-terracotta" />
          </div>

          <h4 className="text-sm font-black text-charcoal text-center mb-1">
            {title} {isMandatory && <span className="text-red-500 font-bold ml-1">*</span>}
          </h4>"""

# 2. Update inside renderDocCard: inner containers to rounded-none
target_helper_inner = """          {/* Bottom Upload/Attachment area */}
        {value ? (
          <div className="bg-sand-50/80 border border-sand-200 rounded-2xl p-3 flex items-center justify-between mt-auto w-full">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="bg-red-50 text-red-500 p-2 rounded-xl flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[11px] font-black text-charcoal truncate max-w-[100px] sm:max-w-[120px]" title={getFileName(value)}>
                  {getFileName(value)}
                </p>
                <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider">
                  Uploaded File
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <a
                href={getImageUrl(value)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 hover:bg-sand-200 rounded-lg text-charcoal-muted hover:text-terracotta transition-colors"
                title="View File"
              >
                <Eye className="w-4 h-4" />
              </a>
              
              <label className="p-1.5 hover:bg-sand-200 rounded-lg text-charcoal-muted hover:text-terracotta cursor-pointer transition-colors" title="Change File">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept={accept}
                  onChange={(e) => handleDocUpload(e.target.files[0], docType)}
                  className="hidden"
                  disabled={uploadingDocs[docType]}
                />
              </label>
            </div>
          </div>
        ) : (
          <label className="w-full border-2 border-dashed border-sand-300 hover:border-terracotta bg-white hover:bg-sand-50/50 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[7rem] mt-auto">
            <div className="bg-sand-50 p-2.5 rounded-2xl mb-2 flex items-center justify-center">
              {uploadingDocs[docType] ? (
                <div className="w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-charcoal-muted" />
              )}
            </div>"""

replacement_helper_inner = """          {/* Bottom Upload/Attachment area */}
        {value ? (
          <div className="bg-sand-50/80 border border-sand-200 rounded-none p-3 flex items-center justify-between mt-auto w-full">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="bg-red-50 text-red-500 p-2 rounded-none flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[11px] font-black text-charcoal truncate max-w-[100px] sm:max-w-[120px]" title={getFileName(value)}>
                  {getFileName(value)}
                </p>
                <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider">
                  Uploaded File
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <a
                href={getImageUrl(value)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 hover:bg-sand-200 rounded-none text-charcoal-muted hover:text-terracotta transition-colors"
                title="View File"
              >
                <Eye className="w-4 h-4" />
              </a>
              
              <label className="p-1.5 hover:bg-sand-200 rounded-none text-charcoal-muted hover:text-terracotta cursor-pointer transition-colors" title="Change File">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept={accept}
                  onChange={(e) => handleDocUpload(e.target.files[0], docType)}
                  className="hidden"
                  disabled={uploadingDocs[docType]}
                />
              </label>
            </div>
          </div>
        ) : (
          <label className="w-full border-2 border-dashed border-sand-300 hover:border-terracotta bg-white hover:bg-sand-50/50 rounded-none p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[7rem] mt-auto">
            <div className="bg-sand-50 p-2.5 rounded-none mb-2 flex items-center justify-center">
              {uploadingDocs[docType] ? (
                <div className="w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-charcoal-muted" />
              )}
            </div>"""

# 3. Update GST Number input label and text
target_gst_input = """          {docType === 'gst' && (
            <div className="w-full mb-3 text-left">
              <label className="text-[8px] font-black text-charcoal-muted uppercase tracking-widest block mb-1">GST Number (Optional)</label>
              <input
                type="text"
                placeholder="Enter GST Number"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-3 py-2 border border-sand-200 rounded-xl text-[11px] outline-none focus:border-terracotta font-semibold"
              />
            </div>
          )}"""

replacement_gst_input = """          {docType === 'gst' && (
            <div className="w-full mb-3 text-left">
              <label className="text-[8px] font-black text-charcoal-muted uppercase tracking-widest block mb-1">
                GST Number <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter GST Number"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-3 py-2 border border-sand-200 rounded-none text-[11px] outline-none focus:border-terracotta font-semibold"
              />
            </div>
          )}"""

# 4. Make all 5 cards in the grid mandatory
target_doc_grid = """                  {renderDocCard("01", "KYC - Owner", "Aadhaar Card / PAN Card / Passport of owner", "aadhar", aadharCard, "image/*,application/pdf", true, User)}
                  {renderDocCard("02", "Property Documents", "Property Tax / Water Tax / MSEB Bill", "property", propertyProof, "image/*,application/pdf", true, Building2)}
                  {renderDocCard("03", "Society NOC", "If not a society, then Neighbour NOC", "society", societyNoc, "image/*,application/pdf", true, Users)}
                  {renderDocCard("04", "Cancelled Cheque / Bank Statement", "Latest cancelled cheque or bank statement", "cheque", cancelledCheque, "image/*,application/pdf", true, Landmark)}
                  {renderDocCard("05", "Business License", "Shop Act License / Business License", "gst", gstCertificate, "image/*,application/pdf", false, Briefcase)}"""

replacement_doc_grid = """                  {renderDocCard("01", "KYC - Owner", "Aadhaar Card / PAN Card / Passport of owner", "aadhar", aadharCard, "image/*,application/pdf", true, User)}
                  {renderDocCard("02", "Property Documents", "Property Tax / Water Tax / MSEB Bill", "property", propertyProof, "image/*,application/pdf", true, Building2)}
                  {renderDocCard("03", "Society NOC", "If not a society, then Neighbour NOC", "society", societyNoc, "image/*,application/pdf", true, Users)}
                  {renderDocCard("04", "Cancelled Cheque / Bank Statement", "Latest cancelled cheque or bank statement", "cheque", cancelledCheque, "image/*,application/pdf", true, Landmark)}
                  {renderDocCard("05", "Business License", "Shop Act License / Business License", "gst", gstCertificate, "image/*,application/pdf", true, Briefcase)}"""

# 5. Enforce gstCertificate in handleVerifySubmit validation
target_submit_validation = """    if (!aadharCard || !propertyProof || !cancelledCheque || !societyNoc || !agreementSignature) {"""
replacement_submit_validation = """    if (!aadharCard || !propertyProof || !cancelledCheque || !societyNoc || !gstCertificate || !gstNumber || !agreementSignature) {"""

# 6. Enforce gstCertificate in disabled attribute of submit button
target_button_disabled = """disabled={verificationSubmitting || !aadharCard || !propertyProof || !cancelledCheque || !societyNoc || !agreementSignature || !verificationConsent}"""
replacement_button_disabled = """disabled={verificationSubmitting || !aadharCard || !propertyProof || !cancelledCheque || !societyNoc || !gstCertificate || !gstNumber || !agreementSignature || !verificationConsent}"""

def normalize_string(s):
    return s.replace('\r\n', '\n').replace('\r', '\n').strip()

norm_content = normalize_string(content)

# Apply updates
replacements = [
    (target_helper_top, replacement_helper_top),
    (target_helper_inner, replacement_helper_inner),
    (target_gst_input, replacement_gst_input),
    (target_doc_grid, replacement_doc_grid),
    (target_submit_validation, replacement_submit_validation),
    (target_button_disabled, replacement_button_disabled)
]

for t, r in replacements:
    norm_t = normalize_string(t)
    if norm_t not in norm_content:
        print(f"Error: Target snippet not found: {repr(norm_t[:100])}")
        sys.exit(1)
    norm_content = norm_content.replace(norm_t, r)

open(fn, 'w', encoding='utf-8').write(norm_content)
print("Successfully modified HostDashboard.js to make all cards square and mandatory.")
