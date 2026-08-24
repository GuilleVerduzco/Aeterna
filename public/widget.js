(function () {
  "use strict";

  var CATEGORY_LABELS = {
    performance: "Rendimiento",
    seo: "SEO técnico",
    accessibility: "Accesibilidad",
    design: "Diseño / UX",
    code_security: "Código y seguridad",
  };
  var CATEGORY_ORDER = ["performance", "seo", "accessibility", "design", "code_security"];

  function currentScriptApiBase() {
    var script = document.currentScript;
    if (script && script.dataset && script.dataset.apiBase) return script.dataset.apiBase;
    return null;
  }

  function resolveConfig() {
    var globalConfig = window.AETERNA_AUDIT_CONFIG || {};
    // Si widget.js se sirve desde la misma API (ej. la página de demo en /public/audit.html),
    // usamos ese mismo origen por defecto. Si se incrusta en OTRO sitio, define apiBase explícitamente.
    var scriptOrigin = currentScriptApiBase();
    var apiBase = globalConfig.apiBase || scriptOrigin || window.location.origin;
    return {
      apiBase: (apiBase || "").replace(/\/$/, ""),
      containerId: globalConfig.containerId || "aeterna-audit-widget",
    };
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function buildWidgetMarkup(root) {
    root.classList.add("ae-audit");
    root.innerHTML =
      '<div class="ae-audit__eyebrow">MICROSERVICIOS IA</div>' +
      '<h3 class="ae-audit__title">Auditoría gratuita de tu sitio<span class="ae-dot">.</span></h3>' +
      '<p class="ae-audit__subtitle">Ingresa la URL de tu sitio y obtén, en vivo, un análisis real de rendimiento, SEO, accesibilidad, diseño/UX y código/seguridad.</p>' +
      '<form class="ae-audit__form" novalidate>' +
      '  <input class="ae-audit__input" type="text" inputmode="url" placeholder="https://tu-sitio.com" required />' +
      '  <button class="ae-audit__submit" type="submit">Analizar sitio</button>' +
      "</form>" +
      '<div class="ae-audit__error"></div>' +
      '<div class="ae-audit__status"></div>' +
      '<div class="ae-audit__progress"></div>' +
      '<div class="ae-audit__result">' +
      '  <div class="ae-audit__score">--</div>' +
      '  <div class="ae-audit__score-label">Score general</div>' +
      '  <p class="ae-audit__findings-summary"></p>' +
      '  <div class="ae-audit__actions"></div>' +
      "</div>" +
      '<div class="ae-audit__footer">Powered by <a href="https://www.c4b.mx" target="_blank" rel="noopener">Æterna</a> · <a href="https://wa.me/528114750015" target="_blank" rel="noopener">Hablar con nosotros</a></div>';
  }

  function AuditWidget(root, config) {
    this.root = root;
    this.config = config;
    buildWidgetMarkup(root);

    this.form = root.querySelector(".ae-audit__form");
    this.input = root.querySelector(".ae-audit__input");
    this.submitBtn = root.querySelector(".ae-audit__submit");
    this.errorBox = root.querySelector(".ae-audit__error");
    this.statusBox = root.querySelector(".ae-audit__status");
    this.progressBox = root.querySelector(".ae-audit__progress");
    this.resultBox = root.querySelector(".ae-audit__result");
    this.scoreEl = root.querySelector(".ae-audit__score");
    this.findingsSummaryEl = root.querySelector(".ae-audit__findings-summary");
    this.actionsEl = root.querySelector(".ae-audit__actions");

    this.eventSource = null;
    this.rows = {};

    this.form.addEventListener("submit", this.onSubmit.bind(this));
  }

  AuditWidget.prototype.showError = function (message) {
    this.errorBox.textContent = message;
    this.errorBox.classList.add("is-visible");
  };

  AuditWidget.prototype.clearError = function () {
    this.errorBox.textContent = "";
    this.errorBox.classList.remove("is-visible");
  };

  AuditWidget.prototype.setStatus = function (message) {
    this.statusBox.textContent = message;
    this.statusBox.classList.add("is-visible");
  };

  AuditWidget.prototype.resetProgress = function () {
    this.progressBox.innerHTML = "";
    this.progressBox.classList.add("is-visible");
    this.rows = {};
    var self = this;
    CATEGORY_ORDER.forEach(function (cat) {
      var row = el("div", "ae-audit__row");
      row.dataset.category = cat;
      row.innerHTML =
        '<span class="ae-audit__row-label"><span class="ae-audit__spinner"></span> ' +
        CATEGORY_LABELS[cat] +
        "</span>" +
        '<span class="ae-audit__row-score"></span>';
      self.progressBox.appendChild(row);
      self.rows[cat] = row;
    });
  };

  AuditWidget.prototype.markCategoryDone = function (category, score, findingsCount) {
    var row = this.rows[category];
    if (!row) return;
    row.classList.add("is-done");
    row.querySelector(".ae-audit__spinner").outerHTML = "✓";
    row.querySelector(".ae-audit__row-score").textContent = score + " · " + findingsCount + (findingsCount === 1 ? " hallazgo" : " hallazgos");
  };

  AuditWidget.prototype.markCategoryFailed = function (category) {
    var row = this.rows[category];
    if (!row) return;
    row.classList.add("is-failed");
    row.querySelector(".ae-audit__spinner").outerHTML = "✕";
    row.querySelector(".ae-audit__row-score").textContent = "no disponible";
  };

  AuditWidget.prototype.showResult = function (result) {
    this.resultBox.classList.add("is-visible");
    this.scoreEl.textContent = result.overallScore;
    this.scoreEl.style.color = result.overallScore >= 85 ? "#8fc9a0" : result.overallScore >= 60 ? "#c9a96e" : "#e08585";

    var totalFindings = result.categories.reduce(function (sum, c) {
      return sum + c.findings.length;
    }, 0);
    var critical = result.categories.reduce(function (sum, c) {
      return sum + c.findings.filter(function (f) {
        return f.severity === "critical";
      }).length;
    }, 0);
    this.findingsSummaryEl.textContent =
      totalFindings + " hallazgo(s) en total" + (critical > 0 ? " · " + critical + " crítico(s)" : "");

    var apiBase = this.config.apiBase;
    this.actionsEl.innerHTML =
      '<a class="ae-audit__btn ae-audit__btn--primary" target="_blank" rel="noopener" href="' +
      apiBase +
      "/api/v1/analyses/" +
      result.id +
      '/report.html">Ver reporte completo</a>' +
      '<a class="ae-audit__btn ae-audit__btn--secondary" target="_blank" rel="noopener" href="' +
      apiBase +
      "/api/v1/analyses/" +
      result.id +
      '/report.pdf">Descargar PDF</a>';
  };

  AuditWidget.prototype.reset = function () {
    this.clearError();
    this.statusBox.classList.remove("is-visible");
    this.progressBox.classList.remove("is-visible");
    this.resultBox.classList.remove("is-visible");
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  };

  AuditWidget.prototype.onSubmit = function (evt) {
    evt.preventDefault();
    var url = this.input.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    this.reset();
    this.submitBtn.disabled = true;
    this.setStatus("Enviando " + url + " a análisis...");

    var self = this;
    fetch(this.config.apiBase + "/api/v1/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url, screenshots: true, maxLinksChecked: 15 }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.message || body.error || "No se pudo iniciar el análisis.");
          return body;
        });
      })
      .then(function (job) {
        self.setStatus("Cargando el sitio y ejecutando el análisis en vivo...");
        self.resetProgress();
        self.listen(job.id);
      })
      .catch(function (err) {
        self.submitBtn.disabled = false;
        self.showError(err.message || "Ocurrió un error al iniciar el análisis.");
      });
  };

  AuditWidget.prototype.listen = function (jobId) {
    var self = this;
    var es = new EventSource(this.config.apiBase + "/api/v1/analyses/" + jobId + "/events");
    this.eventSource = es;

    es.addEventListener("crawl_completed", function () {
      self.setStatus("Sitio cargado. Analizando cada categoría...");
    });

    es.addEventListener("category_completed", function (evt) {
      var data = JSON.parse(evt.data);
      var result = data.result;
      self.markCategoryDone(result.category, result.score, result.findings.length);
    });

    es.addEventListener("category_failed", function (evt) {
      var data = JSON.parse(evt.data);
      self.markCategoryFailed(data.category);
    });

    es.addEventListener("job_completed", function (evt) {
      var data = JSON.parse(evt.data);
      self.setStatus("Análisis completado.");
      self.showResult(data.result);
      self.submitBtn.disabled = false;
      es.close();
    });

    es.addEventListener("job_failed", function (evt) {
      var data = JSON.parse(evt.data);
      self.showError("El análisis falló: " + (data.error || "error desconocido") + ". Intenta de nuevo.");
      self.submitBtn.disabled = false;
      es.close();
    });

    es.onerror = function () {
      // EventSource reintenta solo; si el job ya no existe (expiró) esto puede repetirse indefinidamente,
      // así que además dejamos habilitado el botón para que el usuario pueda reintentar manualmente.
      self.submitBtn.disabled = false;
    };
  };

  function pollJobResult(apiBase, jobId) {
    return new Promise(function (resolve, reject) {
      var attempts = 0;
      var maxAttempts = 60; // ~2 min a intervalos de 2s
      var interval = setInterval(function () {
        attempts++;
        fetch(apiBase + "/api/v1/analyses/" + jobId)
          .then(function (res) {
            return res.json();
          })
          .then(function (job) {
            if (job.status === "completed") {
              clearInterval(interval);
              resolve(job.result);
            } else if (job.status === "failed") {
              clearInterval(interval);
              reject(new Error(job.error || "El análisis falló."));
            } else if (attempts >= maxAttempts) {
              clearInterval(interval);
              reject(new Error("Tiempo de espera agotado esperando el análisis."));
            }
          })
          .catch(function (err) {
            clearInterval(interval);
            reject(err);
          });
      }, 2000);
    });
  }

  // WebMCP (https://webmachinelearning.github.io/webmcp/): expone la auditoría de sitios como una
  // tool que un agente corriendo en el navegador del visitante puede invocar directamente.
  function registerWebMcpTools(config) {
    if (!navigator.modelContext || typeof navigator.modelContext.provideContext !== "function") return;
    navigator.modelContext.provideContext({
      tools: [
        {
          name: "audit_website",
          description:
            "Ejecuta una auditoría real de un sitio web (rendimiento, SEO, accesibilidad, diseño/UX y código/seguridad) con la API de Æterna y devuelve el score general y los hallazgos por categoría.",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL absoluta del sitio a auditar, ej. https://ejemplo.com" },
              categories: {
                type: "array",
                items: { type: "string", enum: CATEGORY_ORDER },
                description: "Subconjunto de categorías a analizar. Por defecto, todas.",
              },
            },
            required: ["url"],
          },
          execute: function (args) {
            return fetch(config.apiBase + "/api/v1/analyses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: args.url, categories: args.categories, screenshots: false }),
            })
              .then(function (res) {
                return res.json().then(function (body) {
                  if (!res.ok) throw new Error(body.message || body.error || "No se pudo iniciar el análisis.");
                  return body;
                });
              })
              .then(function (job) {
                return pollJobResult(config.apiBase, job.id);
              });
          },
        },
      ],
    });
  }

  function init() {
    var config = resolveConfig();
    if (!config.apiBase) return;
    registerWebMcpTools(config);
    var root = document.getElementById(config.containerId);
    if (!root) {
      console.error('[Æterna Audit Widget] No se encontró el contenedor #' + config.containerId + ".");
      return;
    }
    new AuditWidget(root, config);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
