const { dbRequest, pagedDbRequest } = require("../../utility");

class FarmAppHtmlElement extends HTMLElement {
  constructor() {
    super();

    if (!this.hasAttribute("template")) {
      throw Error("No template provided to modal element!");
    }
  }

  init() {
    let shadow = this._initShadow();
    this._inheritLinksandStyles(shadow);
    shadow.appendChild(this._getTemplate());

    return shadow;
  }

  ensureAttributeExists(attribute) {
    if (!this.hasAttribute(attribute)) {
      throw Error(`No '${attribute}' attribute on ${this.tagName} element!`);
    } else {
      return this.getAttribute(attribute);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.info(
      this.tagName,
      ": Modal attribute has changed:",
      name,
      oldValue,
      "-",
      newValue
    );
  }

  async pagedDbRequest(route, pageNumber) {
    return pagedDbRequest(route, pageNumber);
  }

  async dbRequest(route, params) {
    return dbRequest(route, params);
  }

  _inheritLinksandStyles(root) {
    for (const node of document.getElementsByTagName("style")) {
      root.appendChild(node.cloneNode(true));
    }

    for (const node of document.getElementsByTagName("link")) {
      root.appendChild(node.cloneNode(true));
    }
  }

  _initShadow() {
    return this.attachShadow({
      mode: "open",
    });
  }

  _getTemplate() {
    let template = document.getElementById(this.getAttribute("template"));
    let templateContent = template.content;
    return templateContent.cloneNode(true);
  }
}

module.exports = { FarmAppHtmlElement };
