const fs = require('fs');
const snippet = `
<a href="javascript:history.back()" class="floating-back-btn">
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
  <span>Back</span>
</a>
`;
const files = [
  'privacy-policy.html',
  'terms-of-service.html',
  'help-center.html',
  'features.html',
  'faq.html',
  'usecases.html',
  'security.html'
];
files.forEach(f => {
  if(fs.existsSync(f)){
    let h = fs.readFileSync(f,'utf8');
    if(!h.includes('floating-back-btn')){
      fs.writeFileSync(f, h.replace('</body>', snippet + '\n</body>'));
      console.log('Injected into ' + f);
    }
  }
});
console.log('Done');
