/** 아주 작은 DOM 도우미. 프레임워크 없이 화면을 조립한다. */

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(4)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

/**
 * 자식 노드를 교체한다.
 * replaceChildren에 null을 그냥 넘기면 화면에 "null" 글자가 찍히므로
 * 조건부 요소(`cond ? node : null`)를 안전하게 쓰기 위해 걸러 준다.
 */
export function setChildren(node, ...children) {
  const list = children.flat(4)
    .filter((c) => c != null && c !== false)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c));
  node.replaceChildren(...list);
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** **굵게** 와 줄바꿈만 지원하는 최소 마크업. 학습 문구에 강조를 넣기 위한 것이다. */
export function rich(text) {
  const span = document.createElement('span');
  const escaped = String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  span.innerHTML = escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  return span;
}

export function stars(n, total = 3) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, total - n));
}

export function button(label, onClick, opts = {}) {
  return el('button', {
    class: `btn ${opts.variant ? `btn-${opts.variant}` : ''} ${opts.class || ''}`.trim(),
    onclick: onClick,
    disabled: opts.disabled,
    type: 'button',
    title: opts.title,
  }, label);
}

export function card(...children) {
  return el('div', { class: 'card' }, ...children);
}

export function toast(message, kind = 'info') {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = el('div', { class: 'toasts' });
    document.body.appendChild(host);
  }
  const t = el('div', { class: `toast toast-${kind}` }, rich(message));
  host.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3200);
}

/** 확인 대화상자. 되돌리기 어려운 동작 전에 쓴다. */
export function confirmDialog(title, message, onConfirm, confirmLabel = '확인') {
  const back = el('div', { class: 'modal-back' });
  const close = () => back.remove();
  const box = el('div', { class: 'modal' },
    el('h3', { text: title }),
    el('p', {}, rich(message)),
    el('div', { class: 'row end' },
      button('취소', close, { variant: 'ghost' }),
      button(confirmLabel, () => { close(); onConfirm(); }, { variant: 'primary' }),
    ),
  );
  back.appendChild(box);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.appendChild(back);
  return close;
}

export function progressBar(ratio, label) {
  return el('div', { class: 'progress' },
    el('div', { class: 'progress-fill', style: { width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` } }),
    label ? el('span', { class: 'progress-label', text: label }) : null,
  );
}

export function badge(text, kind = '') {
  return el('span', { class: `badge ${kind}`.trim(), text });
}

export function section(title, ...children) {
  return el('section', { class: 'section' }, title ? el('h2', { text: title }) : null, ...children);
}
