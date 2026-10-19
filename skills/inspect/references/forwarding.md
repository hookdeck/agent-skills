# Forwarding requests

Inspect can pass each request a Source receives on to a server, and shows the server's response on the Source's page.

## To a server on this machine

Use the [Hookdeck CLI](https://hookdeck.com/docs/cli)'s `listen` command, run as `npx hookdeck-cli listen …`.

- **A Source you created:** run the `cmd_hint` from the `POST /` reply as given, replacing `[port]` with the local server's port (or a full local URL). It has the shape `npx hookdeck-cli listen [port] {source name} --path /webhooks --cli-key …`. Change `--path` to the path the local handler listens on.
- **A Source the user gave you:** there's no `cmd_hint`. Ask the user to copy the command from the Source page's **Forward → Localhost** tab, then run it.

The `listen` command keeps running until it's stopped. Start it in the background or in a separate terminal, and keep making the wait call in the foreground.

`npx hookdeck-cli` needs no install. To install the CLI instead: `brew install hookdeck` on macOS, or `npm install hookdeck-cli -g` anywhere with Node.js ([other options](https://hookdeck.com/docs/cli)), then run the same command as `hookdeck listen …`. The key in `cmd_hint` already gives the CLI access to the Source, so no login is needed.

## To another public URL

To forward to a public HTTPS URL, such as a staging server, ask the user to add it in the Source page's **Forward** tab (HTTP). There's no API call for it. Each new request is then forwarded automatically.

- A Hookdeck or Inspect Source URL can't be a destination: the requests would loop back into Inspect.
- A `localhost` URL belongs in the Localhost tab, with `npx hookdeck-cli listen`, not in HTTP.
