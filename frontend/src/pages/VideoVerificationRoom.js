import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, Video, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { verificationAPI } from '../services/api';

const CHECKLIST = [
  ['host_identity_confirmed', 'Host identity confirmed'],
  ['host_mobile_confirmed', 'Host mobile confirmed'],
  ['host_name_matches_kyc', 'Host name matches KYC'],
  ['property_visible_on_video', 'Property shown live'],
  ['property_entrance_verified', 'Entrance verified'],
  ['property_name_verified', 'Property name verified'],
  ['address_location_verified', 'Address/location confirmed'],
  ['bedrooms_verified', 'Rooms verified'],
  ['amenities_verified', 'Amenities verified'],
  ['document_name_checked', 'Document names checked'],
  ['bank_document_checked', 'Bank document checked'],
  ['video_completed', 'Video verification completed'],
];

const isChecked = (value) => ['yes', 'true', true].includes(value);

const loadJitsiApi = (baseUrl) => new Promise((resolve, reject) => {
  if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI);
  const existing = document.querySelector('script[data-xspace-jitsi]');
  if (existing) {
    existing.addEventListener('load', () => resolve(window.JitsiMeetExternalAPI));
    existing.addEventListener('error', () => reject(new Error('Unable to load Jitsi meeting client.')));
    return;
  }
  const script = document.createElement('script');
  script.src = `${baseUrl}/external_api.js`;
  script.async = true;
  script.dataset.xspaceJitsi = 'true';
  script.onload = () => window.JitsiMeetExternalAPI ? resolve(window.JitsiMeetExternalAPI) : reject(new Error('Jitsi meeting client is unavailable.'));
  script.onerror = () => reject(new Error('Unable to load Jitsi meeting client.'));
  document.body.appendChild(script);
});

const VideoVerificationRoom = ({ role = 'host' }) => {
  const navigate = useNavigate();
  const { verificationId: routeVerificationId, propertyId } = useParams();
  const [searchParams] = useSearchParams();
  const isTelecallerView = role === 'telecaller'
    || window.location.pathname.startsWith('/verification/video/')
    || window.location.pathname.startsWith('/telecaller/verification/');
  const effectiveRole = isTelecallerView ? 'telecaller' : 'host';
  const { user } = useAuth();
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const recordingRef = useRef(null);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [consent, setConsent] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('NOT_STARTED');
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [checklist, setChecklist] = useState({});
  const [remarks, setRemarks] = useState('');
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [submittingToBm, setSubmittingToBm] = useState(false);
  const [checklistNotice, setChecklistNotice] = useState('');
  const verificationId = routeVerificationId || searchParams.get('verificationId');
  const baseUrl = useMemo(() => String(verification?.jitsi_meet_base_url || 'https://meet.jit.si').replace(/\/$/, ''), [verification?.jitsi_meet_base_url]);
  const domain = useMemo(() => new URL(baseUrl).host, [baseUrl]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = verificationId ? await verificationAPI.getCase(verificationId) : await verificationAPI.listCases();
        const selected = verificationId ? response.data : (response.data?.cases || []).find((item) => item.property_id === propertyId);
        if (!selected?.jitsi_room_name) throw new Error('Video room is not ready yet. Please ask telecaller to schedule verification again.');
        if (active) {
          setVerification(selected);
          setRecordingStatus(selected.recording_status || 'NOT_STARTED');
          setChecklist(selected.telecaller_checklist || {});
          setRemarks(selected.telecaller_remarks || '');
        }
      } catch (err) {
        if (active) setError(err?.response?.data?.detail || err.message || 'Unable to open video verification.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [propertyId, verificationId]);

  useEffect(() => {
    if (!verification?.jitsi_room_name || !containerRef.current) return undefined;
    let disposed = false;
    let api;
    loadJitsiApi(baseUrl).then((JitsiMeetExternalAPI) => {
      if (disposed || !containerRef.current) return;
      api = new JitsiMeetExternalAPI(domain, {
        roomName: verification.jitsi_room_name,
        parentNode: containerRef.current,
        ...(verification.jitsi_jwt ? { jwt: verification.jitsi_jwt } : {}),
        userInfo: { displayName: user?.full_name || (effectiveRole === 'host' ? hostName(verification) : 'Telecaller') },
        configOverwrite: { prejoinPageEnabled: false, requireDisplayName: false, disableDeepLinking: true, startWithAudioMuted: true, startWithVideoMuted: true },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: true },
      });
      apiRef.current = api;
      api.addEventListener('videoConferenceJoined', () => setJoined(true));
      api.addEventListener('recordingStatusChanged', (event = {}) => {
        if (event.mode && event.mode !== 'file') return;
        if (event.on) {
          setRecordingStatus('RECORDING');
          setError('');
          return;
        }
        if (event.error) {
          setRecordingStatus('FAILED');
          setError(`Recording failed: ${event.error}`);
          if (recordingRef.current && effectiveRole === 'telecaller') {
            verificationAPI.stopVideoRecording(verification.verification_id).catch(() => null);
          }
          recordingRef.current = null;
        }
      });
      api.addEventListener('readyToClose', () => {
        setJoined(false);
        if (recordingRef.current && effectiveRole === 'telecaller') verificationAPI.stopVideoRecording(verification.verification_id).catch(() => null);
      });
    }).catch((err) => !disposed && setError(err.message));
    return () => { disposed = true; api?.dispose(); apiRef.current = null; };
  }, [baseUrl, domain, effectiveRole, user?.full_name, verification]);

  const startRecording = async () => {
    if (!consent) return setError('Host recording consent is required.');
    if (!joined || !apiRef.current) return setError('Join the video room before starting recording.');
    setRecordingBusy(true); setError('');
    try {
      const response = await verificationAPI.startVideoRecording(verification.verification_id, { consent_confirmed: true });
      recordingRef.current = response.data.recording_session;
      await apiRef.current.executeCommand('startRecording', { mode: 'file', shouldShare: false, extraMetadata: { verificationId: verification.verification_id, recordingSessionId: recordingRef.current?.session_id } });
      setRecordingStatus('START_REQUESTED');
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Unable to start secure recording.');
    } finally { setRecordingBusy(false); }
  };

  const stopRecording = async () => {
    if (!recordingRef.current || !apiRef.current) return;
    setRecordingBusy(true);
    try {
      await apiRef.current.executeCommand('stopRecording', { mode: 'file' });
      await verificationAPI.stopVideoRecording(verification.verification_id);
      setRecordingStatus('STOP_REQUESTED');
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Unable to stop secure recording.');
    } finally { setRecordingBusy(false); }
  };

  const recordingEnabled = effectiveRole === 'telecaller' && verification?.jitsi_recording_enabled;
  const checklistDone = CHECKLIST.filter(([key]) => isChecked(checklist[key])).length;

  const saveChecklist = async () => {
    if (!verification?.verification_id) return;
    setChecklistSaving(true);
    setChecklistNotice('');
    try {
      await verificationAPI.saveTelecallerChecklist(verification.verification_id, {
        checklist,
        remarks,
        video_url: verification.telecaller_video_url || '',
      });
      setChecklistNotice('Checklist saved successfully.');
    } catch (err) {
      setChecklistNotice(err?.response?.data?.detail || err.message || 'Unable to save checklist.');
    } finally {
      setChecklistSaving(false);
    }
  };

  const submitToBranchManager = async () => {
    if (!verification?.verification_id) return;
    if (checklistDone !== CHECKLIST.length) {
      setChecklistNotice('Complete all checklist points before sending to Branch Manager.');
      return;
    }
    if (!remarks.trim()) {
      setChecklistNotice('Telecaller notes are required before sending to Branch Manager.');
      return;
    }
    setSubmittingToBm(true);
    setChecklistNotice('');
    try {
      await verificationAPI.saveTelecallerChecklist(verification.verification_id, {
        checklist,
        remarks: remarks.trim(),
        video_url: verification.telecaller_video_url || '',
      });
      await verificationAPI.telecallerDecision(verification.verification_id, {
        result: 'VERIFIED',
        remarks: remarks.trim(),
        video_url: verification.telecaller_video_url || '',
      });
      setChecklistNotice('Verification sent to Branch Manager successfully.');
      setVerification((current) => current ? {
        ...current,
        current_stage: 'BM_REVIEW_PENDING',
        current_status: 'BM_REVIEW_PENDING',
        workflow_status: 'BM_REVIEW_PENDING',
        telecaller_checklist: checklist,
        telecaller_remarks: remarks.trim(),
      } : current);
    } catch (err) {
      setChecklistNotice(err?.response?.data?.detail || err.message || 'Unable to send verification to Branch Manager.');
    } finally {
      setSubmittingToBm(false);
    }
  };

  return <div className="min-h-screen bg-slate-50 p-3 text-slate-950"><main className="mx-auto max-w-6xl">
    {loading ? <div className="flex h-[62vh] items-center justify-center rounded-lg bg-slate-950 text-white"><div className="text-center"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" /><p className="font-black">Preparing secure video verification...</p></div></div>
      : !verification ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>
        : <section><div className="mb-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm"><div><p className="text-sm font-black">Video Verification in Progress</p><p className="text-xs font-semibold text-slate-500">{hostName(verification)} / {verification?.property?.title || 'Property'}</p></div><button type="button" onClick={() => navigate(effectiveRole === 'host' ? '/host/dashboard' : '/telecaller/dashboard')} className="rounded-lg border border-slate-200 p-2"><XCircle className="h-5 w-5" /></button></div>
          <div className={effectiveRole === 'telecaller' ? 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]' : ''}>
          <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm"><div ref={containerRef} className="h-[58vh] w-full overflow-hidden rounded-lg bg-black" />
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">This verification call may be recorded for verification, fraud prevention and compliance.</div>
            {recordingEnabled && <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3"><label className="flex max-w-xl items-start gap-2 text-xs font-semibold"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I confirm the host has been informed and consented to recording.</label><button type="button" disabled={recordingBusy || !joined || ['START_REQUESTED', 'RECORDING'].includes(recordingStatus)} onClick={startRecording} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-50">Start secure recording</button>{['START_REQUESTED', 'RECORDING'].includes(recordingStatus) && <button type="button" disabled={recordingBusy} onClick={stopRecording} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black uppercase text-red-700">Stop recording</button>}<span className="text-xs font-black text-blue-700">Recording: {recordingStatus.replace(/_/g, ' ')}</span></div>}
            {error && <div className="mt-2 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}</div>
          {effectiveRole === 'telecaller' && <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:max-h-[72vh] lg:overflow-y-auto">
            <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-black">Verification Checklist</p><p className="text-xs font-bold text-slate-500">{checklistDone}/{CHECKLIST.length}</p></div>
            <div className="space-y-1.5">{CHECKLIST.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={isChecked(checklist[key])} onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked ? 'yes' : 'no' }))} className="h-3.5 w-3.5 accent-blue-600" /><span>{label}</span></label>)}</div>
            <div className="mt-3"><div className="mb-1 flex items-center justify-between"><p className="text-xs font-black">Telecaller Notes</p><p className="text-[10px] font-bold text-slate-400">{remarks.length}/500</p></div><textarea value={remarks} maxLength={500} onChange={(event) => setRemarks(event.target.value)} placeholder="Add your notes here..." className="min-h-[92px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" /></div>
            <button type="button" disabled={checklistSaving} onClick={saveChecklist} className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">{checklistSaving ? 'Saving...' : 'Save Checklist'}</button>
            <button type="button" disabled={submittingToBm || checklistDone !== CHECKLIST.length || !remarks.trim()} onClick={submitToBranchManager} className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">{submittingToBm ? 'Sending...' : 'Save & Send to BM'}</button>
            {checklistNotice && <p className="mt-2 text-xs font-bold text-blue-700">{checklistNotice}</p>}
          </aside>}
          </div></section>}
  </main></div>;
};

function hostName(verification) { return verification?.host?.full_name || verification?.host?.name || 'Host'; }
export default VideoVerificationRoom;
