// Vercel Speed Insights
// Official implementation using @vercel/speed-insights v2.0.0

"use strict";

// Initialize queue
var initQueue = function() {
  if (window.si) return;
  window.si = function a() {
    for (var _len = arguments.length, params = new Array(_len), _key = 0; _key < _len; _key++) {
      params[_key] = arguments[_key];
    }
    (window.siq = window.siq || []).push(params);
  };
};

// Package info
var name = "@vercel/speed-insights";
var version = "2.0.0";

// Utility functions
function isBrowser() {
  return typeof window !== "undefined";
}

function detectEnvironment() {
  try {
    var env = process.env.NODE_ENV;
    if (env === "development" || env === "test") {
      return "development";
    }
  } catch (e) {}
  return "production";
}

function isDevelopment() {
  return detectEnvironment() === "development";
}

function computeRoute(pathname, pathParams) {
  if (!pathname || !pathParams) {
    return pathname;
  }
  var result = pathname;
  try {
    var entries = Object.entries(pathParams);
    for (var i = 0; i < entries.length; i++) {
      var _entries$i = entries[i],
        key = _entries$i[0],
        value = _entries$i[1];
      if (!Array.isArray(value)) {
        var matcher = turnValueToRegExp(value);
        if (matcher.test(result)) {
          result = result.replace(matcher, "/[" + key + "]");
        }
      }
    }
    for (var _i = 0; _i < entries.length; _i++) {
      var _entries$_i = entries[_i],
        _key2 = _entries$_i[0],
        _value = _entries$_i[1];
      if (Array.isArray(_value)) {
        var _matcher = turnValueToRegExp(_value.join("/"));
        if (_matcher.test(result)) {
          result = result.replace(_matcher, "/[..." + _key2 + "]");
        }
      }
    }
    return result;
  } catch (e) {
    return pathname;
  }
}

function turnValueToRegExp(value) {
  return new RegExp("/" + escapeRegExp(value) + "(?=[/?#]|$)");
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeAbsolute(url) {
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/") ? url : "/" + url;
}

function getScriptSrc(props) {
  if (props.scriptSrc) {
    return makeAbsolute(props.scriptSrc);
  }
  if (isDevelopment()) {
    return "https://va.vercel-scripts.com/v1/speed-insights/script.debug.js";
  }
  if (props.dsn) {
    return "https://va.vercel-scripts.com/v1/speed-insights/script.js";
  }
  if (props.basePath) {
    return makeAbsolute(props.basePath + "/speed-insights/script.js");
  }
  return "/_vercel/speed-insights/script.js";
}

function loadProps(explicitProps, confString) {
  var props = explicitProps;
  if (confString) {
    try {
      var parsed = JSON.parse(confString);
      props = Object.assign({}, parsed && parsed.speedInsights, explicitProps);
    } catch (e) {}
  }
  var dataset = {
    sdkn: name + (props.framework ? "/" + props.framework : ""),
    sdkv: version
  };
  if (props.sampleRate) {
    dataset.sampleRate = props.sampleRate.toString();
  }
  if (props.route) {
    dataset.route = props.route;
  }
  if (isDevelopment() && props.debug === false) {
    dataset.debug = "false";
  }
  if (props.dsn) {
    dataset.dsn = props.dsn;
  }
  if (props.endpoint) {
    dataset.endpoint = makeAbsolute(props.endpoint);
  } else if (props.basePath) {
    dataset.endpoint = makeAbsolute(props.basePath + "/speed-insights/vitals");
  }
  return {
    src: getScriptSrc(props),
    beforeSend: props.beforeSend,
    dataset: dataset
  };
}

// Main function
function injectSpeedInsights(props, confString) {
  props = props || {};
  if (!isBrowser() || props.route === null) return null;
  initQueue();
  var loadedProps = loadProps(props, confString);
  var src = loadedProps.src;
  var beforeSend = loadedProps.beforeSend;
  var dataset = loadedProps.dataset;
  
  if (document.head.querySelector('script[src*="' + src + '"]')) return null;
  
  if (beforeSend) {
    window.si && window.si("beforeSend", beforeSend);
  }
  
  var script = document.createElement("script");
  script.src = src;
  script.defer = true;
  
  var entries = Object.entries(dataset);
  for (var i = 0; i < entries.length; i++) {
    var key = entries[i][0];
    var value = entries[i][1];
    script.dataset[key] = value;
  }
  
  script.onerror = function() {
    console.log("[Vercel Speed Insights] Failed to load script from " + src + ". Please check if any content blockers are enabled and try again.");
  };
  
  document.head.appendChild(script);
  
  return {
    setRoute: function(route) {
      script.dataset.route = route || undefined;
    }
  };
}

// Auto-initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    injectSpeedInsights();
  });
} else {
  injectSpeedInsights();
}

// Export for use in other scripts if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    injectSpeedInsights: injectSpeedInsights,
    computeRoute: computeRoute
  };
}
