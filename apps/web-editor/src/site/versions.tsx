export type Product = "vscode" | "obsidian" | "jetbrains" | "codemirror";

/**
 * Through shields.io for all four: the Visual Studio Marketplace's terms allow
 * its API only inside Visual Studio products, the JetBrains Marketplace sends
 * no CORS header, and GitHub's own API allows 60 requests an hour per address.
 */
export const VERSION_SOURCES: Record<Product, { url: string; prefix: string }> =
  {
    vscode: {
      url: "https://img.shields.io/github/v/tag/lavich/domorium.json?filter=vscode-v*&sort=semver",
      prefix: "vscode-v",
    },
    obsidian: {
      url: "https://img.shields.io/github/v/release/lavich/domorium-obsidian.json",
      prefix: "v",
    },
    jetbrains: {
      url: "https://img.shields.io/jetbrains/plugin/v/33323.json",
      prefix: "v",
    },
    codemirror: {
      url: "https://img.shields.io/npm/v/@domorium/codemirror.json",
      prefix: "v",
    },
  };

export const versionsScript = `(function () {
  var sources = ${JSON.stringify(VERSION_SOURCES)};
  var pattern = /^\\d+\\.\\d+\\.\\d+(?:[-+][0-9A-Za-z.-]+)?$/;
  var keyOf = function (product) {
    return "domorium-version:" + product;
  };
  var remembered = function (product) {
    try {
      return sessionStorage.getItem(keyOf(product));
    } catch (error) {
      return null;
    }
  };
  var remember = function (product, version) {
    try {
      sessionStorage.setItem(keyOf(product), version);
    } catch (error) {
      return;
    }
  };
  var show = function (slots, version) {
    for (var i = 0; i < slots.length; i++) {
      slots[i].textContent = "v" + version;
      slots[i].hidden = false;
    }
  };
  var ask = function (source) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var late = false;
    var timer = setTimeout(function () {
      late = true;
      if (controller) {
        controller.abort();
      }
    }, 5000);
    return fetch(source.url, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("status");
        }
        return response.json();
      })
      .then(function (answer) {
        var value = answer && typeof answer.value === "string" ? answer.value : "";
        if (value.indexOf(source.prefix) !== 0) {
          return null;
        }
        var version = value.slice(source.prefix.length);
        return pattern.test(version) ? version : null;
      })
      .catch(function () {
        return null;
      })
      .then(function (version) {
        clearTimeout(timer);
        return late ? null : version;
      });
  };
  var start = function () {
    var found = document.querySelectorAll("[data-version]");
    var slots = {};
    for (var i = 0; i < found.length; i++) {
      var product = found[i].getAttribute("data-version");
      if (Object.prototype.hasOwnProperty.call(sources, product)) {
        (slots[product] = slots[product] || []).push(found[i]);
      }
    }
    Object.keys(slots).forEach(function (product) {
      var known = remembered(product);
      if (known && pattern.test(known)) {
        show(slots[product], known);
        return;
      }
      ask(sources[product]).then(function (version) {
        if (version) {
          remember(product, version);
          show(slots[product], version);
        }
      });
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();`;

export function VersionSlot({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  return (
    <>
      {" "}
      <span data-version={product} hidden className={className} />
    </>
  );
}
