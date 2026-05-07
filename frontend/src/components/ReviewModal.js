import React, { useState } from 'react';
import { Star, XCircle, Camera, ShieldCheck } from 'lucide-react';
import { reviewAPI } from '../services/api';
import apiClient from '../services/api';

const SUB_FIELDS = [
  { key: 'cleanliness',   label: 'Cleanliness'   },
  { key: 'communication', label: 'Communication' },
  { key: 'check_in',      label: 'Check-in'      },
  { key: 'accuracy',      label: 'Accuracy'      },
  { key: 'location',      label: 'Location'      },
  { key: 'value',         label: 'Value'         },
];

const StarRow = ({ value, onChange, testId }) => (
  <div className="flex items-center space-x-1" data-testid={testId}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        className="p-1 hover:scale-110 transition-transform"
        data-testid={`${testId}-${n}`}
        aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
      >
        <Star
          className={`w-6 h-6 ${
            n <= value ? 'fill-terracotta text-terracotta' : 'text-charcoal-light'
          }`}
        />
      </button>
    ))}
  </div>
);

const ReviewModal = ({ booking, onClose, onSubmitted }) => {
  const [overall, setOverall] = useState(0);
  const [subs, setSubs] = useState({});
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const setSub = (key, value) => setSubs({ ...subs, [key]: value });

  const handlePhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await apiClient.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotoUrl(res.data.url);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Photo upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  const submit = async () => {
    setError('');
    if (overall < 1) {
      setError('Please rate your overall experience (1–5 stars).');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        overall_rating: overall,
        comment: comment || undefined,
        photo_url: photoUrl || undefined,
        ...subs,
      };
      await reviewAPI.submit(booking.booking_id, payload);
      onSubmitted();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      data-testid="review-modal"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-sand-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-charcoal">How was your stay?</h3>
            <p className="text-xs text-charcoal-light">
              Booking {booking.booking_id}
            </p>
          </div>
          <button onClick={onClose} data-testid="review-modal-close">
            <XCircle className="w-5 h-5 text-charcoal-light" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">
              Overall rating
            </label>
            <StarRow value={overall} onChange={setOverall} testId="rating-overall" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SUB_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-sm text-charcoal-muted mb-1">{f.label}</label>
                <StarRow
                  value={subs[f.key] || 0}
                  onChange={(v) => setSub(f.key, v)}
                  testId={`rating-${f.key}`}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">
              Comment <span className="text-charcoal-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Share details that future guests would love to know…"
              className="input-field"
              data-testid="review-comment"
            />
            <p className="text-xs text-charcoal-light mt-1">{comment.length}/2000</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1 flex items-center">
              <Camera className="w-4 h-4 mr-2" />
              Photo <span className="text-charcoal-muted font-normal ml-1">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handlePhoto}
              disabled={photoUploading || submitting}
              className="text-sm"
              data-testid="review-photo-input"
            />
            {photoUploading && (
              <p className="text-xs text-charcoal-muted mt-1" data-testid="review-photo-uploading">Uploading…</p>
            )}
            {photoUrl && (
              <div className="mt-2 flex items-start space-x-2" data-testid="review-photo-preview">
                <img src={photoUrl} alt="Review preview" className="w-24 h-24 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="text-xs text-red-600 hover:underline"
                  data-testid="review-photo-remove"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center text-xs text-sage-dark bg-sage/10 rounded-lg px-3 py-2">
            <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>
              This will be published as a <strong>Verified stay</strong> review,
              tied to your confirmed booking.
            </span>
          </div>

          {error && (
            <p className="text-sm text-red-600" data-testid="review-error">{error}</p>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-sand-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-sand-300 text-charcoal hover:bg-sand-50"
            data-testid="review-cancel"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-terracotta text-white font-semibold hover:bg-terracotta-dark disabled:opacity-60"
            data-testid="review-submit"
          >
            {submitting ? 'Posting…' : 'Post review'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
