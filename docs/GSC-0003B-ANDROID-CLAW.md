# GSC-0003B — Android CLAW

`CLAW-ANDROID` is a registered Cortex Local Action Worker hosted by Android
Termux inside the Ubuntu `proot-distro` environment. Its verified checkout is
`/data/data/com.termux/files/home/goldclaw` and its local Cortex root is
`/root/GS-Cortex`.

## Verified capabilities

- Git 2.53.0 with a clean `marzton/goldclaw` checkout
- GitHub CLI authenticated as `marzton`
- Node.js 22.23.2 and npm 10.9.8
- Wrangler and Firebase CLI are installed; provider authorization and write
  authority must still be checked separately for every operation

Never commit or print the device gateway token. An API token exposed during
setup must be revoked before this node is used for provider operations.

## Start locally (loopback only)

```sh
cd /data/data/com.termux/files/home/goldclaw
CORTEX_DEVICE_ID=CLAW-ANDROID npm run cortex:dev
```

The command surface binds to `127.0.0.1` by default. For a non-loopback bind,
the server refuses to start unless `CORTEX_GATEWAY_TOKEN` is present. API
clients must then send `Authorization: Bearer <token>`. This is transport
authentication only; it does not create a Cloudflare Tunnel, Access
application, DNS record, or production deployment.

## External-bind safety contract

```sh
CORTEX_DEVICE_ID=CLAW-ANDROID \
CORTEX_HOST=0.0.0.0 \
CORTEX_GATEWAY_TOKEN='<load from device-only secret storage>' \
npm run cortex:dev
```

Do not put the token in shell history. Load it interactively or from a
device-only file with mode `600`. A Cloudflare Tunnel and Access service-token
policy require a separate exact approval and validation pass before this
gateway is reachable from the cloud Cortex surface.
