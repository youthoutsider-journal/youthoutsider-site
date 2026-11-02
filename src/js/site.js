(function () {
  // today's date in the top bar
  try {
    document.getElementById('today').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch (e) {}

  // Applications: check required fields, then send to Netlify Forms
  function setup(formId, doneId, required, onOk) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      required.forEach(function (r) {
        var f = document.getElementById(r[0]), er = document.getElementById('e-' + r[0]);
        if (!f || !er || f.closest('[hidden]')) return;
        if (!f.value.trim()) { er.textContent = r[1]; f.setAttribute('aria-invalid', 'true'); ok = false; first = first || f; }
        else { er.textContent = ''; f.removeAttribute('aria-invalid'); }
      });
      var done = document.getElementById(doneId);
      if (!ok) { done.hidden = true; first.focus(); return; }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (res) {
        if (!res.ok) throw new Error('Status ' + res.status);
        done.hidden = false; done.textContent = onOk();
        form.querySelectorAll('input:not([type=hidden]), textarea').forEach(function (f) { f.value = ''; });
        btn.textContent = 'Sent';
      }).catch(function () {
        done.hidden = false;
        done.textContent = 'Something went wrong and your application wasn\'t sent. Please try again, or message us on Instagram.';
        btn.disabled = false; btn.textContent = 'Try again';
      });
    });
  }

  var prole = document.getElementById('prole'), pdw = document.getElementById('pdeskwrap');
  if (prole && pdw) {
    var psw = document.getElementById('psamplewrap'), pow = document.getElementById('poutwrap');
    var toggle = function () {
      pdw.hidden = prole.value !== 'Staff writer';
      var outreach = prole.value === 'Outreach Lead';
      if (psw) psw.hidden = outreach;
      if (pow) pow.hidden = !outreach;
    };
    prole.addEventListener('change', toggle); toggle();
  }

  setup('pform', 'done', [
    ['pname', 'Add your name.'], ['pschool', 'Add your grade.'], ['pcontact', 'Add an email or Instagram handle so we can reply.'],
    ['pexp', 'Tell us about any experience, or write N/A.'], ['pout', 'Share a few outreach ideas.'], ['pmsg', 'Tell us why you want to join.'], ['pbio', 'Write a short bio about yourself.']
  ], function () {
    return 'Thank you, ' + document.getElementById('pname').value.trim().split(' ')[0] + '. We\'ve received your application for ' + document.getElementById('prole').value + ', and we\'ll be in touch soon.';
  });

  setup('gform', 'gdone', [
    ['gname', 'Add your name.'], ['gschool', 'Add your grade.'], ['gcontact', 'Add an email or Instagram handle so we can reply.'],
    ['gpitch', 'Tell us the premise in a few sentences.'], ['gbio', 'Write a short bio about yourself.'], ['glink', 'Add a link to your piece.']
  ], function () {
    return 'Thank you. We\'ve received your ' + document.getElementById('gtype').value.toLowerCase() + ' submission, and an editor will be in touch soon.';
  });
})();
