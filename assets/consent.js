(() => {
  'use strict';
  const consent = window.visionAltitudeConsent;
  if (!consent || document.querySelector('[data-consent-banner]')) return;

  const base = new URL('../', document.currentScript.src);
  const banner = document.createElement('section');
  banner.className = 'va-consent';
  banner.id = 'va-consent-banner';
  banner.dataset.consentBanner = '';
  banner.setAttribute('aria-labelledby', 'va-consent-title');
  banner.hidden = true;
  banner.innerHTML = `
    <div class="va-consent-inner">
      <div class="va-consent-copy">
        <h2 id="va-consent-title" tabindex="-1">Votre choix de t&eacute;moins</h2>
        <p>Google Analytics mesure les visites avec votre accord. Vous pouvez refuser sans affecter la navigation. Publicit&eacute; d&eacute;sactiv&eacute;e.</p>
        <a class="va-consent-policy">En savoir plus sur les t&eacute;moins</a>
      </div>
      <div class="va-consent-actions">
        <button type="button" data-consent-accept>Accepter</button>
        <button type="button" data-consent-reject>Refuser</button>
        <button type="button" class="va-consent-cancel" data-consent-cancel hidden>Fermer</button>
      </div>
    </div>`;
  banner.querySelector('.va-consent-policy').href = new URL('cookies/', base).href;
  document.body.appendChild(banner);

  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'va-consent-settings';
  settings.dataset.consentSettings = '';
  settings.textContent = 'Pr\u00e9f\u00e9rences de t\u00e9moins';
  settings.setAttribute('aria-controls', banner.id);
  const footer = document.querySelector('.footer-legal-column') || document.querySelector('footer');
  (footer || document.body).appendChild(settings);

  const status = document.createElement('p');
  status.className = 'va-consent-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  settings.after(status);

  const title = banner.querySelector('h2');
  const cancel = banner.querySelector('[data-consent-cancel]');
  let manuallyOpened = false;
  let previousFocus;
  const sync = () => {
    banner.hidden = !manuallyOpened && consent.getChoice() !== null;
    cancel.hidden = !manuallyOpened || consent.getChoice() === null;
    settings.setAttribute('aria-expanded', String(!banner.hidden));
  };
  const close = () => {
    manuallyOpened = false;
    sync();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  };
  const choose = (analytics) => {
    const persisted = consent.setAnalytics(analytics);
    close();
    status.textContent = persisted
      ? (analytics ? 'Mesure des visites accept\u00e9e.' : 'Mesure des visites refus\u00e9e.')
      : 'Choix appliqu\u00e9 pour cette page. Votre navigateur ne permet pas de le conserver.';
  };
  banner.querySelector('[data-consent-accept]').addEventListener('click', () => choose(true));
  banner.querySelector('[data-consent-reject]').addEventListener('click', () => choose(false));
  settings.addEventListener('click', () => {
    previousFocus = document.activeElement;
    manuallyOpened = true;
    sync();
    title.focus({ preventScroll: true });
  });
  cancel.addEventListener('click', close);
  banner.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && manuallyOpened && consent.getChoice()) {
      event.preventDefault();
      close();
    }
  });
  window.addEventListener('va:consent-change', sync);
  sync();
})();
