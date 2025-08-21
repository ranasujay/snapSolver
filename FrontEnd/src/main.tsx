import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { Auth0Provider } from "@auth0/auth0-react";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <MantineProvider>
      <Auth0Provider
        domain="dev-ssdi4q6b3ib0xjwp.us.auth0.com"
        clientId="H3jB3JL86vDPYZivpDXEvYlXjOfAz6Ar"
        authorizationParams={{
          redirect_uri: window.location.origin,
        }}
      >
        <App />
        <Toaster position="bottom-center" reverseOrder={false} />
      </Auth0Provider>
    </MantineProvider>
  </BrowserRouter>
);
