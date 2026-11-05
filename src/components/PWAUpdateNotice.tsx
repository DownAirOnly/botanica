import {useRegisterSW} from 'virtual:pwa-register/react';
import {Button} from './UI';

/** Explicit user-controlled PWA update prompt: never discard a half-entered form. */
export function PWAUpdateNotice(){
  const {
    needRefresh:[needRefresh,setNeedRefresh],
    updateServiceWorker
  }=useRegisterSW({
    onRegisteredSW(_url,registration){
      if(!registration)return;
      const check=()=>{if(document.visibilityState==='visible')void registration.update().catch(()=>{});};
      window.addEventListener('focus',check);
      document.addEventListener('visibilitychange',check);
    }
  });
  if(!needRefresh)return null;
  return <aside className="pwa-update-notice" role="status" aria-live="polite">
    <div><strong>Botanica update available</strong><small>Save any open forms before updating.</small></div>
    <Button size="sm" onClick={()=>void updateServiceWorker(true)}>Update now</Button>
    <Button size="sm" variant="ghost" onClick={()=>setNeedRefresh(false)}>Later</Button>
  </aside>;
}
