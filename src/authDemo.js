// Local demonstration only. Browser storage is not an authorization boundary.
export const SUPER_EMAIL='superadmin@hrms.local';
export const AUTH_KEY='hrms-demo-auth-v1';
export const SESSION_KEY='hrms-demo-session-v1';
export const readAccounts=()=>JSON.parse(localStorage.getItem(AUTH_KEY)||'{}');
export async function derive(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:210000,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');}
export async function setCredential(id,password,temporary=false){if(password.length<8)throw Error('Use at least 8 characters.');const salt=crypto.randomUUID();const hash=await derive(password,salt);localStorage.setItem(AUTH_KEY,JSON.stringify({...readAccounts(),[id]:{salt,hash,temporary,version:crypto.randomUUID()}}));}
export async function verify(id,password){const a=readAccounts()[id];return !!a&&await derive(password,a.salt)===a.hash;}
export function validSession(session,admins,accounts){return !!session&&!!accounts[session.id]&&accounts[session.id].version===session.version&&(session.id==='super'||admins.some(a=>a.id===session.id&&a.status==='Active'));}
export function resolveLogin(email,admins){const e=email.trim().toLowerCase();return e===SUPER_EMAIL?'super':admins.find(a=>a.email.toLowerCase()===e&&a.status==='Active')?.id;}
