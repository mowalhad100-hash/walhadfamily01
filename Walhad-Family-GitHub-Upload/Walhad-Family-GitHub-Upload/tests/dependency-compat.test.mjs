import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createServer } from 'node:net';
const require = createRequire(import.meta.url);
const backendRequire = createRequire(new URL('../functions/package.json', import.meta.url));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function consumerRequire(base, name) { return createRequire(base.resolve(name)); }

// The application framework/native SDK versions are deliberately unchanged.
test('Expo, React Native and Stream versions remain at the tested baseline', () => {
  const p = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(p.dependencies.expo, '~54.0.37');
  assert.equal(p.dependencies['react-native'], '0.81.5');
  assert.equal(p.dependencies['@stream-io/video-react-native-sdk'], '1.46.2');
  assert.equal(p.dependencies['@stream-io/react-native-webrtc'], '145.4.1');
});

test('Expo Metro resolves patched PostCSS 8 and its parser/plugin/source-map APIs work', async () => {
  const scoped = consumerRequire(require, '@expo/metro-config');
  const postcss = scoped('postcss');
  assert.equal(postcss().version, '8.5.30');
  const plugin = {postcssPlugin:'compatibility-test', Declaration(decl) { if (decl.prop === 'color') decl.value = 'green'; }};
  const result = await postcss([plugin]).process('a { color: red }', {from:'input.css',to:'output.css',map:{inline:false}});
  assert.match(result.css, /color: green/);
  assert.ok(result.map.toJSON().sources.includes('input.css'));
  assert.equal(postcss.parse(result.css).first.selector, 'a');
});

test('all affected consumers resolve CommonJS UUID 11 with unchanged v4() behavior', () => {
  for (const [base,names] of [[require,['xcode','firebase-tools','gaxios']],[backendRequire,['gaxios','google-gax','teeny-request']]]) {
    for (const name of names) {
      const scoped = consumerRequire(base, name);
      assert.equal(scoped('uuid/package.json').version, '11.1.1', name);
      const ids = new Set(Array.from({length:100},()=>scoped('uuid').v4()));
      assert.equal(ids.size, 100);
      for (const id of ids) assert.match(id, uuidPattern);
    }
  }
});

test('xcode consumer generates its expected 24-character uppercase project ID', () => {
  const xcode = require('xcode');
  const project = xcode.project('not-read.pbxproj');
  project.hash = {project:{objects:{}}};
  assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
});

test('Google GAX executes its actual UUID helper', () => {
  const util = backendRequire(join(dirname(backendRequire.resolve('google-gax')), 'util.js'));
  assert.match(util.makeUUID(), uuidPattern);
});

test('Gaxios builds multipart data with the patched UUID using an in-memory adapter', async () => {
  const {Gaxios} = backendRequire('gaxios');
  let boundary;
  const response = await new Gaxios().request({
    url:'https://example.invalid/offline-test', method:'POST',
    multipart:[{headers:{'Content-Type':'text/plain'},content:'hello'}],
    adapter:async config=>{
      boundary=config.headers['Content-Type'].split('boundary=')[1];
      let body=''; for await (const chunk of config.body) body+=chunk;
      assert.match(body,/hello/); assert.ok(body.includes(boundary));
      return {config,status:200,statusText:'OK',headers:{},data:'local adapter only'};
    },
  });
  assert.match(boundary,uuidPattern); assert.equal(response.data,'local adapter only');
});

// A real local FTP control/data exchange exercises get-uri's basic-ftp consumer.
// This fixture sends no production credentials and is never used by the app.
async function ftpFixture(fallbackList=false) {
  const sockets = new Set();
  const dataServers=[];
  const control=createServer(socket=>{
    sockets.add(socket); socket.on('close',()=>sockets.delete(socket));
    socket.write('220 local dependency test\r\n');
    let buffer='', chain=Promise.resolve(), dataSocket;
    socket.on('data',chunk=>{
      buffer+=chunk;
      while(buffer.includes('\r\n')) {
        const index=buffer.indexOf('\r\n'), line=buffer.slice(0,index); buffer=buffer.slice(index+2);
        chain=chain.then(async()=>{
          const [command]=line.split(' ');
          const send=text=>socket.write(text+'\r\n');
          switch(command.toUpperCase()) {
            case 'USER':send('331 password required');break;
            case 'PASS':send('230 logged in');break;
            case 'FEAT':send('211-Features\r\n UTF8\r\n211 End');break;
            case 'MDTM':send(fallbackList?'500 MDTM unsupported':'213 20261015080000');break;
            case 'EPSV': {
              const data=createServer(s=>{dataSocket=s;sockets.add(s);s.on('close',()=>sockets.delete(s));});
              dataServers.push(data);
              await new Promise(resolve=>data.listen(0,'127.0.0.1',resolve));
              send(`229 Entering Extended Passive Mode (|||${data.address().port}|)`);break;
            }
            case 'RETR': case 'LIST': {
              assert.ok(dataSocket,'passive data socket connected');send('150 data follows');
              const content=command.toUpperCase()==='LIST'?'type=file;size=11;modify=20261015080000; hello.txt\r\n':'hello world';
              dataSocket.end(content,()=>send('226 transfer complete'));break;
            }
            case 'SIZE':send('213 11');break;
            case 'PWD':send('257 "/"');break;
            case 'QUIT':socket.end('221 goodbye\r\n');break;
            default:send('200 OK');
          }
        }).catch(e=>socket.destroy(e));
      }
    });
    socket.on('error',()=>{});
  });
  await new Promise(resolve=>control.listen(0,'127.0.0.1',resolve));
  return {url:`ftp://test:test@127.0.0.1:${control.address().port}/hello.txt`,async close(){for(const s of sockets)s.destroy();await Promise.all([control,...dataServers].map(s=>new Promise(resolve=>s.close(resolve))));}};
}
for (const fallback of [false,true]) test(`get-uri downloads through basic-ftp 6 (${fallback?'LIST fallback':'MDTM'})`, {timeout:15000}, async()=>{
  const scoped=consumerRequire(require,'get-uri');
  assert.equal(scoped('basic-ftp/package.json').version,'6.2.3');
  const fixture=await ftpFixture(fallback);
  try {
    const stream=await require('get-uri').getUri(fixture.url,{timeout:5000});
    let body='';for await(const chunk of stream)body+=chunk;
    assert.equal(body,'hello world');assert.ok(stream.lastModified instanceof Date);
  } finally { await fixture.close(); }
});

test('patched FTP parser retains Unix listing field semantics',()=>{
  const ftp=consumerRequire(require,'get-uri')('basic-ftp');
  const [file]=ftp.parseList('-rw-r--r-- 1 owner group 11 Oct 15 2026 hello.txt');
  assert.equal(file.name,'hello.txt');assert.equal(file.size,11);assert.equal(file.isFile,true);
});
