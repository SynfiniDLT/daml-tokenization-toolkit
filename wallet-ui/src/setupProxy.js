const { createProxyMiddleware } = require("http-proxy-middleware");

const damlHttpJsonDevUrl =
  process.env.REACT_APP_DAML_HTTP_JSON ? process.env.REACT_APP_DAML_HTTP_JSON : "http://127.0.0.1:7575";
const walletViewsHttpJsonDevUrl =
  process.env.REACT_APP_WALLET_VIEWS_HTTP_JSON ? process.env.REACT_APP_WALLET_VIEWS_HTTP_JSON : "http://127.0.0.1:8080";

/**
 * @return {Boolean}
 */
const filter = function(expectedPath, target) {
  return function (pathname, req) {
    // Proxy requests to the http json api when in development
    const proxied = pathname.match(expectedPath) && process.env.NODE_ENV === "development";

    if (proxied) {
      console.log(
        `Request with path ${pathname} proxied from host ${req.headers.host} to host ${target}`
      );
    }

    return proxied;
  };
}

module.exports = function (app) {
  app.use(
    createProxyMiddleware(
      filter("^/wallet-views", walletViewsHttpJsonDevUrl),
      {
        target: walletViewsHttpJsonDevUrl
      }
    )
  );
  app.use(
    createProxyMiddleware(
      filter("^/v1", damlHttpJsonDevUrl),
      {
        target: damlHttpJsonDevUrl,
        ws: true, //Proxy websockets
      }
    )
  );
};

