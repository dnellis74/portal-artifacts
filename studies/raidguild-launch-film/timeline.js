export const DURATION=85;
export const SONG_OFFSET=3;
export const boundaries=[0,3,9.8,14.5,15.875,17.25,18.625,20,22.6,26.2,29.75,33.3,34.44,37.92,41.72,45.16,48.58,50.96,52.1,55.2,59.1,61.1,62.6,64.1,65.6,67.6,69.8,72,78,81,DURATION];
export const shotNames=['Signal','Builder-owned collective','Let it catch','Ven · Archive','TW · Archive','Suede · Archive','Louchi · Latest','The windshield crack','Dekan · Knowledge','ECWireless · Infrastructure','Louchi · Brand','Louchi · Continuation','Horizon flyover','Stars · 150 members','Together','Ours · 88+ raids','Beside us','An open seat','Either side','Horizon reprise','Own this ride','Desert Walker','Sirocco Oasis','The Last Mile','Becoming AI-first','Portal vertical scroll','Website vertical scroll','Built / Owned / Come ride','Venture beyond','Louchi Design Era'];
export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export const shot=t=>{const last=shotNames.length-1;return Math.max(0,Math.min(last,boundaries.findIndex((b,i)=>i<shotNames.length&&t>=b&&t<boundaries[i+1])<0?last:boundaries.findIndex((b,i)=>i<shotNames.length&&t>=b&&t<boundaries[i+1])))};
export function beat(t,music){let a=music.beats;let lo=0,hi=a.length;while(lo<hi){let m=(lo+hi)>>1;if(a[m]<=t)lo=m+1;else hi=m}return Math.exp(-(t-(a[lo-1]??-99))*15)}
