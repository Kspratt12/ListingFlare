// A MINIMAL DOM, just enough for the installed react-dom (18.3.1) to mount and update real components in Node.
// Test infrastructure only: there is no jsdom, happy-dom or test renderer in this repo and none is added.
//
// What it is: a tree of nodes with the methods React's DOM host calls (create, append, insert, remove, attributes, style,
// text, listeners, focus). What it is NOT: a browser. It has no layout, no CSS, no real events, no focus rules, no
// scheduling, no network. Anything that depends on those is unverified by tests that use it.
//
// installMiniDom() must run BEFORE react-dom/client is required (react-dom checks for a DOM when it loads).

type Listener = (e: MEvent) => void;

export class MEvent {
  defaultPrevented = false;
  propagationStopped = false;
  currentTarget: MNode | null = null;
  constructor(public type: string, public target: MNode | null = null, public bubbles = true) {}
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.propagationStopped = true; }
}

// The node and its ancestors, nearest first.
function ancestorsOf(node: { parentNode: unknown }): MNode[] {
  const path: MNode[] = [];
  for (let n = node as MNode | null; n; n = n.parentNode) path.push(n);
  return path;
}

class MNode {
  nodeType = 1;
  nodeName = "";
  parentNode: MNode | null = null;
  childNodes: MNode[] = [];
  ownerDocument!: MDocument;
  private listeners = new Map<string, { fn: Listener; capture: boolean }[]>();
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] ?? null; }
  get nextSibling(): MNode | null { const p = this.parentNode; if (!p) return null; return p.childNodes[p.childNodes.indexOf(this) + 1] ?? null; }
  get previousSibling(): MNode | null { const p = this.parentNode; if (!p) return null; return p.childNodes[p.childNodes.indexOf(this) - 1] ?? null; }
  appendChild<T extends MNode>(c: T): T {
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this;
    this.childNodes.push(c);
    return c;
  }
  insertBefore<T extends MNode>(c: T, ref: MNode | null): T {
    if (!ref) return this.appendChild(c);
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this;
    this.childNodes.splice(this.childNodes.indexOf(ref), 0, c);
    return c;
  }
  removeChild<T extends MNode>(c: T): T {
    const i = this.childNodes.indexOf(c);
    if (i >= 0) this.childNodes.splice(i, 1);
    c.parentNode = null;
    return c;
  }
  contains(o: MNode | null): boolean { while (o) { if (o === this) return true; o = o.parentNode; } return false; }
  get textContent(): string { return this.childNodes.map((c) => c.textContent).join(""); }
  set textContent(v: string) {
    this.childNodes.forEach((c) => { c.parentNode = null; });
    this.childNodes = [];
    if (v) this.appendChild(this.ownerDocument.createTextNode(v));
  }
  addEventListener(type: string, fn: Listener, opts?: boolean | { capture?: boolean }) {
    const capture = typeof opts === "boolean" ? opts : !!opts?.capture;
    const list = this.listeners.get(type) ?? [];
    list.push({ fn, capture });
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, fn: Listener, opts?: boolean | { capture?: boolean }) {
    const capture = typeof opts === "boolean" ? opts : !!opts?.capture;
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(type, list.filter((l) => !(l.fn === fn && l.capture === capture)));
  }
  dispatchEvent(e: MEvent) {
    e.target = e.target ?? this;
    const path = ancestorsOf(this);
    const fire = (n: MNode, capture: boolean) => {
      e.currentTarget = n;
      for (const l of [...(n.listeners.get(e.type) ?? [])]) if (l.capture === capture) l.fn(e);
    };
    for (let i = path.length - 1; i >= 0 && !e.propagationStopped; i--) fire(path[i], true);
    for (let i = 0; i < path.length && !e.propagationStopped; i++) { fire(path[i], false); if (!e.bubbles) break; }
    return !e.defaultPrevented;
  }
}

class MText extends MNode {
  nodeType = 3;
  nodeName = "#text";
  constructor(public data: string) { super(); }
  get nodeValue() { return this.data; }
  set nodeValue(v: string) { this.data = v; }
  get textContent() { return this.data; }
  set textContent(v: string) { this.data = v; }
}

class MComment extends MNode {
  nodeType = 8;
  nodeName = "#comment";
  constructor(public data: string) { super(); }
  get textContent() { return ""; }
}

export class MElement extends MNode {
  nodeType = 1;
  namespaceURI = "http://www.w3.org/1999/xhtml";
  private attrs = new Map<string, string>();
  style: Record<string, unknown> & { setProperty: (k: string, v: string) => void; removeProperty: (k: string) => void } = {
    setProperty(k: string, v: string) { (this as Record<string, unknown>)[k] = v; },
    removeProperty(k: string) { delete (this as Record<string, unknown>)[k]; },
  };
  value = "";
  checked = false;
  selected = false;
  defaultSelected = false;
  multiple = false;
  get options(): MElement[] { return this.find((e) => e.tagName === "option"); }
  get selectedIndex() { return -1; }
  set selectedIndex(_v: number) { /* not tracked */ }
  constructor(public tagName: string) { super(); this.nodeName = tagName.toUpperCase(); }
  setAttribute(k: string, v: unknown) { this.attrs.set(k, String(v)); }
  getAttribute(k: string) { return this.attrs.has(k) ? (this.attrs.get(k) as string) : null; }
  removeAttribute(k: string) { this.attrs.delete(k); }
  hasAttribute(k: string) { return this.attrs.has(k); }
  setAttributeNS(_ns: string | null, k: string, v: unknown) { this.setAttribute(k, v); }
  removeAttributeNS(_ns: string | null, k: string) { this.removeAttribute(k); }
  get className() { return this.getAttribute("class") ?? ""; }
  set className(v: string) { this.setAttribute("class", v); }
  get id() { return this.getAttribute("id") ?? ""; }
  focus() { this.ownerDocument.activeElement = this; }
  blur() { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body; }
  // Elements in the tree matching a predicate (used by tests to find buttons, links, text).
  find(pred: (el: MElement) => boolean): MElement[] {
    const out: MElement[] = [];
    const walk = (n: MNode) => { n.childNodes.forEach((c) => { if (c instanceof MElement) { if (pred(c)) out.push(c); walk(c); } }); };
    walk(this);
    return out;
  }
}

export class MDocument extends MNode {
  nodeType = 9;
  nodeName = "#document";
  body!: MElement;
  documentElement!: MElement;
  activeElement!: MElement;
  defaultView: unknown = null;
  constructor() {
    super();
    this.ownerDocument = this;
    this.documentElement = this.createElement("html");
    this.body = this.createElement("body");
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
    this.activeElement = this.body;
  }
  createElement(tag: string) { const e = new MElement(tag); e.ownerDocument = this; return e; }
  createElementNS(ns: string, tag: string) { const e = this.createElement(tag); e.namespaceURI = ns; return e; }
  createTextNode(data: string) { const t = new MText(data); t.ownerDocument = this; return t; }
  createComment(data: string) { const c = new MComment(data); c.ownerDocument = this; return c; }
}

// Installs the globals react-dom and the dashboard code read. Returns the document and a fresh root container.
export function installMiniDom() {
  const g = globalThis as Record<string, unknown>;
  const document = new MDocument();
  const store = new Map<string, string>();
  g.document = document;
  g.window = globalThis;
  document.defaultView = globalThis;
  g.HTMLIFrameElement = class {};
  g.HTMLElement = MElement;
  g.Element = MElement;
  g.Node = MNode;
  g.Text = MText;
  g.Event = MEvent;
  g.KeyboardEvent = MEvent;
  g.localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
  const win = new MNode(); // window-level listeners (the command palette listens for keydown)
  win.ownerDocument = document;
  g.addEventListener = win.addEventListener.bind(win);
  g.removeEventListener = win.removeEventListener.bind(win);
  g.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  return { document, container, dispatchWindowEvent: (e: MEvent) => win.dispatchEvent(e) };
}
