import ReactDOM from "react-dom";
import "semantic-ui-css/semantic.min.css";
import "./styles/styles.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";

import { Auth0ProviderWithNavigate } from "./auth0-provider-with-navigate";

ReactDOM.render(
    <BrowserRouter>
        <Auth0ProviderWithNavigate>
        <App />
        </Auth0ProviderWithNavigate>
</BrowserRouter>

, document.getElementById("root"));