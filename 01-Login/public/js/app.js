// The Auth0 client, initialized in configureClient()
let auth0Client = null;

const urlEncodeB64 = input => {
  const b64Chars = {
    "+": "-",
    "/": "_",
    "=": ""
  };
  return input.replace(/[+/=]/g, (m => b64Chars[m]));
};
const bufferToBase64UrlEncoded = input => {
  const ie11SafeInput = new Uint8Array(input);
  return urlEncodeB64(window.btoa(String.fromCharCode(...Array.from(ie11SafeInput))));
};

const createRandomString = () => {
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_~.";
  let random = "";
  const randomValues = Array.from(window.crypto.getRandomValues(new Uint8Array(43)));
  randomValues.forEach((v => random += charset[v % charset.length]));
  return random;
};

const sha256 = async (s) => {
  return window.crypto.subtle.digest({
    name: "SHA-256"
  }, (new TextEncoder).encode(s));
};

const connectAccount = async () => {
  // Get My Account access token with MRRT
  const at = await auth0Client.getTokenSilently({ authorizationParams: { audience: 'https://adam.local.dev.auth0.com/me/', scope: 'create:me:connected_accounts' }});

  const connection = "oidc-idp";
  const state = btoa(createRandomString());
  const code_verifier = createRandomString();
  const code_challengeBuffer = await sha256(code_verifier);
  const code_challenge = bufferToBase64UrlEncoded(code_challengeBuffer);

  // Call My Account API to create a connected account
  const res = await fetch("https://adam.local.dev.auth0.com/me/v1/connected-accounts/connect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${at}`
    },
    body: JSON.stringify({
      connection,
      redirect_uri: "http://localhost:3000",
      state: state,
      code_challenge,
      code_challenge_method: "S256",
      authorization_params: {
        scope: "openid profile email read:foo offline_access",
        audience: "urn:api",
        prompt: "consent"
      }
    })
  });
  const { connect_uri, connect_params, auth_session } = await res.json();
  if (connect_uri) {
    auth0Client.transactionManager.create({
      state,
      code_verifier,
      auth_session
    });

    window.location.href = `${connect_uri}?ticket=${connect_params.ticket}`;
  }
}

const connectAccountCallback = async () => {
  const at = await auth0Client.getTokenSilently({ authorizationParams: { audience: 'https://adam.local.dev.auth0.com/me/', scope: 'create:me:connected_accounts' }});
  // const result = await auth0Client.handleRedirectCallback();
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get("connect_code");
  const tx = auth0Client.transactionManager.get();

  showContentFromUrl('/profile');
  window.history.pushState({ url: '/profile' }, {}, '/profile');
  // TODO validate state

  const res = await fetch("https://adam.local.dev.auth0.com/me/v1/connected-accounts/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${at}`
    },
    body: JSON.stringify({
      "auth_session": tx.auth_session,
      "connect_code": code,
      "redirect_uri": "http://localhost:3000",
      "code_verifier": tx.code_verifier,
    })
  });

  auth0Client.transactionManager.remove();
  if (res.ok) {
    document.getElementById('connect-account').setAttribute('disabled', 'disaabled');
    document.getElementById('connect-account').innerText = 'Connected!';
    const data = await res.json();
    document.getElementById("profile-data").innerText = JSON.stringify(data, null, 2);
  }

};

/**
 * Starts the authentication flow
 */
const login = async (targetUrl) => {
  try {
    console.log("Logging in", targetUrl);

    const options = {
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    };

    if (targetUrl) {
      options.appState = { targetUrl };
    }

    await auth0Client.loginWithRedirect(options);
  } catch (err) {
    console.log("Log in failed", err);
  }
};

/**
 * Executes the logout flow
 */
const logout = async () => {
  try {
    console.log("Logging out");
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  } catch (err) {
    console.log("Log out failed", err);
  }
};

/**
 * Retrieves the auth configuration from the server
 */
const fetchAuthConfig = () => fetch("/auth_config.json");

/**
 * Initializes the Auth0 client
 */
const configureClient = async () => {
  const response = await fetchAuthConfig();
  const config = await response.json();

  auth0Client = await auth0.createAuth0Client({
    domain: config.domain,
    clientId: config.clientId,
    useRefreshTokens: true,
    useMrrt: true,
    cacheLocation: "localstorage"
  });
};

/**
 * Checks to see if the user is authenticated. If so, `fn` is executed. Otherwise, the user
 * is prompted to log in
 * @param {*} fn The function to execute if the user is logged in
 */
const requireAuth = async (fn, targetUrl) => {
  const isAuthenticated = await auth0Client.isAuthenticated();

  if (isAuthenticated) {
    return fn();
  }

  return login(targetUrl);
};

// Will run when page finishes loading
window.onload = async () => {
  await configureClient();

  // If unable to parse the history hash, default to the root URL
  if (!showContentFromUrl(window.location.pathname)) {
    showContentFromUrl("/");
    window.history.replaceState({ url: "/" }, {}, "/");
  }

  const bodyElement = document.getElementsByTagName("body")[0];

  // Listen out for clicks on any hyperlink that navigates to a #/ URL
  bodyElement.addEventListener("click", (e) => {
    if (isRouteLink(e.target)) {
      const url = e.target.getAttribute("href");

      if (showContentFromUrl(url)) {
        e.preventDefault();
        window.history.pushState({ url }, {}, url);
      }
    }
    if (e.target.id === "connect-account") {
      e.preventDefault();
      connectAccount();
    }
  });

  const query = window.location.search;
  const hasConnectCode = query.includes("connect_code=") && query.includes("state=");

  if (hasConnectCode) {
    await connectAccountCallback();
  }

  const isAuthenticated = await auth0Client.isAuthenticated();

  if (isAuthenticated) {
    console.log("> User is authenticated");
    window.history.replaceState({}, document.title, window.location.pathname);
    updateUI();
    return;
  }

  console.log("> User not authenticated");

  const shouldParseResult = query.includes("code=") && query.includes("state=");

  if (shouldParseResult && !hasConnectCode) {
    console.log("> Parsing redirect");
    try {
      const result = await auth0Client.handleRedirectCallback();

      if (result.appState && result.appState.targetUrl) {
        showContentFromUrl(result.appState.targetUrl);
      }

      console.log("Logged in!");
    } catch (err) {
      console.log("Error parsing redirect:", err);
    }

    window.history.replaceState({}, document.title, "/");
  }

  updateUI();
};
