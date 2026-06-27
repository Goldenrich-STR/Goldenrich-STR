import os
import sys

fn = r'd:\FinalSTR\Goldenrich-STR\frontend\src\pages\HostDashboard.js'
if not os.path.exists(fn):
    print("Error: HostDashboard.js not found")
    sys.exit(1)

content = open(fn, 'r', encoding='utf-8').read()

# Submit button disabled condition to require shopAct instead of gstCertificate/gstNumber
target_button_disabled = """disabled={verificationSubmitting || !aadharCard || !propertyProof || !cancelledCheque || !societyNoc || !gstCertificate || !gstNumber || !agreementSignature || !verificationConsent}"""
replacement_button_disabled = """disabled={verificationSubmitting || !aadharCard || !propertyProof || !cancelledCheque || !societyNoc || !shopAct || !agreementSignature || !verificationConsent}"""

def normalize_string(s):
    return s.replace('\r\n', '\n').replace('\r', '\n').strip()

norm_content = normalize_string(content)
norm_target = normalize_string(target_button_disabled)

if norm_target not in norm_content:
    print(f"Error: Target snippet not found: {repr(norm_target[:100])}")
    sys.exit(1)

norm_content = norm_content.replace(norm_target, replacement_button_disabled)

open(fn, 'w', encoding='utf-8').write(norm_content)
print("Successfully updated submit button disabled check in HostDashboard.js.")
