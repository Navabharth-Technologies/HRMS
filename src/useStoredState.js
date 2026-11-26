import {useState,useEffect} from 'react';
export default function useStoredState(key,initial){
 const storageKey='hrms-demo-v1:'+key;
 const [value,setValue]=useState(()=>{try{const raw=localStorage.getItem(storageKey);return raw===null?initial:JSON.parse(raw);}catch{return initial;}});
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(value));}catch(error){console.error('Unable to save demo data',error);}},[storageKey,value]);
 return [value,setValue];
}
