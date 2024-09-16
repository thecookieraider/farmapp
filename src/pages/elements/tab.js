const { FarmAppHtmlElement } = require("./farm-app-html-element");

class Tab extends FarmAppHtmlElement {
  constructor() {
    super();

    this.init();

    this.itemsContainer = this.shadowRoot.getElementById("items");
    this.contentContainer = this.shadowRoot.getElementById("content");
    this.subItemTemplate = this.ensureAttributeExists("subitem-template");

    if (this.hasAttribute("show")) {
      this.show = Boolean(this.getAttribute("show"));
    }

    if (this.hasAttribute("header")) {
      this.headerKey = this.getAttribute("header");
    }
  }

  set header(key) {
    this.headerKey = key;
    this._fillTabData(1);
  }

  set show(show) {
    if (show) {
      this.contentContainer.classList.remove("d-none");
    } else {
      this.contentContainer.classList.add("d-none");
    }
  }

  _populatePagination(currentPage) {
    const paginationContainer = this.shadowRoot.getElementById("pagination");

    while (paginationContainer.firstChild)
      paginationContainer.firstChild.remove();

    for (let i = 0; i < this.maxNumberOfPages; i++) {
      const li = document.createElement("li");
      li.classList.add("page-item", "c-hand");

      if (i == currentPage - 1) {
        li.classList.add("active");
      }

      const innerContent = document.createElement("a");
      innerContent.setAttribute("href", "#");
      innerContent.innerText = i + 1;

      li.appendChild(innerContent);

      li.addEventListener("click", (e) => {
        paginationContainer
          .getElementsByClassName("active")[0]
          .classList.remove("active");
        e.currentTarget.classList.add("active");
      });

      li.addEventListener("click", (e) => {
        this._fillTabData(e.currentTarget.firstChild.innerText);
      });

      paginationContainer.appendChild(li);
    }
  }

  _populateTable(data) {
    if (!data || data.length === 0) return;

    const template = document.getElementById(this.subItemTemplate);
    const templateContent = template.content;

    while (this.itemsContainer.firstChild)
      this.itemsContainer.firstChild.remove();

    for (const element of data) {
      const panel = templateContent.cloneNode(true);

      if (this.headerKey)
        panel.getElementById("panel-title").textContent =
          element[this.headerKey];

      for (const key of element) {
        const tileContainer = document.createElement("div");
        tileContainer.classList.add("column", "col-4");

        const tile = document.createElement("div");
        tile.classList.add("tile", "tile-centered", "my-2", "mx-2");

        const tileContent = document.createElement("div");
        tileContent.classList.add("tile-content");

        const tileTitle = document.createElement("div");
        const tileSubtitle = document.createElement("div");

        tileTitle.classList.add("tile-title", "text-bold", "mb-1");
        tileSubtitle.classList.add("tile-subtitle");

        tileTitle.textContent = key;
        tileSubtitle.textContent = element[key] || "N/A";

        tileContent.appendChild(tileTitle);
        tileContent.appendChild(tileSubtitle);
        tile.appendChild(tileContent);
        tileContainer.appendChild(tile);
        panel.getElementById("panel-body").appendChild(tileContainer);
      }

      this.itemsContainer.appendChild(panel);
    }
  }

  async _fillTabData(pageNumber) {
    const route = this.getAttribute("route");
    const results = await this.pagedDbRequest(route, pageNumber);
    this.maxNumberOfPages = results.pages;
    this._populatePagination(pageNumber);
    this._populateTable(results.data);
  }

  set route(_) {
    this._fillTabData(1);
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    this[name] = newValue;
  }

  static get observedAttributes() {
    return ["show", "route", "header"];
  }
}

customElements.define("farmapp-tab", Tab);
