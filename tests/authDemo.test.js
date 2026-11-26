import test from 'node:test';import assert from 'node:assert/strict';import {resolveLogin,validSession,derive} from '../src/authDemo.js';
const admins=[{id:'a',email:'a@example.com',status:'Active'},{id:'b',email:'b@example.com',status:'Inactive'}];
test('only active admin email resolves',()=>{assert.equal(resolveLogin(' A@example.com ',admins),'a');assert.equal(resolveLogin('b@example.com',admins),undefined);});
test('session invalid after reset or deactivation',()=>{const accounts={a:{version:'1'}};assert.equal(validSession({id:'a',version:'1'},admins,accounts),true);assert.equal(validSession({id:'a',version:'2'},admins,accounts),false);assert.equal(validSession({id:'a',version:'1'},[],accounts),false);});
test('password derivation uses salt',async()=>{assert.notEqual(await derive('password123','a'),await derive('password123','b'));});
