// Outlook on the web puts sponsored mail items and an "ad blocker detected"
// panel into the page itself, so network filtering cannot remove them. This
// script hides them in the DOM. It matches the visible "Ad" labels and the
// notice text instead of CSS classes, which Outlook generates and rotates.
export const OUTLOOK_HOSTS =
  /^(outlook\.(live|office|office365)\.com|outlook\.cloud\.microsoft)$/;

export const AD_PLACEHOLDER_CLEANUP_SCRIPT = `(() => {
  if (window.__ferdiumAdCleanup) return;
  window.__ferdiumAdCleanup = true;

  const AD_LABELS = new Set(['anuncio', 'ad', 'advertisement', 'sponsored',
    'anúncio', 'publicité', 'werbung', 'annuncio']);
  const NOTICE = /(ad ?blocker|bloqueador de anuncios|bloqueur de publicit|anzeigenblocker|bloqueador de an[uú]ncios)/i;
  const hide = el => {
    if (el && el.style.display !== 'none') {
      el.style.setProperty('display', 'none', 'important');
    }
  };

  const hasRealContent = el =>
    el.querySelector('[role="listbox"], [role="main"], [role="tree"]');

  // Climbs from a text node to the ad item that contains it, stopping before
  // the container would include other content. Height limits the climb for
  // list rows (a row is one line of the list, its parent is the whole list);
  // text length limits it for free-standing panels.
  const adContainer = (node, isRow) => {
    let box = node.parentElement;
    while (box.parentElement && box.parentElement !== document.body &&
           !hasRealContent(box.parentElement) &&
           (isRow
             ? box.parentElement.getBoundingClientRect().height < 110
             : box.parentElement.textContent.length < 400)) {
      box = box.parentElement;
    }
    return box;
  };

  const hideAds = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue.trim();
      if (text.length === 0 || text.length > 300 || !node.parentElement) continue;
      if (AD_LABELS.has(text.toLowerCase())) {
        hide(adContainer(node, true));
      } else if (NOTICE.test(text)) {
        hide(adContainer(node, false));
      }
    }
  };

  let timer;
  const run = () => {
    timer = undefined;
    hideAds();
  };
  new MutationObserver(() => {
    if (timer === undefined) timer = setTimeout(run, 300);
  }).observe(document.body, { childList: true, subtree: true });
  run();
})();`;
