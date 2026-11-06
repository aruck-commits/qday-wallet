# Swarm passport

Upload gateway: `https://api.gateway.ethswarm.org/bzz`

The upload endpoint returned reference `33fc453e27911eedfac9e2dee76f306322f440ff520c6058458df8a2a3459b60`, but public GET returned the gateway's Request Approval HTML instead of the 388 passport bytes. The reference was not written to Arkiv because byte equality was not proven.

Read-repair: request approval for the reference through the public gateway, then GET `/bzz/{reference}` and compare the response bytes against the locally generated passport before patching the Arkiv entity's `swarmRef`.
