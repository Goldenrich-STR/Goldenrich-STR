import sys
import os

fn = r'd:\FinalSTR\Goldenrich-STR\frontend\src\pages\HostDashboard.js'
if not os.path.exists(fn):
    print("Error: File not found")
    sys.exit(1)

content = open(fn, 'r', encoding='utf-8').read()

target1 = 'disabled={verificationSubmitting || !aadharCard || !propertyProof || !cancelledCheque || !agreementSignature || !verificationConsent}'
replacement1 = 'disabled={verificationSubmitting || !aadharCard || !propertyProof || !cancelledCheque || !societyNoc || !agreementSignature || !verificationConsent}'

target2 = '{/* Terms Consent */}'
replacement2 = """{/* Security Info Strip */}
                <div className="bg-charcoal text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-8 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/10 p-2 rounded-xl text-amber-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-sand-100">
                      All documents are securely encrypted and used only for verification purposes.
                    </span>
                  </div>
                  <a href="/support" target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-terracotta hover:underline self-start sm:self-auto">
                    Need help? Contact Support
                  </a>
                </div>

                {/* Terms Consent */}"""

if target1 not in content:
    print("Error: target1 not found in content")
    sys.exit(1)

if target2 not in content:
    print("Error: target2 not found in content")
    sys.exit(1)

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)

open(fn, 'w', encoding='utf-8').write(content)
print("Successfully updated HostDashboard.js")
