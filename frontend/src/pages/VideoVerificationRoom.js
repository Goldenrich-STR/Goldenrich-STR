import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Video, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { verificationAPI } from '../services/api';

const VideoVerificationRoom = ({ role = 'host' }) => {
  const navigate = useNavigate();
  const { verificationId: routeVerificationId, propertyId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const verificationId = routeVerificationId || searchParams.get('verificationId');

  useEffect(() => {
    let mounted = true;
    const loadVerification = async () => {
      setLoading(true);
      setError('');
      try {
        let selected = null;
        if (verificationId) {
          const response = await verificationAPI.getCase(verificationId);
          selected = response.data;
        } else {
          const response = await verificationAPI.listCases();
          selected = (response.data?.cases || []).find((item) => item.property_id === propertyId);
        }
        if (!selected) {
          throw new Error('Video verification appointment not found.');
        }
        if (!selected.jitsi_room_name) {
          throw new Error('Video room is not ready yet. Please ask telecaller to schedule verification again.');
        }
        if (mounted) setVerification(selected);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || err.message || 'Unable to open video verification.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadVerification();
    return () => {
      mounted = false;
    };
  }, [propertyId, verificationId]);

  const meetingUrl = useMemo(() => {
    if (!verification?.jitsi_room_name) return '';
    const displayName = encodeURIComponent(user?.full_name || (role === 'host' ? hostLabel(verification) : 'Telecaller'));
    const roomName = encodeURIComponent(verification.jitsi_room_name);
    return `https://meet.jit.si/${roomName}#userInfo.displayName="${displayName}"&config.prejoinPageEnabled=false&config.requireDisplayName=false&config.disableDeepLinking=true&config.startWithAudioMuted=true&config.startWithVideoMuted=true&interfaceConfig.SHOW_JITSI_WATERMARK=true`;
  }, [role, user?.full_name, verification?.jitsi_room_name]);

  const scheduledLabel = [verification?.scheduled_date, verification?.scheduled_start_time].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-slate-50 p-3 text-slate-950">
      <main className="mx-auto max-w-6xl">
        {loading ? (
          <div className="flex h-[62vh] items-center justify-center rounded-lg bg-slate-950 text-white">
            <div className="text-center">
              <Video className="mx-auto mb-3 h-8 w-8" />
              <p className="font-black">Preparing secure video verification...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>
        ) : (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">Video Verification in Progress</p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {hostLabel(verification)} / {verification?.property?.title || 'Property'}{scheduledLabel ? ` / ${scheduledLabel}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  {verification?.scheduled_start_time || '00:00'}
                </span>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">Record</span>
                <button
                  type="button"
                  onClick={() => navigate(role === 'host' ? '/host/dashboard' : '/telecaller/dashboard')}
                  className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                  title="Back"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <iframe
                title="X-Space360 Video Verification"
                src={meetingUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="h-[58vh] w-full rounded-lg border border-slate-800 bg-black"
              />
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Please keep camera and microphone permissions enabled for smooth property verification.
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

function hostLabel(verification) {
  return verification?.host?.full_name || verification?.host?.name || 'Host';
}

export default VideoVerificationRoom;
