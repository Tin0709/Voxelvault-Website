import ProgressBar from '../components/ui/ProgressBar';
import { confirmAction } from '../lib/confirm';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../lib/useApi';
import { api, uploadFile } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import FileDropZone from '../components/ui/FileDropZone';
import RequestState from '../components/ui/RequestState';
import Icon from '../components/ui/Icon';
import { notify } from '../lib/notifications';

const inputClass = 'mt-2 w-full rounded-xl border border-white/20 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60';
const buttonClass = 'rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:opacity-50';
const regions = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = 'AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ').map(code => ({ code, name: regions.of(code) })).sort((a,b) => a.name.localeCompare(b.name));

function ProfileForm({ initial }) {
  const [profile, setProfile] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [country, setCountry] = useState(initial.country);
  const [avatar, setAvatar] = useState(null);
  const [cover,setCover]=useState(null);
  const [coverRemoved,setCoverRemoved]=useState(false);
  const cachedCover=useRef(null);
  useEffect(()=>()=>{if(cover)URL.revokeObjectURL(cover.url);},[cover]);
  function chooseCover(files) {
    if(saving)return;
    const file=files[0];
    if(files.length!==1 || !['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(file?.type) || !file.size || file.size>5_000_000){setError('Choose one cover image up to 5 MB.');return;}
    cachedCover.current=null;setCover({file,url:URL.createObjectURL(file)});setCoverRemoved(false);setError('');setMessage('');
  }
  const [removed, setRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [progressName,setProgressName] = useState('Uploading profile image…');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const cachedUpload = useRef(null);
  const [email, setEmail] = useState(initial.email || '');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  useEffect(() => () => { if (avatar) URL.revokeObjectURL(avatar.url); }, [avatar]);
  useEffect(() => {
    const prevent = event => { if (Array.from(event.dataTransfer?.types ?? []).includes('Files')) event.preventDefault(); };
    window.addEventListener('drop',prevent); window.addEventListener('dragover',prevent);
    return () => { window.removeEventListener('drop',prevent); window.removeEventListener('dragover',prevent); };
  }, []);
  function chooseAvatar(files) {
    if (saving) return;
    setError(''); setMessage('');
    if (files.length !== 1) { setError('Choose one avatar image at a time.'); return; }
    const file = files[0];
    if (!['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(file.type) || file.size === 0 || file.size > 5_000_000) {
      setError('Choose a JPG, PNG, WebP, AVIF or GIF image up to 5 MB.'); return;
    }
    cachedUpload.current = null;
    setAvatar({file,url:URL.createObjectURL(file)}); setRemoved(false);
  }
  const avatarUrl = avatar?.url || (!removed && profile.avatarUrl);
  async function save(event) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      let avatarId = removed ? null : profile.avatarId;
      if (avatar) {
        if (!cachedUpload.current) { setProgressName(avatar.file.name); setProgress(0); cachedUpload.current = await uploadFile(avatar.file,'image',setProgress); }
        avatarId = cachedUpload.current.id;
      }
      let coverId=coverRemoved?null:profile.coverId;
      if(cover){if(!cachedCover.current){setProgressName(cover.file.name);setProgress(0);cachedCover.current=await uploadFile(cover.file,'image',setProgress);}coverId=cachedCover.current.id;}
      const result = await api('/me/profile',{method:'POST',body:JSON.stringify({name,bio,country,avatarId,coverId,version:profile.version})});
      setProfile(result); setName(result.name); setAvatar(null); setRemoved(false); cachedUpload.current=null;
      setCover(null);setCoverRemoved(false);cachedCover.current=null;
      setMessage('Your profile has been saved.');
    } catch (error) { setError(error.message); }
    finally { setSaving(false); setProgress(null); }
  }
  async function changeEmail(event) {
    event.preventDefault(); setEmailBusy(true); setEmailMessage(''); setEmailError('');
    try {
      const { error } = await supabase.auth.updateUser({email:email.trim()}, {emailRedirectTo:`${window.location.origin}/login`});
      if (error) throw error;
      notify('Check your inbox to confirm your new email address.','info','Confirmation requested');
      setEmailMessage('Check your inbox to confirm the change. You may need to confirm both your current and new email addresses. Your sign-in email stays unchanged until confirmation.');
    } catch(error) { setEmailError(error.message); }
    finally { setEmailBusy(false); }
  }
  return <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-14">
    <p className="text-xs uppercase tracking-[0.2em] text-primary">Your account</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Edit your profile</h1>
    <p className="mt-3 text-sm text-on-surface-variant">Make yourself at home. Choose how you appear on VoxelVault.</p>
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="vault-panel space-y-2 p-4 lg:sticky lg:top-28" aria-label="Profile settings">
        <a href="#identity" className="vault-settings-link"><Icon name="image"/>Visual identity</a>
        <a href="#personal" className="vault-settings-link"><Icon name="user"/>Public information</a>
        <a href="#account-email" className="vault-settings-link"><Icon name="mail"/>Account email</a>
        <Link to="/profile" className="vault-settings-link"><Icon name="eye"/>View my profile</Link>
        <p className="border-t border-white/10 pt-4 text-xs leading-relaxed text-on-surface-variant">Your public canvas, your identity. Save when you are ready to share your changes.</p>
      </aside><div className="min-w-0">
    <form id="identity" onSubmit={save} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <fieldset disabled={saving} className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-semibold"><Icon name="image" className="text-primary"/>Visual identity</h2><Link to={`/creators/${profile.id}`} className="text-sm text-primary hover:underline">View public profile ↗</Link></div>
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-primary/5">
          {(cover?.url || (!coverRemoved&&profile.coverUrl)) ? <img src={cover?.url || profile.coverUrl} alt="Cover preview" className="aspect-[16/5] w-full object-cover"/> : <div className="flex aspect-[16/5] items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/5 text-primary"><Icon name="image" className="!h-10 !w-10"/></div>}
                  {(cover || (!coverRemoved&&profile.coverId))&&<button type="button" onClick={async()=>{if(!await confirmAction('Remove your cover image? Save to apply the change.'))return;setCover(null);setCoverRemoved(true);cachedCover.current=null;}} aria-label="Remove cover" title="Remove cover" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-red-200 hover:bg-black"><Icon name="trash"/></button>}
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-primary">PUBLIC COVER</span>
        </div>
        <FileDropZone label="Choose cover image" prompt="Drop a new background image" hint="Landscape recommended · Up to 5 MB · Public image" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple={false} disabled={saving} onFiles={chooseCover}/>

        <div className="flex flex-col items-center justify-center gap-5 rounded-xl text-center bg-black/20 p-4">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-primary/10 text-3xl text-primary">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" /> : name.trim().slice(0,2).toUpperCase() || 'VV'}
          </div>
          <div><p className="font-medium">Profile photo</p><p className="mt-1 text-xs text-on-surface-variant">Your photo is public.</p>{avatarUrl && <button type="button" onClick={async() => {if(!await confirmAction('Remove your profile photo? Save to apply the change.'))return;setAvatar(null);setRemoved(true);cachedUpload.current=null;setMessage('');}} className="mt-3 text-sm text-primary hover:underline">Remove photo</button>}</div>
        </div>
        <FileDropZone label="Choose your profile photo" prompt="Drag & drop your photo here" hint="JPG, PNG, WebP, AVIF or GIF · Up to 5 MB. Changes upload when you save." accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple={false} disabled={saving} onFiles={chooseAvatar} />
        <h2 id="personal" className="flex scroll-mt-32 items-center gap-2 border-t border-white/10 pt-6 text-xl font-semibold"><Icon name="user" className="text-primary"/>Public information</h2>
        <label className="block text-sm font-medium">Display name<input className={inputClass} value={name} onChange={e=>{setName(e.target.value);setMessage('');}} required maxLength={50} autoComplete="nickname" /></label>
        <label className="block text-sm font-medium">Country of residence<select className={inputClass} value={country} onChange={e=>{setCountry(e.target.value);setMessage('');}} autoComplete="country"><option value="">Prefer not to say</option>{countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
        <label className="block text-sm font-medium">About you<textarea className={`${inputClass} resize-y`} value={bio} onChange={e=>{setBio(e.target.value);setMessage('');}} maxLength={1000} rows={4} placeholder="Tell people a little about yourself and what you create." /></label>
        <p className="text-xs text-on-surface-variant">Your name, photo, country and bio are public. Your email is private.</p>
        {progress !== null && <ProgressBar label={progressName} value={progress}/> }
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
        <button className={buttonClass} disabled={saving}><Icon name="save"/> {saving?'Saving…':'Save changes'}</button>
      </fieldset>
    </form>
    <form id="account-email" onSubmit={changeEmail} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <h2 className="text-xl font-semibold">Email address</h2>
      <p className="mt-2 text-sm text-on-surface-variant">Used for your account. Changing it requires email confirmation.</p>
      <label className="mt-5 block text-sm font-medium">Email<input className={inputClass} type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" disabled={emailBusy} /></label>
      {emailMessage && <p role="status" className="mt-4 text-sm text-primary">{emailMessage}</p>}
      {emailError && <p role="alert" className="mt-4 text-sm text-red-300">{emailError}</p>}
      <button className={`${buttonClass} mt-5`} disabled={emailBusy || email.trim()===initial.email}>{emailBusy?'Sending…':'Confirm email change'}</button>
    </form>
    </div></div>
  </main>;
}
export default function ProfileBasicsPage() {
  const { user } = useAuth();
  const {data,loading,error} = useApi('/me/profile');
  if (loading || error) return <RequestState loading={loading} error={error} />;
  return <ProfileForm key={user.id} initial={data} />;
}
